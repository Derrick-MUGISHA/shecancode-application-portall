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
