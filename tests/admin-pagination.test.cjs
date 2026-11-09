const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { renderToStaticMarkup } = require('react-dom/server')

const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/admin/table-pagination.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText
const mod = { exports: {} }
function Select(props) { return null }
new Function('require', 'module', 'exports', output)(id => {
  if (id.endsWith('.css')) return { default: {} }
  if (id === '@/components/ui/button') return { Button: 'button' }
  if (id === './admin-select') return { __esModule: true, default: Select }
  return require(id)
}, mod, mod.exports)
const Pagination = mod.exports.default
const base = { page: 1, pageSize: 10, total: 32, ariaLabel: 'Test pagination', onPageChange: () => {}, onPageSizeChange: () => {} }
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || !node.props) return []
  return [node, ...elements(node.props.children)]
}
const buttons = tree => elements(tree).filter(element => element.type === 'button')

test('all four navigation buttons use the same page bounds and destinations', () => {
  const pages = []
  const tree = Pagination({ ...base, page: 2, onPageChange: page => pages.push(page) })
  const controls = buttons(tree)
  assert.deepEqual(controls.map(control => control.props['aria-label']), ['First page', 'Previous page', 'Next page', 'Last page'])
  controls.forEach(control => control.props.onClick())
  assert.deepEqual(pages, [1, 1, 3, 4])
  assert.deepEqual(buttons(Pagination(base)).map(button => button.props.disabled), [true, true, false, false])
  assert.deepEqual(buttons(Pagination({ ...base, page: 4 })).map(button => button.props.disabled), [false, false, true, true])
})

test('empty and stale pages have valid counters and never offer an out-of-range next page', () => {
  const empty = Pagination({ ...base, page: 9, total: 0 })
  const html = renderToStaticMarkup(empty)
  assert.match(html, /0 of 0 rows/)
  assert.match(html, /Page 1 of 1/)
  assert.ok(buttons(empty).every(button => button.props.disabled))
  const stale = Pagination({ ...base, page: 9, total: 11 })
  assert.match(renderToStaticMarkup(stale), /11–11 of 11 rows/)
  assert.deepEqual(buttons(stale).map(button => button.props.disabled), [false, false, true, true])
})

test('page size options are consistent and preserve an existing custom size', () => {
  const values = []
  const selector = elements(Pagination({ ...base, onPageSizeChange: size => values.push(size) })).find(element => element.type === Select)
  assert.deepEqual(selector.props.options.map(option => option.value), ['10', '25', '50', '100'])
  selector.props.onChange('50')
  assert.deepEqual(values, [50])
  const custom = elements(Pagination({ ...base, pageSize: 20 })).find(element => element.type === Select)
  assert.deepEqual(custom.props.options.map(option => option.value), ['10', '20', '25', '50', '100'])
})

test('separate cohort paginations call only their own state setter', () => {
  const changed = []
  const first = Pagination({ ...base, onPageChange: page => changed.push(['backend', page]) })
  const second = Pagination({ ...base, page: 2, onPageChange: page => changed.push(['frontend', page]) })
  buttons(first)[2].props.onClick()
  buttons(second)[1].props.onClick()
  assert.deepEqual(changed, [['backend', 2], ['frontend', 1]])
})
