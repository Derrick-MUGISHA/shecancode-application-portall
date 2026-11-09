export function adminSectionActive(pathname:string,href:string) {
  return pathname===href || (href!=="/" && pathname.startsWith(href+"/"))
}
export function applicationReturnHref(value:string|null|undefined) {
  if(!value || !(value==="/admin/applications" || value.startsWith("/admin/applications?"))) return "/admin/applications"
  return value
}
export function documentPreviewKind(contentType:string) {
  const type=contentType.split(";")[0].trim().toLowerCase()
  return type==="application/pdf"?"pdf":type==="image/jpeg"||type==="image/png"?"image":undefined
}
