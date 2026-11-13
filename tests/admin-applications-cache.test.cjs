const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { QueryClient } = require('@tanstack/react-query')

function load(file, stubs) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', code)(id => id in stubs ? stubs[id] : require(id), mod, mod.exports)
  return mod.exports
}

function serverFixture() {
  const versions = ['applications', 'course', 'cohort'].map(() => ({ _count: { _all: 2 }, _max: { updatedAt: new Date('2026-11-07T10:00:00Z') } }))
  let reads = 0, aggregates = 0, authorized = true
  const { GET } = load('app/api/admin/applications/route.ts', {
    '@/lib/prisma': { application: { aggregate: async () => { aggregates++; return versions[0] } }, course: { aggregate: async () => versions[1] }, cohort: { aggregate: async () => versions[2] } },
    '@/lib/verify-document-admin': { canDownloadEducationDocument: async () => authorized },
    '@/lib/actions': { fetchApplications: async () => { reads++; return { success: true, applications: [{ id: 'one' }] } } },
  })
  return { GET, versions, reads: () => reads, aggregates: () => aggregates, deny: () => authorized = false }
}
const request = etag => new Request('http://localhost/api/admin/applications', { headers: etag ? { 'If-None-Match': etag } : {} })

test('unchanged versions return 304 without re-reading or serializing applications', async () => {
  const fixture = serverFixture()
  const first = await fixture.GET(request())
  assert.equal(first.status, 200)
  assert.equal(first.headers.get('cache-control'), 'private, no-store')
  assert.deepEqual(await first.json(), { applications: [{ id: 'one' }] })
  const second = await fixture.GET(request(first.headers.get('etag')))
  assert.equal(second.status, 304)
  assert.equal(await second.text(), '')
  assert.equal(fixture.reads(), 1)
})

test('applicant edits, deletions, program edits and cohort edits change the version', async () => {
  for (const index of [0, 1, 2]) {
    const fixture = serverFixture()
    const first = await fixture.GET(request())
    fixture.versions[index]._max.updatedAt = new Date('2026-11-07T11:00:00Z')
    const changed = await fixture.GET(request(first.headers.get('etag')))
    assert.equal(changed.status, 200)
    assert.notEqual(changed.headers.get('etag'), first.headers.get('etag'))
    if (index === 0) {
      fixture.versions[0]._count._all--
      assert.equal((await fixture.GET(request(changed.headers.get('etag')))).status, 200)
    }
  }
})

test('unauthorized requests cannot inspect versions or records', async () => {
  const fixture = serverFixture()
  fixture.deny()
  assert.equal((await fixture.GET(request())).status, 401)
  assert.equal(fixture.reads(), 0)
  assert.equal(fixture.aggregates(), 0)
})

test('navigation reuses cached data; invalidation checks the version and preserves unchanged data', async () => {
  const client = new QueryClient()
  let requests = 0
  const previousFetch = global.fetch
  const snapshot = { applications: [{ id: 'one' }], version: '"v1"' }
  const auth = { currentUser: { uid: 'admin-one', getIdToken: async () => 'test-token' }, authStateReady: async () => {} }
  const api = load('hooks/use-admin-applications.ts', {
    '@/lib/firebase': { auth },
    '@tanstack/react-query': { useQueryClient: () => client, useQuery: options => options },
  })
  global.fetch = async (_url, options) => {
    requests++
    assert.equal(options.headers.Authorization, 'Bearer test-token')
    if (options.headers['If-None-Match']) {
      assert.equal(options.headers['If-None-Match'], snapshot.version)
      return new Response(null, { status: 304 })
    }
    return new Response(JSON.stringify({ applications: snapshot.applications }), { headers: { ETag: snapshot.version } })
  }
  try {
    const options = api.useAdminApplications()
    const first = await client.fetchQuery(options)
    const onReturn = await client.fetchQuery(api.useAdminApplications())
    assert.equal(onReturn, first)
    assert.equal(requests, 1)
    await client.invalidateQueries({ queryKey: api.ADMIN_APPLICATIONS_KEY })
    const checked = await client.fetchQuery(options)
    assert.equal(checked, first)
    assert.equal(requests, 2)
    global.fetch = async () => new Response(JSON.stringify({ applications: [{ id: 'two' }] }), { headers: { ETag: '"v2"' } })
    await client.invalidateQueries({ queryKey: api.ADMIN_APPLICATIONS_KEY })
    assert.equal((await client.fetchQuery(options)).applications[0].id, 'two')
  } finally {
    global.fetch = previousFetch
    client.clear()
  }
})

test('failed refresh keeps cached applications available', async () => {
  const previousFetch = global.fetch
  const auth = { currentUser: { getIdToken: async () => 'test-token' }, authStateReady: async () => {} }
  const { loadApplicationsSnapshot } = load('hooks/use-admin-applications.ts', { '@/lib/firebase': { auth } })
  const snapshot = { applications: [{ id: 'one' }], version: '"v1"' }
  const client = new QueryClient()
  const key = ['admin', 'applications', 'one']
  client.setQueryData(key, snapshot)
  global.fetch = async () => new Response(null, { status: 500 })
  try {
    await assert.rejects(client.fetchQuery({ queryKey: key, queryFn: () => loadApplicationsSnapshot(snapshot), staleTime: 0, retry: false }))
    assert.equal(client.getQueryData(key), snapshot)
  } finally {
    global.fetch = previousFetch
    client.clear()
  }
})

