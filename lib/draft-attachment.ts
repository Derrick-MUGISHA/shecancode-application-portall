const DB_NAME="shecancode-application-drafts"
const STORE="attachments"
const KEY="education-document"
let database:Promise<IDBDatabase>|undefined
let queue:Promise<unknown>=Promise.resolve()
function openDatabase() {
  if(!database) database=new Promise<IDBDatabase>((resolve,reject)=>{
    if(typeof indexedDB==="undefined"){reject(Error("This browser cannot save attachments locally."));return}
    const request=indexedDB.open(DB_NAME,1)
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE)}
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=undefined};resolve(db)}
    request.onerror=()=>{database=undefined;reject(request.error||Error("Unable to open draft storage."))}
    request.onblocked=()=>{database=undefined;reject(Error("Close other application tabs and try saving again."))}
  })
  return database
}
function ordered<T>(operation:()=>Promise<T>):Promise<T> {
  const task=queue.then(operation,operation)
  queue=task.catch(()=>{})
  return task
}
export function saveDraftAttachment(file:File|undefined):Promise<void> {
  return ordered(async()=>{
    const db=await openDatabase()
    return new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite")
      if(file)tx.objectStore(STORE).put({data:file,name:file.name,type:file.type,lastModified:file.lastModified},KEY)
      else tx.objectStore(STORE).delete(KEY)
      tx.oncomplete=()=>resolve()
      tx.onerror=()=>reject(tx.error||Error("Attachment could not be saved on this device."))
      tx.onabort=()=>reject(tx.error||Error("Attachment save was interrupted."))
    })
  })
}
export function loadDraftAttachment():Promise<File|undefined> {
  return ordered(async()=>{
    const db=await openDatabase()
    return new Promise<File|undefined>((resolve,reject)=>{
      const tx=db.transaction(STORE,"readonly")
      const request=tx.objectStore(STORE).get(KEY)
      request.onsuccess=()=>{const value=request.result;resolve(value?.data instanceof Blob?new File([value.data],value.name,{type:value.type,lastModified:value.lastModified}):undefined)}
      request.onerror=()=>reject(request.error||Error("Unable to restore attachment."))
    })
  })
}
