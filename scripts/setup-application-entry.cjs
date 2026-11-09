const fs=require('node:fs')
const path=require('node:path')
const {randomBytes}=require('node:crypto')
const file=path.join(__dirname,'..','.env.local')
let content=fs.existsSync(file)?fs.readFileSync(file,'utf8'):''
const settings={APPLICATION_ENTRY_ENCRYPTION_KEY:randomBytes(32).toString('hex'),IGIRE_APPLICATION_ENTRY_SECRET:randomBytes(32).toString('hex'),SHECANCODE_APPLICATION_ENTRY_SECRET:randomBytes(32).toString('hex'),APPLICATION_PORTAL_URL:'http://localhost:3000'}
let added=0
for(const [name,value] of Object.entries(settings)){if(!new RegExp('^'+name+'=', 'm').test(content)){content+='\n'+name+'="'+value+'"\n';added++}}
fs.writeFileSync(file,content,{mode:0o600});fs.chmodSync(file,0o600)
console.log(`Application entry: ${added} missing settings added to .env.local. Existing settings preserved. Keys were not printed.`)

//commenting to deploy