test('prefetch fills the exact applications cache used by the destination page without a second request', async () => {
  const client = new QueryClient()
  const auth = { currentUser: { uid: 'prefetch-admin', getIdToken: async () => 'test-token' }, authStateReady: async () => {} }
  const api = load('hooks/use-admin-applications.ts', {
    '@/lib/firebase': { auth }, '@tanstack/react-query': { useQueryClient: () => client, useQuery: options => options },
  })
  const previousFetch = global.fetch
  let requests = 0
  global.fetch = async () => { requests++; return new Response(JSON.stringify({ applications: [{ id: 'ready-before-navigation' }] })) }
  try {
    await client.prefetchQuery(api.adminApplicationsOptions(client))
    const data = await client.fetchQuery(api.useAdminApplications())
    assert.equal(data.applications[0].id, 'ready-before-navigation')
    assert.equal(requests, 1)
  } finally { global.fetch = previousFetch; client.clear() }
})

test('program prefetch is reused on arrival, and refresh replaces it without clearing cached content', async () => {
  const client = new QueryClient()
  const auth = { currentUser: { uid: 'prefetch-admin' } }
  const { adminProgramsOptions } = load('hooks/use-admin-programs.ts', { '@/lib/firebase': { auth } })
  const previousFetch = global.fetch
  let requests = 0
  global.fetch = async () => { requests++; return new Response(JSON.stringify([{ id: `program-${requests}` }])) }
  try {
    await client.prefetchQuery(adminProgramsOptions())
    assert.equal((await client.fetchQuery(adminProgramsOptions()))[0].id, 'program-1')
    assert.equal(requests, 1)
    await client.fetchQuery({ ...adminProgramsOptions(), staleTime: 0 })
    assert.equal(client.getQueryData(adminProgramsOptions().queryKey)[0].id, 'program-2')
  } finally { global.fetch = previousFetch; client.clear() }
})

test('dashboard query selects only list fields and counts shared cohorts without repeated joins', async () => {
  const selections = {}
  const prisma = {
    application: { findMany: async args => {
      selections.application = args
      return [
        { id: 'one', fullName: 'One', courseId: 'p', cohortId: 'c', status: 'ACCEPTED' },
        { id: 'two', fullName: 'Two', courseId: 'p', cohortId: 'c', status: 'UNDER_REVIEW' },
        { id: 'legacy', fullName: 'Legacy', courseId: null, cohortId: null },
      ]
    } },
    course: { findMany: async args => { selections.course = args; return [{ id: 'p', name: 'Program', isOpen: true }] } },
    cohort: { findMany: async args => { selections.cohort = args; return [{ id: 'c', number: 18, capacity: 2, isOpen: true }] } },
  }
  const { readAdminApplicationRows } = load('lib/admin-application-data.ts', { '@/lib/prisma': { __esModule: true, default: prisma } })
  const rows = await readAdminApplicationRows()
  assert.equal(rows.length, 3)
  assert.equal(rows[0].course.name, 'Program')
  assert.equal(rows[0].cohort._count.applications, 2)
  assert.equal(rows[1].cohort._count.applications, 2)
  assert.equal(rows[2].cohort, null)
  assert.equal(rows[2].course, null)
  assert.ok(!('courseId' in rows[0]))
  for (const select of Object.values(selections)) assert.ok(!select.include)
  for (const field of ['identificationNumber', 'motivation', 'educationDocument', 'dateOfBirth', 'phone', 'academicBackground']) {
    assert.ok(!selections.application.select[field], `list must not load ${field}`)
  }
})

test('initial application read starts while version checks are pending', async () => {
  let release, started = false
  const waitForVersion = new Promise(resolve => { release = resolve })
  const version = { _count: { _all: 1 }, _max: { updatedAt: new Date() } }
  const { GET } = load('app/api/admin/applications/route.ts', {
    '@/lib/prisma': {
      application: { aggregate: () => waitForVersion },
      course: { aggregate: async () => version }, cohort: { aggregate: async () => version },
    },
    '@/lib/verify-document-admin': { canDownloadEducationDocument: async () => true },
    '@/lib/actions': { fetchApplications: async () => { started = true; return { success: true, applications: [] } } },
  })
  const response = GET(request())
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(started, true)
  release(version)
  assert.equal((await response).status, 200)
})

test('full-answer export requires authentication, validates IDs and preserves filtered order', async () => {
  let authorized = false, reads = 0, args
  const first = 'a'.repeat(24), second = 'b'.repeat(24)
  const fullRows = [
    { id: first, identificationNumber: 'private-one', motivation: 'Full motivation', cohort: { number: 18 } },
    { id: second, identificationNumber: 'private-two', motivation: 'Other motivation' },
  ]
  const { POST } = load('app/api/admin/applications/export/route.ts', {
    '@/lib/prisma': { __esModule: true, default: { application: { findMany: async query => { reads++; args = query; return fullRows } } } },
    '@/lib/verify-document-admin': { canDownloadEducationDocument: async () => authorized },
  })
  const exportRequest = ids => new Request('http://localhost/api/admin/applications/export', { method: 'POST', body: JSON.stringify({ ids }) })
  assert.equal((await POST(exportRequest([first]))).status, 401)
  assert.equal(reads, 0)
  authorized = true
  assert.equal((await POST(exportRequest(['invalid']))).status, 400)
  assert.equal((await POST(exportRequest([first, first]))).status, 400)
  const response = await POST(exportRequest([second, first]))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  const { applications } = await response.json()
  assert.deepEqual(applications.map(row => row.id), [second, first])
  assert.equal(applications[1].motivation, 'Full motivation')
  assert.deepEqual(args.where.id.in, [second, first])
  assert.ok(!args.include.educationDocument)
  assert.equal((await POST(exportRequest([first]))).status, 409)
})
