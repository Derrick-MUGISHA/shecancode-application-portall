const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = path.resolve(__dirname, '..')
function load(file, stubs = {}) {
  const filename = path.join(root, file)
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', output)(id => {
    if (id in stubs) return stubs[id]
    if (id.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }
    if (id === 'next/cache') return { revalidateTag() {} }
    if (id.startsWith('@/')) return load(id.slice(2) + '.ts', stubs)
    if (id.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), id)) + '.ts', stubs)
    return require(id)
  }, mod, mod.exports)
  return mod.exports
}
const course = (id, extra = {}) => ({ id, name: id, createdAt: new Date('2026-11-01'), description: null, isOpen: true, capacity: 5, cohorts: [], ...extra })

test('newest records come first, saved order wins, and new records still go on top', () => {
  const { compareProgramOrder, moveProgram } = load('lib/program-order.ts')
  const old = course('old'), recent = course('recent', { createdAt: new Date('2026-11-02') })
  assert.deepEqual([old, recent].sort(compareProgramOrder).map(p => p.id), ['recent', 'old'])
  const saved = [old, recent].map((p, i) => ({ ...p, displayOrder: -new Date('2026-11-03').getTime() + i }))
  assert.deepEqual([...saved, course('new', { createdAt: new Date('2026-11-04') })].sort(compareProgramOrder).map(p => p.id), ['new', 'old', 'recent'])
  assert.deepEqual(moveProgram(saved, 'old', 'recent').map(p => p.id), ['recent', 'old'])
  assert.equal(moveProgram(saved, 'missing', 'old'), saved)
})

test('concurrent program reads share counts, and writes invalidate capacity and availability immediately', async () => {
  let reads = 0, count = 1, open = true
  const prisma = {
    course: { findMany: async () => { reads++; return [course('p', { isOpen: open })] } },
    application: { aggregateRaw: async () => [{ courseId: 'p', cohortId: null, _count: { _all: count } }] },
  }
  const data = load('lib/program-data.ts', { '@/lib/prisma': { __esModule: true, default: prisma } })
  const responses = await Promise.all(Array.from({ length: 12 }, () => data.getPreloadedPrograms()))
  assert.equal(reads, 1)
  assert.ok(responses.every(rows => rows[0].spacesLeft === 4))
  count = 5
  data.invalidatePrograms()
  assert.deepEqual(await data.getPreloadedPrograms(), [])
  assert.equal(reads, 2)
  count = 0; open = false
  data.invalidatePrograms()
  assert.deepEqual(await data.getPreloadedPrograms(), [])
  open = true
  data.invalidatePrograms()
  assert.equal((await data.getPreloadedPrograms())[0].spacesLeft, 5)
})

test('a write during an in-flight read cannot restore a stale program snapshot', async () => {
  let complete, reads = 0
  const prisma = {
    course: { findMany: () => ++reads === 1 ? new Promise(resolve => { complete = resolve }) : Promise.resolve([]) },
    application: { aggregateRaw: async () => [] },
  }
  const data = load('lib/program-data.ts', { '@/lib/prisma': { __esModule: true, default: prisma } })
  const loading = data.getPreloadedPrograms()
  data.invalidatePrograms()
  complete([course('removed')])
  assert.deepEqual(await loading, [])
  assert.deepEqual(await data.getPreloadedPrograms(), [])
  assert.equal(reads, 2)
})

test('expired program snapshots block for fresh data instead of returning stale availability', async () => {
  const originalNow = Date.now
  let now = originalNow(), reads = 0
  Date.now = () => now
  try {
    const prisma = {
      course: { findMany: async () => ++reads === 1 ? [course('p')] : [] },
      application: { aggregateRaw: async () => [] },
    }
    const data = load('lib/program-data.ts', { '@/lib/prisma': { __esModule: true, default: prisma } })
    assert.equal((await data.getPreloadedPrograms()).length, 1)
    now += 2001
    assert.deepEqual(await data.getPreloadedPrograms(), [])
    assert.equal(reads, 2)
  } finally { Date.now = originalNow }
})

test('empty and unavailable program lists render no form, steps, or Continue button before hydration', () => {
  const noop = () => null
  const stubs = {
    'next/navigation': { useRouter: () => ({ prefetch() {} }) },
    './application-skeletons': { ApplicationFormSkeleton: noop, ApplicationProgressSkeleton: noop },
    '@/components/ui/button': { Button: noop }, '@/components/ui/form': { Form: noop },
    '@/components/ui/use-toast': { toast() {} }, '@/components/ui/card': { Card: noop, CardContent: noop },
  }
  for (const name of ['application-review', 'form-sections/course-selection', 'form-sections/personal-information', 'form-sections/disability-information', 'form-sections/contact-information', 'form-sections/family-equipment', 'form-sections/education-occupation', 'form-sections/additional-information']) {
    stubs[name === 'application-review' ? './' + name : '@/components/' + name] = { __esModule: true, default: noop }
  }
  const Form = load('components/application-form.tsx', stubs).default
  for (const initialPrograms of [[], [course('hidden', { isOpen: false })], [course('full', { applicationCount: 5 })], [course('empty', { requiresCohort: true })]]) {
    const html = renderToStaticMarkup(React.createElement(Form, { initialPrograms }))
    assert.match(html, /No programs available/)
    assert.doesNotMatch(html, /<form|Continue|STEP|Application progress|Loading application form/)
  }
})

test('order endpoint requires an admin, rejects missing/duplicate IDs and writes a complete order atomically', async () => {
  const ids = ['a'.repeat(24), 'b'.repeat(24)]
  let authorized = false, transactions = 0, invalidations = 0
  const updates = []
  const prisma = {
    course: { findMany: async () => ids.map(id => ({ id })), update: args => { updates.push(args); return Promise.resolve(args) } },
    cohort: { findMany: async () => ids.map(id => ({ id })), update: args => { updates.push(args); return Promise.resolve(args) } },
    $transaction: async tasks => { transactions++; return Promise.all(tasks) },
  }
  const { PATCH } = load('app/api/courses/order/route.ts', {
    '@/lib/prisma': { __esModule: true, default: prisma }, '@/lib/program-data': { invalidatePrograms: () => invalidations++ },
    '@/lib/verify-document-admin': { canDownloadEducationDocument: async () => authorized },
  })
  const request = body => new Request('http://localhost/api/courses/order', { method: 'PATCH', body: JSON.stringify(body) })
  assert.equal((await PATCH(request({ ids }))).status, 401)
  authorized = true
  assert.equal((await PATCH(request({ ids: [ids[0], ids[0]] }))).status, 400)
  assert.equal((await PATCH(request({ ids: [ids[0]] }))).status, 409)
  assert.equal(transactions, 0)
  assert.equal((await PATCH(request({ ids: [...ids].reverse() }))).status, 200)
  assert.deepEqual(updates.map(update => update.where.id), [...ids].reverse())
  assert.ok(updates[0].data.displayOrder < updates[1].data.displayOrder)
  assert.equal(transactions, 1)
  assert.equal(invalidations, 1)
  assert.equal((await PATCH(request({ ids, courseId: 'c'.repeat(24) }))).status, 200)
  assert.equal(transactions, 2)
})
