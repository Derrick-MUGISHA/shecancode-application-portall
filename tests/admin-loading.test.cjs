const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function load(file, stubs) {
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const mod = { exports: {} }
  const css = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) })
  new Function('require', 'module', 'exports', output)(id => id.endsWith('.css') ? css : id in stubs ? stubs[id] : require(id), mod, mod.exports)
  return mod.exports
}

test('each admin page has visible SSR skeletons before hydration, without private fixtures', async () => {
  const boneyard = await import('boneyard-js/react')
  const { AdminPageContentSkeleton } = load('components/admin/admin-skeletons.tsx', {
    'boneyard-js/react': boneyard, 'next/navigation': { usePathname: () => '/admin/applications' },
  })
  const previousError = console.error
  console.error = (...args) => { if (!String(args[0]).includes('useLayoutEffect does nothing on the server')) previousError(...args) }
  try {
    for (const kind of ['applications', 'programs', 'emails', 'application-details', 'email-details', 'email-form']) {
      const html = renderToStaticMarkup(React.createElement(AdminPageContentSkeleton, { kind }))
      assert.match(html, /role="status"/)
      assert.match(html, /aria-busy="true"/)
      assert.match(html, /position:relative|class="fallback"/)
      assert.match(html, /<i style="left:/, `${kind} must render actual placeholder rectangles on the server`)
      assert.doesNotMatch(html, /@example|mailto:|tel:/)
    }
  } finally { console.error = previousError }
})

test('profile avatars are deterministic and generated locally', async () => {
  const adapter = await import('@blobatar/react')
  const { default: ProfileAvatar } = load('components/admin/profile-avatar.tsx', { '@blobatar/react': adapter })
  const render = id => renderToStaticMarkup(React.createElement(ProfileAvatar, { id }))
  const first = render('applicant-one')
  assert.equal(first, render('applicant-one'))
  assert.notEqual(first, render('applicant-two'))
  assert.match(first, /src="data:image\/svg\+xml,/)
  assert.doesNotMatch(first, /src="https?:/)
})

test('privacy mode replaces identifying avatars with a neutral icon', async () => {
  const adapter = await import('@blobatar/react')
  const { default: ProfileAvatar } = load('components/admin/profile-avatar.tsx', { '@blobatar/react': adapter })
  const first = renderToStaticMarkup(React.createElement(ProfileAvatar, { id: 'applicant-one', hidden: true }))
  const second = renderToStaticMarkup(React.createElement(ProfileAvatar, { id: 'applicant-two', hidden: true }))
  assert.equal(first, second)
  assert.doesNotMatch(first, /<img|data:image/)
  assert.match(first, /aria-hidden="true"/)
})

test('participant skeletons render during entry, draft restoration, program and location loading', async () => {
  const boneyard = await import('boneyard-js/react')
  const components = load('components/application-skeletons.tsx', {
    'boneyard-js/react': boneyard,
    './application-shell': { __esModule: true, default: ({ children, sidebar }) => React.createElement('main', null, sidebar, children) },
  })
  const previousError = console.error
  console.error = (...args) => { if (!String(args[0]).includes('useLayoutEffect does nothing on the server')) previousError(...args) }
  try {
    for (const [name, props] of [
      ['ApplicationEntrySkeleton', {}], ['ApplicationFormSkeleton', {}], ['ApplicationFormSkeleton', { step: 1 }],
      ['ProgramSelectionSkeleton', {}], ['ApplicationFieldSkeleton', { label: 'District' }], ['ApplicationPageSkeleton', {}],
    ]) {
      const html = renderToStaticMarkup(React.createElement(components[name], props))
      assert.match(html, /role="status"/)
      assert.match(html, /aria-busy="true"/)
      assert.match(html, /<i style="left:/, `${name} must show the upcoming layout before hydration`)
      assert.doesNotMatch(html, /Authenticating/)
      assert.doesNotMatch(html, /<input|type="submit"|mailto:|tel:/)
    }
  } finally { console.error = previousError }
})


test('dashboard reload checks show the admin skeleton instead of participant content or login authentication', async () => {
  const boneyard = await import('boneyard-js/react')
  const skeletons = load('components/admin/admin-skeletons.tsx', {
    'boneyard-js/react': boneyard, 'next/navigation': { usePathname: () => '/admin/courses' },
  })
  const { default: Protected } = load('components/AdminProtectedRoute.tsx', {
    './admin/admin-skeletons': skeletons,
    '@/hooks/use-admin-applications': {}, '@/hooks/use-admin-programs': {},
    '@tanstack/react-query': { useQueryClient: () => ({}) },
    'next/navigation': { useRouter: () => ({}), usePathname: () => '/admin/courses' },
    'firebase/auth': { onAuthStateChanged() {} }, '@/lib/firebase': { auth: {} },
  })
  const previousError = console.error
  console.error = (...args) => { if (!String(args[0]).includes('useLayoutEffect does nothing on the server')) previousError(...args) }
  let html
  try { html = renderToStaticMarkup(React.createElement(Protected, null, React.createElement('p', null, 'private workspace'))) }
  finally { console.error = previousError }
  assert.match(html, /<i style="left:/)
  assert.doesNotMatch(html, /private workspace|Authenticating|Application Form/)
})

test('login authentication remains a plain status without logos or skeletons', () => {
  const Screen = load('components/authenticating-screen.tsx', {})
  const Auth = load('components/admin/admin-authenticating.tsx', { '../authenticating-screen': Screen }).default
  const html = renderToStaticMarkup(React.createElement(Auth))
  assert.match(html, /Authenticating…/)
  assert.doesNotMatch(html, /<img|<i style="left:|admin-navigation/)
})

test('login route fallback previews the sign-in form instead of the participant form', () => {
  const LoginLoading = load('app/admin/login/loading.tsx', {}).default
  const html = renderToStaticMarkup(React.createElement(LoginLoading))
  assert.match(html, /Loading administrator sign-in/)
  assert.doesNotMatch(html, /Application Form|admin-navigation|Authenticating/)
})
