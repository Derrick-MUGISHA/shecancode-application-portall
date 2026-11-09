// Plain navigation avoids CSP form-action restrictions and opens in the current tab.
export function programEntryHref(slug: string) {
  return '/api/application-entry?program=' + encodeURIComponent(slug)
}
export function rewriteProgramApplyLinks(html: string, slug: string) {
  return html.replace(/<a\b([^>]*?)\bhref=(["'])https:\/\/apply\.shecancodeschool\.org\/(?:apply\/?)?\2([^>]*)>/g,
    (_match, before: string, _quote: string, after: string) =>
      '<a' + before + 'href="' + programEntryHref(slug) + '"' + after.replace(/\s+target=(["'])_blank\1/g, '') + '>')
}
