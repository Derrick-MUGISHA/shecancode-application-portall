const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")
const crypto = require("node:crypto")
const root = path.resolve(__dirname, "..")

function transactionClient(prisma) {
  return { ...prisma, $transaction: async callback => callback({
    ...prisma, applicationEntry: prisma.applicationEntry || {updateMany:async()=>({count:1})}, course: { ...prisma.course, update: async () => ({}) },
  }) }
}

function load(relative, stubs = {}) {
  let filename = path.join(root, relative)
  if (!fs.existsSync(filename) && filename.endsWith(".ts")) filename = filename.slice(0,-3) + ".tsx"
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const mod = { exports: {} }
  const localRequire = (id) => {
    if (id in stubs) return stubs[id]
    if (id === "@/lib/entry-session") return {readEntrySession:async()=>({id:"e".repeat(24),source:"igire-backend",sourceDomain:"www.igirerwanda.org",sourceUrl:"https://www.igirerwanda.org/programs/advanced-java-backend-development",issuedAt:new Date("2026-11-06T10:00:00Z")})}
    if (id === "next/cache") return { unstable_cache: fn => fn, revalidateTag: () => {} }
    if (id.startsWith("@/")) return load(id.slice(2) + ".ts", stubs)
    if (id.startsWith(".")) return load(path.relative(root, path.resolve(path.dirname(filename), id)) + ".ts", stubs)
    return require(id)
  }
  new Function("require", "module", "exports", output)(localRequire, mod, mod.exports)
  return mod.exports
}

const { formSchema } = load("lib/form-schema.ts")
const { educationDocumentError, matchesDocumentType } = load("lib/education-document.ts")
const pdf = () => new File(["%PDF-1.7\nSample test certificate"], "certificate.pdf", { type: "application/pdf" })
const valid = () => ({
  fullName: "Test Applicant", email: "test@example.com", dateOfBirth: new Date("2000-01-01"),
  gender: "FEMALE", phone: "0780000000", nationality: "Rwanda", refugeeStatus: false,
  identificationNumber: "0012345678901234", hasDisability: false,
  province: "Umujyi wa Kigali", district: "Nyarugenge", sector: "Gitega", cell: "Akabahizi", village: "Gihanga",
  emergencyContactName: "Test Contact", emergencyContactRelation: "Sibling", emergencyContactPhone: "0780000001",
  hasYoungChild: false, hasLaptop: true, currentOccupation: "EMPLOYED_ATTENDING_UNIVERSITY",
  occupationDetails: "Working part-time while studying year two at university.",
  educationBackground: "HIGH_SCHOOL", academicBackground: "Completed high school in 2023.",
  englishProficiency: "INTERMEDIATE", englishSkillConfidence: "READING",
  howDidYouKnow: "WEBSITE", motivation: "I want to develop my programming skills and build a career in technology.",
  courseId: "0123456789abcdef01234567", educationDocument: pdf(),
})

test("separates ongoing studies from completed education and retains identification leading zeros", () => {
  const data = formSchema.parse(valid())
  assert.equal(data.educationBackground, "HIGH_SCHOOL")
  assert.equal(data.currentOccupation, "EMPLOYED_ATTENDING_UNIVERSITY")
  assert.equal(data.identificationNumber, "0012345678901234")
  assert.ok(data.occupationDetails.includes("year two"))
})
test("requires identification and occupation details for both identification types", () => {
  for (const refugeeStatus of [true, false]) {
    const result = formSchema.safeParse({ ...valid(), refugeeStatus, identificationNumber: " ", occupationDetails: "" })
    assert.equal(result.success, false)
    const fields = result.error.issues.map(i => i.path[0])
    assert.ok(fields.includes("identificationNumber"))
    assert.ok(fields.includes("occupationDetails"))
  }
})
test("requires education evidence except for no formal education", () => {
  assert.equal(formSchema.safeParse({ ...valid(), educationDocument: undefined }).success, false)
  assert.equal(formSchema.safeParse({ ...valid(), educationBackground: "NO_FORMAL_EDUCATION", educationDocument: undefined }).success, true)
})
test("rejects empty, oversized and unsupported attachments and checks file signatures", () => {
  assert.ok(educationDocumentError({ name: "file.pdf", type: "application/pdf", size: 0 }))
  assert.ok(educationDocumentError({ name: "file.pdf", type: "application/pdf", size: 2 * 1024 * 1024 + 1 }))
  assert.ok(educationDocumentError({ name: "file.svg", type: "image/svg+xml", size: 100 }))
  assert.ok(educationDocumentError({ name: "file.html", type: "application/pdf", size: 100 }))
  assert.equal(matchesDocumentType(Buffer.from("<html>fake pdf"), "application/pdf"), false)
  assert.equal(matchesDocumentType(Buffer.from("%PDF-1.7"), "application/pdf"), true)
  assert.equal(matchesDocumentType(Buffer.from([137,80,78,71,13,10,26,10]), "image/png"), true)
  assert.equal(matchesDocumentType(Buffer.from([255,216,255]), "image/jpeg"), true)
})
test("multipart submission persists the new fields and attachment atomically", async () => {
  let saved
  const prisma = { application: {
    findUnique: async () => { throw new Error("Redundant preflight lookup") },
    create: async ({data}) => { saved = data; return { id: "test-id", ...data, educationDocument: undefined } },
  }, course: { findUnique: async () => ({ id: valid().courseId }) } }
  const { POST } = load("app/api/applications/route.ts", { "@/lib/prisma": { default: transactionClient(prisma), __esModule: true } })
  const { educationDocument, ...data } = valid()
  const payload = new FormData()
  payload.append("application", JSON.stringify(data))
  payload.append("educationDocument", educationDocument)
  const response = await POST(new Request("http://localhost/api/applications", {method: "POST", body: payload}))
  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { id: "test-id" })
  assert.equal(saved.identificationNumber, data.identificationNumber)
  assert.equal(saved.occupationDetails, data.occupationDetails)
  assert.equal(saved.educationDocumentName, "certificate.pdf")
  assert.ok(Buffer.isBuffer(saved.educationDocument.create.data))
  assert.equal(saved.educationDocument.create.contentType, "application/pdf")
})
test("invalid and spoofed attachments are rejected before accessing the database", async () => {
  const prisma = { application: { findUnique: () => { throw new Error("Database must not be called") } } }
  const { POST } = load("app/api/applications/route.ts", { "@/lib/prisma": { default: transactionClient(prisma), __esModule: true } })
  for (const attachment of [undefined, new File(["not a PDF"], "fake.pdf", {type:"application/pdf"})]) {
    const { educationDocument, ...data } = valid()
    const payload = new FormData()
    payload.append("application", JSON.stringify(data))
    if (attachment) payload.append("educationDocument", attachment)
    assert.equal((await POST(new Request("http://localhost/api/applications", {method:"POST", body:payload}))).status, 400)
  }
})
test("attachment downloads verify administrator token signatures, audience and expiry", async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength:2048 })
  const originalFetch = global.fetch
  const originalProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project"
  global.fetch = async () => new Response(JSON.stringify({ key1: publicKey.export({type:"spki",format:"pem"}) }), {headers: {"cache-control":"max-age=3600"}})
  try {
    const { canDownloadEducationDocument } = load("lib/verify-document-admin.ts")
    const now = Math.floor(Date.now()/1000)
    const base = {aud:"test-project",iss:"https://securetoken.google.com/test-project",sub:"admin",email:"admin@igirerwanda.org",exp:now+3600,iat:now-60,auth_time:now-60}
    const request = (claims, tamper=false) => {
      const header=Buffer.from(JSON.stringify({alg:"RS256",kid:"key1"})).toString("base64url")
      const body=Buffer.from(JSON.stringify(claims)).toString("base64url")
      const signature=crypto.sign("RSA-SHA256",Buffer.from(header+"."+body),privateKey).toString("base64url")
      return new Request("http://localhost", {headers:{Authorization:"Bearer "+header+"."+body+"."+(tamper ? "invalid" : signature)}})
    }
    assert.equal(await canDownloadEducationDocument(request(base)),true)
    assert.equal(await canDownloadEducationDocument(request({...base,exp:now-1})),false)
    assert.equal(await canDownloadEducationDocument(request({...base,aud:"other-project"})),false)
    assert.equal(await canDownloadEducationDocument(request({...base,email:"admin@other.org"})),false)
    assert.equal(await canDownloadEducationDocument(request(base,true)),false)
    assert.equal(await canDownloadEducationDocument(new Request("http://localhost")),false)
  } finally {
    global.fetch=originalFetch
    if (originalProject === undefined) delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    else process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID=originalProject
  }
})

const { APPLICATION_STEPS, applicationStepSchemas, applicationStepForField } = load("lib/application-steps.ts")
test("the four steps cover every application field exactly once", () => {
  const { applicationFieldsSchema } = load("lib/form-schema.ts")
  assert.equal(APPLICATION_STEPS.length, 4)
  const fields = APPLICATION_STEPS.flatMap(step => step.fields)
  assert.equal(new Set(fields).size, fields.length)
  assert.deepEqual([...fields].sort(), Object.keys(applicationFieldsSchema.shape).sort())
})
test("each step validates independently of later unanswered questions", () => {
  assert.equal(applicationStepSchemas[0].safeParse({courseId:valid().courseId}).success,true)
  assert.equal(applicationStepSchemas[0].safeParse({courseId:""}).success,false)
  for (const [index, step] of APPLICATION_STEPS.entries()) {
    const values = valid()
    const partial = Object.fromEntries(step.fields.map(field => [field,values[field]]))
    assert.equal(applicationStepSchemas[index].safeParse(partial).success,true,step.title)
  }
})
test("background attachment checks run before final-step motivation is completed", () => {
  const { motivation, ...answers } = valid()
  const result=applicationStepSchemas[2].safeParse({...answers,educationDocument:undefined})
  assert.equal(result.success,false)
  assert.ok(result.error.issues.some(issue=>issue.path[0]==="educationDocument"))
  assert.equal(applicationStepSchemas[2].safeParse({...answers,educationDocument:undefined,educationBackground:"NO_FORMAL_EDUCATION"}).success,true)
})
test("field errors return applicants to the correct step", () => {
  assert.equal(applicationStepForField("courseId"),0)
  assert.equal(applicationStepForField("identificationNumber"),1)
  assert.equal(applicationStepForField("educationDocument"),2)
  assert.equal(applicationStepForField("motivation"),3)
})
test("closed programs reject applications before saving", async () => {
  const prisma={application:{findUnique:async()=>null,create:()=>{throw Error("must not save")}},course:{findUnique:async()=>({id:valid().courseId,isOpen:false})}}
  const {POST}=load("app/api/applications/route.ts",{"@/lib/prisma":{default:transactionClient(prisma),__esModule:true}})
  const {educationDocument,...data}=valid()
  const body=new FormData()
  body.append("application",JSON.stringify(data))
  body.append("educationDocument",educationDocument)
  const response=await POST(new Request("http://localhost/api/applications",{method:"POST",body}))
  assert.equal(response.status,400)
  assert.ok((await response.json()).errors.courseId)
})
test("open-program listing excludes closed courses and preserves legacy courses", async () => {
  const courses=[{id:"open",isOpen:true},{id:"closed",isOpen:false},{id:"legacy"}].map(course=>({...course,createdAt:new Date(),cohorts:[]}))
  const {GET}=load("app/api/courses/route.ts",{"@/lib/prisma":{default:{course:{findMany:async()=>courses},application:{aggregateRaw:async()=>[]}},__esModule:true}})
  const open=await (await GET(new Request("http://localhost/api/courses?open=true"))).json()
  assert.deepEqual(open.map(course=>course.id),["open","legacy"])
  const all=await (await GET(new Request("http://localhost/api/courses"))).json()
  assert.equal(all.length,3)
})

const { remainingSpaces, acceptingApplications, countdownParts, programClock, kigaliDateTimeInput } = load("lib/program-availability.ts")
test("spaces decrease with each submission and never become negative", () => {
  assert.equal(remainingSpaces({capacity:20,applicationCount:7}),13)
  assert.equal(remainingSpaces({capacity:2,_count:{applications:4}}),0)
  assert.equal(remainingSpaces({}),null)
})
test("full cohorts and exact/past deadlines stop applications", () => {
  const now=Date.parse("2026-12-01T10:00:00Z")
  assert.equal(acceptingApplications({capacity:2,applicationCount:2},now),false)
  assert.equal(acceptingApplications({closesAt:"2026-12-01T10:00:00Z"},now),false)
  assert.equal(acceptingApplications({closesAt:"2026-12-01T10:00:01Z"},now),true)
  assert.equal(acceptingApplications({isOpen:false},now),false)
})
test("countdown is deterministic, clamps at zero and uses server time", () => {
  const now=Date.parse("2026-12-01T10:00:00Z")
  assert.deepEqual(countdownParts(new Date(now+90061000),now),{days:1,hours:1,minutes:1,seconds:1,expired:false})
  assert.deepEqual(countdownParts(new Date(now-1000),now),{days:0,hours:0,minutes:0,seconds:0,expired:true})
  assert.equal(programClock({serverTime:new Date(now).toISOString(),clientReceivedAt:1000},6000),now+5000)
  assert.equal(kigaliDateTimeInput(new Date(now)),"2026-12-01T12:00")
})
test("open cohorts require a number, capacity and future deadline", () => {
  const {cohortSettingsFor}=load("lib/cohorts.ts")
  assert.equal(cohortSettingsFor().safeParse({number:1,isOpen:true,capacity:null,closesAt:null}).success,false)
  assert.equal(cohortSettingsFor().safeParse({number:1,isOpen:false,capacity:null,closesAt:null}).success,true)
  assert.equal(cohortSettingsFor().safeParse({number:12,isOpen:true,capacity:25,closesAt:new Date(Date.now()+86400000).toISOString()}).success,true)
})

test("Rwanda options follow each parent and reject mismatched addresses", () => {
  const {rwandaLocationOptions,validateRwandaAddress}=load("lib/rwanda-locations.ts")
  assert.equal(rwandaLocationOptions("province",{}).length,5)
  assert.ok(rwandaLocationOptions("district",{province:"Kigali"}).some(x=>x.value==="Nyarugenge"))
  assert.ok(rwandaLocationOptions("sector",{province:"Umujyi wa Kigali",district:"Nyarugenge"}).some(x=>x.value==="Gitega"))
  assert.deepEqual(rwandaLocationOptions("village",{}),[])
  assert.equal(validateRwandaAddress(valid()).valid,true)
  assert.equal(validateRwandaAddress({...valid(),district:"Musanze"}).valid,false)
})
test("phone numbers normalize Rwanda and international formats without accepting letters", () => {
  const {normalizePhoneNumber,formatPhoneNumber,isValidPhoneNumber}=load("lib/phone.ts")
  assert.equal(normalizePhoneNumber("0788 123 456"),"+250788123456")
  assert.equal(normalizePhoneNumber("+250 (788) 123-456"),"+250788123456")
  assert.equal(normalizePhoneNumber("250788123456"),"+250788123456")
  assert.equal(normalizePhoneNumber("0044 20 7946 0958"),"+442079460958")
  assert.equal(formatPhoneNumber("0788123456"),"+250 788 123 456")
  assert.equal(isValidPhoneNumber("call 0788123456"),false)
  assert.equal(isValidPhoneNumber("12345"),false)
  assert.equal(formSchema.parse(valid()).phone,"+250780000000")
})
test("submission snapshots the cohort and retries a transaction write conflict", async () => {
  const {createApplicationWithAvailability}=load("lib/create-application.ts")
  let tries=0, writes=0
  const course={id:"course",cohortLabel:"cohort-12",capacity:1,_count:{applications:0},isOpen:true}
  const prisma={$transaction:async callback=>{
    tries++
    if(tries===1) throw {code:"P2034"}
    return callback({
      course:{findUnique:async()=>course,update:async()=>{writes++;return course}},
      application:{create:async({data})=>data},
    })
  }}
  const saved=await createApplicationWithAvailability(prisma,{courseId:"course"})
  assert.equal(saved.cohortLabel,"cohort-12")
  assert.equal(tries,2)
  assert.equal(writes,1)
})
test("a retry sees a newly full cohort and cannot save another application", async () => {
  const {createApplicationWithAvailability}=load("lib/create-application.ts")
  let tries=0,saved=0
  const prisma={$transaction:async callback=>{
    tries++
    if(tries===1) throw {code:"P2034"}
    return callback({
      course:{findUnique:async()=>({id:"course",capacity:1,_count:{applications:1},isOpen:true}),update:async()=>({})},
      application:{create:async()=>{saved++}},
    })
  }}
  await assert.rejects(()=>createApplicationWithAvailability(prisma,{courseId:"course"}),/full/)
  assert.equal(saved,0)
})

test("drafts restore the exact step and strip IDs and binary attachments", () => {
  const {encodeDraft,decodeDraft}=load("lib/application-storage.ts")
  const original=valid()
  const saved=decodeDraft(encodeDraft(original,3))
  assert.equal(saved.step,3)
  assert.equal(saved.values.email,original.email)
  assert.equal("identificationNumber" in saved.values,false)
  assert.equal("educationDocument" in saved.values,false)
  assert.equal(decodeDraft(JSON.stringify({version:2,step:99,values:{email:"test@example.com"}})).step,0)
  assert.equal(decodeDraft(JSON.stringify({email:"legacy@example.com"})).step,0)
})
test("program cache is usable immediately, expires predictably and keeps the server clock", () => {
  const {encodeProgramCache,decodeProgramCache,PROGRAM_CACHE_TTL}=load("lib/application-storage.ts")
  const programs=[{id:"test",name:"Frontend",description:null,serverTime:"2026-11-06T10:00:00Z",clientReceivedAt:1000}]
  const raw=encodeProgramCache(programs,1000)
  assert.equal(decodeProgramCache(raw,1001).fresh,true)
  assert.equal(decodeProgramCache(raw,1000+PROGRAM_CACHE_TTL).fresh,false)
  assert.equal(decodeProgramCache(raw,2000).programs[0].clientReceivedAt,1000)
  assert.equal(decodeProgramCache(JSON.stringify({version:1,savedAt:1,programs:[{}]})),null)
})
test("preloading reuses one cached database result across requests", async () => {
  let reads=0
  const prisma={course:{findMany:async()=>{reads++;return [{id:"p",name:"Frontend",createdAt:new Date(),cohorts:[],description:null,isOpen:true,closesAt:null,capacity:10}]}},application:{aggregateRaw:async()=>[{courseId:"p",cohortId:null,_count:{_all:2}}]}}
  const fakeCache={unstable_cache:fn=>{let cached;return async()=>cached ||= await fn()}}
  const {getPreloadedPrograms}=load("lib/program-data.ts",{"@/lib/prisma":{default:prisma,__esModule:true},"next/cache":fakeCache})
  const first=await getPreloadedPrograms()
  const second=await getPreloadedPrograms()
  assert.equal(reads,1)
  assert.equal(first[0].spacesLeft,8)
  assert.equal(second[0].name,"Frontend")
})
test("Rwanda IDs retain zeros, accept readable grouping and reject non-16-digit values", () => {
  const {identificationNumberError,formatIdentificationNumber}=load("lib/identity-format.ts")
  assert.equal(identificationNumberError("0012 3456 7890 1234","Rwanda",false),null)
  assert.equal(formatIdentificationNumber("1199081234567012","Rwanda",false),"1 1990 8 1234567 0 12")
  assert.equal(formatIdentificationNumber("0012345678901234","Rwanda",false),"0 0123 4 5678901 2 34")
  assert.equal(formatIdentificationNumber("11990","Rwanda",false),"1 1990")
  assert.equal(formatIdentificationNumber("1 1990 8 1234567 0 12","Rwanda",false),"1 1990 8 1234567 0 12")
  assert.equal(formSchema.parse({...valid(),identificationNumber:"1 1990 8 1234567 0 12"}).identificationNumber,"1199081234567012")
  assert.equal(formatIdentificationNumber("REF-001/25","Rwanda",true),"REF-001/25")
  assert.ok(identificationNumberError("12345","Rwanda",false))
  assert.ok(identificationNumberError("123456789012345x","Rwanda",false))
  assert.equal(formSchema.parse({...valid(),identificationNumber:"0012 3456 7890 1234"}).identificationNumber,"0012345678901234")
  assert.equal(identificationNumberError("REF-001/25","Rwanda",true),null)
  assert.equal(identificationNumberError("AB-001234","Kenya",false),null)
})
test("email formatting trims whitespace and normalizes only the domain", () => {
  const parsed=formSchema.parse({...valid(),email:"  Test.Name@EXAMPLE.COM  "})
  assert.equal(parsed.email,"Test.Name@example.com")
  assert.equal(formSchema.safeParse({...valid(),email:"not-an-email"}).success,false)
  assert.equal(formSchema.safeParse({...valid(),dateOfBirth:new Date(Date.now()+86400000)}).success,false)
  assert.equal(formSchema.safeParse({...valid(),phone:"+25012345678"}).success,false)
})
test("browser file validation reads file contents before accepting selection", async () => {
  const {validateEducationFile}=load("lib/education-document.ts")
  assert.equal(await validateEducationFile(pdf()),null)
  assert.ok(await validateEducationFile(new File(["wrong contents"],"certificate.pdf",{type:"application/pdf"})))
  assert.ok(await validateEducationFile(new File([""],"empty.pdf",{type:"application/pdf"})))
})

test("step URLs restore a valid section without allowing invalid step values", () => {
  const {applicationStepFromQuery}=load("lib/application-storage.ts")
  assert.equal(applicationStepFromQuery("2"),1)
  assert.equal(applicationStepFromQuery("4"),3)
  assert.equal(applicationStepFromQuery("99"),0)
  assert.equal(applicationStepFromQuery("2bad"),0)
  assert.equal(applicationStepFromQuery(undefined),0)
})

test("development Prisma cache replaces clients from an older generated schema", async () => {
  const previous = { prisma: global.prisma, version: global.prismaSchemaVersion }
  let disconnected = false
  let created = 0
  class MockClient { constructor() { created++ } async $disconnect() {} }
  const stub = { Prisma: { dmmf: { datamodel: { models: [{ name: "Course", fields: ["submissionLock"] }] } } }, PrismaClient: MockClient }
  try {
    global.prisma = { $disconnect: async () => { disconnected = true } }
    delete global.prismaSchemaVersion
    const first = load("lib/prisma.ts", { "@prisma/client": stub }).prisma
    await Promise.resolve()
    assert.equal(disconnected, true)
    assert.equal(created, 1)
    assert.equal(load("lib/prisma.ts", { "@prisma/client": stub }).prisma, first)
    assert.equal(created, 1)
    stub.Prisma.dmmf.datamodel.models[0].fields.push("cohortLabel")
    assert.notEqual(load("lib/prisma.ts", { "@prisma/client": stub }).prisma, first)
    assert.equal(created, 2)
  } finally {
    if (previous.prisma === undefined) delete global.prisma
    else global.prisma = previous.prisma
    if (previous.version === undefined) delete global.prismaSchemaVersion
    else global.prismaSchemaVersion = previous.version
  }
})

test("development startup regenerates Prisma before starting Next", () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts
  assert.equal(scripts.dev, "prisma generate && next dev")
})


test("duplicate email index failures return a helpful field error without a preflight lookup", async () => {
  const prisma = { application: {
    findUnique: async () => { throw new Error("Redundant preflight lookup") },
    create: async () => { throw Object.assign(new Error("Duplicate email"), { code: "P2002" }) },
  }, course: { findUnique: async () => ({ id: valid().courseId }) } }
  const { POST } = load("app/api/applications/route.ts", { "@/lib/prisma": { default: transactionClient(prisma), __esModule: true } })
  const { educationDocument, ...data } = valid()
  const payload = new FormData()
  payload.append("application", JSON.stringify(data))
  payload.append("educationDocument", educationDocument)
  const response = await POST(new Request("http://localhost/api/applications", { method: "POST", body: payload }))
  assert.equal(response.status, 400)
  assert.ok((await response.json()).errors.email[0].includes("already exists"))
})

test("editing an expired cohort preserves its deadline, while new or reopened cohorts require a future deadline", () => {
  const {cohortSettingsFor}=load("lib/cohorts.ts")
  const now=Date.parse("2026-11-06T12:00:00Z")
  const data={number:1,isOpen:true,capacity:50,closesAt:"2026-11-01T15:00:00Z"}
  assert.equal(cohortSettingsFor(undefined,now).safeParse(data).success,false)
  assert.equal(cohortSettingsFor({isOpen:true,closesAt:data.closesAt},now).safeParse(data).success,true)
  assert.equal(cohortSettingsFor({isOpen:false,closesAt:data.closesAt},now).safeParse(data).success,false)
  assert.equal(cohortSettingsFor({isOpen:true,closesAt:data.closesAt},now).safeParse({...data,closesAt:"2026-11-02T15:00:00Z"}).success,false)
})

test("admin filters combine cohort snapshots, Kigali date boundaries, year, search and status", () => {
  const { filterAdminApplications, DEFAULT_ADMIN_FILTERS, kigaliDay } = load("lib/admin-applications.ts")
  const rows = [
    {id:"a",fullName:"Alice",email:"alice@example.test",status:"UNDER_REVIEW",createdAt:"2025-12-31T22:00:00Z",cohortLabel:"cohort-2",course:{id:"p",name:"Frontend",cohortLabel:"cohort-9"}},
    {id:"b",fullName:"Bob",email:"bob@example.test",status:"ACCEPTED",createdAt:"2026-01-01T22:00:00Z",cohortLabel:"cohort-10",course:{id:"p",name:"Frontend"}},
    {id:"c",fullName:"Cara",email:"cara@example.test",status:"UNDER_REVIEW",createdAt:"2025-12-31T21:59:59Z",course:null},
  ]
  assert.equal(kigaliDay(rows[0].createdAt),"2026-01-01")
  assert.deepEqual(filterAdminApplications(rows,{...DEFAULT_ADMIN_FILTERS,cohort:"cohort-2",year:"2026",from:"2026-01-01",to:"2026-01-01",status:"UNDER_REVIEW",course:"p",search:" ALICE "}).map(row=>row.id),["a"])
  assert.deepEqual(filterAdminApplications(rows,{...DEFAULT_ADMIN_FILTERS,sort:"cohort"}).slice(0,2).map(row=>row.id),["a","b"])
  assert.deepEqual(filterAdminApplications(rows,{...DEFAULT_ADMIN_FILTERS,cohort:"UNASSIGNED"}).map(row=>row.id),["c"])
  assert.deepEqual(filterAdminApplications(rows,{...DEFAULT_ADMIN_FILTERS,sort:"newest"}).map(row=>row.id),["b","a","c"])
  assert.deepEqual(rows.map(row=>row.id),["a","b","c"])
})

test("admin pagination clamps stale pages and exposes only current page rows", () => {
  const { paginateAdminRows } = load("lib/admin-applications.ts")
  const rows = Array.from({length:26},(_,id)=>({id}))
  const result = paginateAdminRows(rows,2,25)
  assert.deepEqual(result.rows,[{id:25}])
  assert.equal(result.start,26)
  assert.equal(result.end,26)
  assert.equal(paginateAdminRows(rows,100,25).page,2)
  assert.equal(paginateAdminRows(rows,-3,25).page,1)
  assert.equal(paginateAdminRows([],5,25).start,0)
  assert.equal(paginateAdminRows([],5,25).page,1)
  assert.equal(paginateAdminRows(rows,1,999999).size,25)
})

test("analytics preserve separate programs with the same name and fill missing months", () => {
  const { summarizeAdminApplications } = load("lib/admin-applications.ts")
  const rows = [
    {id:"a",fullName:"A",email:"a@example.test",status:"ACCEPTED",createdAt:"2026-01-01T12:00:00Z",cohortLabel:"cohort-1",course:{id:"p1",name:"Frontend"}},
    {id:"b",fullName:"B",email:"b@example.test",status:"UNDER_REVIEW",createdAt:"2026-03-01T12:00:00Z",cohortLabel:"cohort-2",course:{id:"p2",name:"Frontend"}},
  ]
  const data = summarizeAdminApplications(rows)
  assert.equal(data.total,2)
  assert.equal(data.accepted,1)
  assert.equal(data.underReview,1)
  assert.equal(Object.keys(data.programs).length,2)
  assert.equal(data.cohorts["cohort-1"],1)
  assert.equal(data.trend.length,12)
  assert.equal(data.trend.find(item=>item.month==="2026-02").count,0)
  assert.equal(data.trend.find(item=>item.month==="2026-03").count,1)
  assert.equal(summarizeAdminApplications([]).trend.length,0)
})



test("course PATCH accepts descriptive edits with an unchanged expired deadline", async () => {
  const existing = {id:valid().courseId,name:"Frontend",description:"Old description",isOpen:true,cohortLabel:"cohort-1",capacity:50,closesAt:new Date("2020-01-01T12:00:00Z")}
  let saved
  const prisma = {course:{findUnique:async()=>existing,update:async({data})=>{saved=data;return {...existing,...data}}},application:{count:async()=>3}}
  const { PATCH } = load("app/api/courses/[id]/route.ts", { "@/lib/prisma": {default:prisma,__esModule:true} })
  const response = await PATCH(new Request("http://localhost/api/courses/course",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({description:"Updated description"})}),{params:Promise.resolve({id:existing.id})})
  assert.equal(response.status,200)
  assert.equal(saved.description,"Updated description")
  assert.equal(saved.closesAt,undefined) // Program edits never modify cohort or legacy deadlines.
})

test("one program can expose several cohorts without duplicating the program", async () => {
  const { availableProgram, selectedAvailability }=load("lib/cohorts.ts")
  const program={id:"p",isOpen:true,requiresCohort:true,cohorts:[
    {id:"c1",number:1,isOpen:true,capacity:1,applicationCount:1},
    {id:"c2",number:2,isOpen:true,capacity:10,applicationCount:2},
  ]}
  assert.equal(availableProgram(program),true)
  assert.equal(selectedAvailability(program,"c2").applicationCount,2)
  assert.equal(availableProgram({...program,isOpen:false}),false)
  assert.equal(availableProgram({...program,cohorts:[]}),false)
  assert.equal(availableProgram({...program,cohorts:[program.cohorts[0]]}),false)
})

test("submission reserves capacity in the selected cohort and snapshots its number", async () => {
  const {createApplicationWithAvailability}=load("lib/create-application.ts")
  let saved,locked
  const tx={course:{findUnique:async()=>({id:"p",isOpen:true,requiresCohort:true,_count:{applications:999,cohorts:2}})},
    cohort:{findUnique:async()=>({id:"c2",courseId:"p",number:2,isOpen:true,capacity:10,_count:{applications:3}}),update:async({where})=>{locked=where.id}},
    application:{create:async({data})=>{saved=data;return{id:"a"}}}}
  const prisma={$transaction:async fn=>fn(tx)}
  await createApplicationWithAvailability(prisma,{courseId:"p",cohortId:"c2"})
  assert.equal(locked,"c2")
  assert.equal(saved.courseId,"p")
  assert.equal(saved.cohortId,"c2")
  assert.equal(saved.cohortLabel,"cohort-2")
})

test("submission rejects missing, unrelated and full cohorts even when other cohorts are open", async () => {
  const {createApplicationWithAvailability,ProgramUnavailableError}=load("lib/create-application.ts")
  let record={id:"c",courseId:"other",number:1,isOpen:true,capacity:10,_count:{applications:0}}
  const tx={course:{findUnique:async()=>({id:"p",isOpen:true,requiresCohort:true,_count:{cohorts:2}})},cohort:{findUnique:async()=>record},application:{create:async()=>{throw Error("Must not save")}}}
  const prisma={$transaction:async fn=>fn(tx)}
  await assert.rejects(()=>createApplicationWithAvailability(prisma,{courseId:"p"}),error=>error instanceof ProgramUnavailableError&&error.field==="cohortId")
  await assert.rejects(()=>createApplicationWithAvailability(prisma,{courseId:"p",cohortId:"c"}),/full or closed/)
  record={...record,courseId:"p",_count:{applications:10}}
  await assert.rejects(()=>createApplicationWithAvailability(prisma,{courseId:"p",cohortId:"c"}),/full or closed/)
})

test("cohort creation keeps the parent program and permits numbering independently per program", async () => {
  const {saveProgramCohort}=load("lib/cohort-admin.ts")
  const saved=[],locks=[]
  const tx={course:{findUnique:async({where})=>({id:where.id}),update:async({where})=>{locks.push(where.id)}},cohort:{create:async({data})=>{saved.push(data);return{id:`c${saved.length}`}}}}
  const prisma={$transaction:async fn=>fn(tx)}
  const data={number:1,isOpen:true,capacity:25,closesAt:new Date(Date.now()+86400000).toISOString()}
  await saveProgramCohort(prisma,"program-1",data)
  await saveProgramCohort(prisma,"program-1",{...data,number:2})
  await saveProgramCohort(prisma,"program-2",data)
  assert.deepEqual(saved.map(row=>[row.courseId,row.number]),[["program-1",1],["program-1",2],["program-2",1]])
  assert.deepEqual(locks,["program-1","program-1","program-2"])
})

test("cohort edits cannot renumber occupied cohorts or reduce capacity below applications", async () => {
  const {saveProgramCohort}=load("lib/cohort-admin.ts")
  const record={id:"c",courseId:"p",number:1,isOpen:true,closesAt:new Date(Date.now()+86400000),_count:{applications:5}}
  const tx={course:{findUnique:async()=>({id:"p"})},cohort:{findFirst:async()=>record,update:async()=>{throw Error("Must not write invalid settings")}}}
  const prisma={$transaction:async fn=>fn(tx)}
  const data={number:2,isOpen:true,capacity:10,closesAt:record.closesAt.toISOString()}
  await assert.rejects(()=>saveProgramCohort(prisma,"p",data,"c"),/cannot be renumbered/)
  await assert.rejects(()=>saveProgramCohort(prisma,"p",{...data,number:1,capacity:3},"c"),/fewer than/)
})

test("admin navigation highlights detail routes without activating unrelated sections", () => {
  const {adminSectionActive,applicationReturnHref}=load("lib/admin-navigation.ts")
  assert.equal(adminSectionActive("/admin/applications/example","/admin/applications"),true)
  assert.equal(adminSectionActive("/admin/courses","/admin/applications"),false)
  assert.equal(adminSectionActive("/admin/applications","/"),false)
  const filtered="/admin/applications?course=p&cohort=cohort-2&page=3&pageSize=10"
  assert.equal(applicationReturnHref(filtered),filtered)
  assert.equal(applicationReturnHref("/admin/applications-other"),"/admin/applications")
  assert.equal(applicationReturnHref("https://example.test"),"/admin/applications")
  assert.equal(applicationReturnHref("//example.test/admin/applications"),"/admin/applications")
})

test("document previews only render PDF, JPG and PNG inline", () => {
  const {documentPreviewKind}=load("lib/admin-navigation.ts")
  assert.equal(documentPreviewKind("application/pdf"),"pdf")
  assert.equal(documentPreviewKind("image/png"),"image")
  assert.equal(documentPreviewKind("IMAGE/JPEG; charset=binary"),"image")
  assert.equal(documentPreviewKind("text/html"),undefined)
  assert.equal(documentPreviewKind("image/svg+xml"),undefined)
})

test("cohort number input accepts a full label or digits without separating its prefix", () => {
  const {cohortNumberFromInput}=load("lib/cohort-input.ts")
  assert.equal(cohortNumberFromInput("cohort-18"),"18")
  assert.equal(cohortNumberFromInput("18"),"18")
  assert.equal(cohortNumberFromInput("cohort-"),"")
  assert.equal(cohortNumberFromInput(""),"")
  assert.equal(cohortNumberFromInput("cohort-2.5"),undefined)
  assert.equal(cohortNumberFromInput("cohort--2"),undefined)
  assert.equal(cohortNumberFromInput("cohort-word"),undefined)
})

test("resuming cannot skip missing answers even when the draft and URL claim a later step", () => {
  const {restoredApplicationStep,firstUnfinishedApplicationStep}=load("lib/application-progress.ts")
  assert.equal(restoredApplicationStep({},3,3),0)
  assert.equal(restoredApplicationStep({courseId:valid().courseId},3,3),1)
  const {educationDocument,...withoutFile}=valid()
  assert.equal(restoredApplicationStep(withoutFile,3,3),2)
  const {identificationNumber,...withoutId}=withoutFile
  assert.equal(restoredApplicationStep(withoutId,3,3),1)
  assert.equal(restoredApplicationStep(valid(),1,3),1)
  assert.equal(restoredApplicationStep(valid(),3,0),0)
  assert.equal(firstUnfinishedApplicationStep(valid()),3)
  assert.equal(restoredApplicationStep(valid(),3,3,[{id:valid().courseId,name:"Program",description:null,isOpen:false}]),0)
  assert.equal(restoredApplicationStep({...valid(),cohortId:"other"},3,3,[{id:valid().courseId,name:"Program",description:null,requiresCohort:true,cohorts:[{id:"c",number:1,cohortLabel:"cohort-1",isOpen:true,capacity:10,closesAt:null,applicationCount:0,spacesLeft:10}]}]),0)
})

test("draft attachments survive module reloads as files and are removed explicitly", async () => {
  const previous=global.indexedDB
  const {IDBFactory}=require("fake-indexeddb")
  global.indexedDB=new IDBFactory()
  try {
    const first=load("lib/draft-attachment.ts")
    const file=pdf()
    await first.saveDraftAttachment(file)
    const resumed=load("lib/draft-attachment.ts")
    const restored=await resumed.loadDraftAttachment()
    assert.ok(restored instanceof File)
    assert.equal(restored.name,file.name)
    assert.equal(restored.type,file.type)
    assert.equal(restored.lastModified,file.lastModified)
    assert.equal(await restored.text(),await file.text())
    assert.equal(await load("lib/education-document.ts").validateEducationFile(restored),null)
    await resumed.saveDraftAttachment(undefined)
    assert.equal(await resumed.loadDraftAttachment(),undefined)
  } finally {if(previous===undefined)delete global.indexedDB;else global.indexedDB=previous}
})

test("draft attachment saves and removal retain the latest user action", async () => {
  const previous=global.indexedDB
  const {IDBFactory}=require("fake-indexeddb")
  global.indexedDB=new IDBFactory()
  try {
    const storage=load("lib/draft-attachment.ts")
    await Promise.all([storage.saveDraftAttachment(pdf()),storage.saveDraftAttachment(new File(["%PDF-1.7\nsecond"],"second.pdf",{type:"application/pdf"})),storage.saveDraftAttachment(undefined)])
    assert.equal(await storage.loadDraftAttachment(),undefined)
  }finally{if(previous===undefined)delete global.indexedDB;else global.indexedDB=previous}
})

test("open-cohort focus excludes hidden programs, expired and full cohorts", () => {
  const {visibleAdminCohorts}=load("lib/cohorts.ts")
  const now=Date.parse("2026-11-06T12:00:00Z")
  const cohorts=[{id:"open",isOpen:true,capacity:10,applicationCount:3},{id:"full",isOpen:true,capacity:1,applicationCount:1},{id:"closed",isOpen:false},{id:"expired",isOpen:true,closesAt:"2026-11-01T12:00:00Z"}]
  assert.deepEqual(visibleAdminCohorts({isOpen:true,cohorts},true,now).map(row=>row.id),["open"])
  assert.deepEqual(visibleAdminCohorts({isOpen:false,cohorts},true,now),[])
  assert.equal(visibleAdminCohorts({isOpen:true,cohorts},false,now).length,4)
})

test("masking applicant details removes actual values from rendered screen content", () => {
  const React=require("react")
  const {renderToStaticMarkup}=require("react-dom/server")
  const Wrapper=({children})=>React.createElement("div",null,children)
  const stubs={
    "./admin/privacy-context":{useAdminPrivacy:()=>true},
    "./applicant-info.module.css":{__esModule:true,default:new Proxy({},{get:(_,name)=>String(name)})},
    "@/components/ui/card":{Card:Wrapper,CardHeader:Wrapper,CardContent:Wrapper},
    "./education-document-download":{__esModule:true,default:()=>React.createElement("button",null,"Preview attachment")},
  }
  const {default:ApplicantInfo}=load("components/ApplicantInfo.tsx",stubs)
  const html=renderToStaticMarkup(React.createElement(ApplicantInfo,{application:{...valid(),course:null,cohort:null,educationDocumentName:"private-file.pdf"}}))
  assert.ok(html.includes("Full Name"))
  assert.ok(html.includes("Hidden"))
  assert.equal(html.includes("Test Applicant"),false)
  assert.equal(html.includes("test@example.com"),false)
  assert.equal(html.includes("0012345678901234"),false)
  assert.equal(html.includes("private-file.pdf"),false)
  assert.equal(html.includes("Preview attachment"),false)
})

test("live program API uses shared program snapshots and disables browser/CDN caching", async () => {
  let count=1
  const prisma={course:{findMany:async()=>[{id:"p",name:"Program",createdAt:new Date(),description:null,isOpen:true,cohorts:[]}]},application:{aggregateRaw:async()=>[{courseId:"p",cohortId:null,_count:{_all:count}}]}}
  const {GET,dynamic}=load("app/api/courses/route.ts",{"@/lib/prisma":{__esModule:true,default:prisma}})
  assert.equal(dynamic,"force-dynamic")
  const first=await GET(new Request("http://localhost/api/courses?open=true"))
  assert.equal(first.headers.get("Cache-Control"),"no-store, max-age=0, must-revalidate")
  assert.equal(first.headers.get("CDN-Cache-Control"),"no-store")
  assert.equal((await first.json())[0].applicationCount,1)
  count=2
  assert.equal((await (await GET(new Request("http://localhost/api/courses?open=true"))).json())[0].applicationCount,1)
})

test("application focus includes only applications in open, non-full cohorts", () => {
  const {filterAdminApplications,DEFAULT_ADMIN_FILTERS}=load("lib/admin-applications.ts")
  const base={id:"a",fullName:"Example",email:"example@example.test",createdAt:new Date(),status:"UNDER_REVIEW",course:{id:"p",name:"Program",isOpen:true},cohort:{id:"c",number:1,isOpen:true,capacity:5,closesAt:"2099-01-01T00:00:00Z",_count:{applications:2}}}
  const rows=[base,{...base,id:"full",cohort:{...base.cohort,_count:{applications:5}}},{...base,id:"closed",cohort:{...base.cohort,isOpen:false}},{...base,id:"past",cohort:{...base.cohort,closesAt:"2000-01-01T00:00:00Z"}},{...base,id:"hidden",course:{...base.course,isOpen:false}},{...base,id:"legacy",cohort:null}]
  assert.deepEqual(filterAdminApplications(rows,{...DEFAULT_ADMIN_FILTERS,focus:"OPEN"}).map(row=>row.id),["a"])
  assert.equal(filterAdminApplications(rows,DEFAULT_ADMIN_FILTERS).length,6)
})

test("admin answer edits validate changed fields and preserve untouched legacy data", () => {
  const {validateAdminAnswerPatch}=load("lib/admin-application-edit.ts")
  const existing={nationality:"Rwanda",refugeeStatus:false,identificationNumber:null,province:"Legacy province"}
  assert.deepEqual(validateAdminAnswerPatch(existing,{fullName:"  Updated Applicant  "}),{fullName:"Updated Applicant"})
  assert.throws(()=>validateAdminAnswerPatch(existing,{email:"bad email"}))
  assert.throws(()=>validateAdminAnswerPatch(existing,{phone:"123"}))
  assert.throws(()=>validateAdminAnswerPatch(existing,{identificationNumber:"123"}))
  assert.throws(()=>validateAdminAnswerPatch(existing,{courseId:"other"}))
  assert.throws(()=>validateAdminAnswerPatch(existing,{status:"ACCEPTED"}))
  assert.throws(()=>validateAdminAnswerPatch(existing,{educationDocumentName:"fake.pdf"}))
  assert.throws(()=>validateAdminAnswerPatch(existing,{province:"invalid"}))
  assert.deepEqual(validateAdminAnswerPatch(existing,{hasYoungChild:false}),{hasYoungChild:false,hasChildcareSupport:false})
  assert.deepEqual(validateAdminAnswerPatch(existing,{hasDisability:false}),{hasDisability:false,disabilityType:null,disabilityDetails:""})
})

test("admin answer endpoint requires authentication, checks edit version, and returns saved answers", async () => {
  const id="a".repeat(24),updatedAt="2026-11-06T10:00:00.000Z"
  let allowed=false,count=1,writes=[]
  const route=load("app/api/applications/[id]/details/route.ts",{
    "@/lib/verify-document-admin":{canDownloadEducationDocument:async()=>allowed},
    "next/cache":{revalidatePath:()=>{}},
    "@/lib/prisma":{__esModule:true,default:{application:{findUnique:async()=>({id,fullName:"Updated Example",updatedAt:new Date(updatedAt)}),updateMany:async input=>{writes.push(input);return {count}}}}},
  })
  const request=()=>new Request("http://localhost/api/applications/"+id+"/details",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({changes:{fullName:"Updated Example"},updatedAt})})
  const context={params:Promise.resolve({id})}
  assert.equal((await route.PATCH(request(),context)).status,401)
  assert.equal(writes.length,0)
  allowed=true;count=0
  assert.equal((await route.PATCH(request(),context)).status,409)
  assert.equal(writes[0].where.updatedAt.toISOString(),updatedAt)
  count=1
  const response=await route.PATCH(request(),context)
  assert.equal(response.status,200)
  assert.equal(response.headers.get("Cache-Control"),"private, no-store")
  assert.equal((await response.json()).application.fullName,"Updated Example")
  assert.deepEqual(writes.at(-1).data,{fullName:"Updated Example"})
})

test("portal renders static cohort labels and excludes full cohorts", () => {
  const React=require("react"),{renderToStaticMarkup}=require("react-dom/server")
  const tags=Object.fromEntries(["FormItem","FormMessage"].map(name=>[name,({children})=>React.createElement("div",null,children)]))
  const Component=load("components/form-sections/course-selection.tsx",{"../application-skeletons":{ProgramSelectionSkeleton:()=>null},"../application-wizard.module.css":{default:{}},"@/components/ui/form":{...tags,FormField:({render})=>render({field:{name:"courseId",onChange:()=>{},onBlur:()=>{},ref:()=>{}}})}}).default
  const cohort={id:"c",number:1,cohortLabel:"cohort-1",isOpen:true,capacity:2,applicationCount:1,closesAt:"2099-01-01T00:00:00Z"}
  const course={id:"p",name:"Example program",description:null,isOpen:true,cohorts:[cohort,{...cohort,id:"full",cohortLabel:"cohort-2",applicationCount:2}]}
  const form={control:{},watch:name=>name==="courseId"?"p":"c",formState:{errors:{}},setValue:()=>{},clearErrors:()=>{}}
  const html=renderToStaticMarkup(React.createElement(Component,{form,courses:[course],loading:false,error:null,onRetry:()=>{}}))
  assert.match(html,/cohort-1/)
  assert.doesNotMatch(html,/cohort-2|combobox|Capacity|spaces|available/)
  assert.match(html,/Closes/)
  assert.equal((html.match(/type="radio"/g)||[]).length,1)
})

test("live ID formatting handles typing, pasting, middle edits and separator deletion", () => {
  const {identificationInputEdit,normalizeIdentificationNumber}=load("lib/identity-format.ts")
  for(const refugee of [false,true]){
    let previous=""
    for(const digit of "2199071234567012"){
      const raw=previous+digit
      const result=identificationInputEdit(raw,previous,raw.length,"Rwanda",refugee,"insertText")
      assert.equal(result.caret,result.value.length)
      previous=result.value
    }
    assert.equal(previous,"2 1990 7 1234567 0 12")
    assert.equal(normalizeIdentificationNumber(previous,"Rwanda",refugee),"2199071234567012")
    const pasted=identificationInputEdit("2199071234567012","",16,"Rwanda",refugee,"insertFromPaste")
    assert.equal(pasted.value,previous)
    const middle=identificationInputEdit("2 1990 7 9234567 0 12",previous,10,"Rwanda",refugee,"insertText")
    assert.equal(middle.caret,10)
    assert.equal(middle.value,"2 1990 7 9234567 0 12")
    const backspace=identificationInputEdit("21990","2 1990",1,"Rwanda",refugee,"deleteContentBackward")
    assert.deepEqual(backspace,{value:"1 990",caret:0})
    const forward=identificationInputEdit("21990","2 1990",1,"Rwanda",refugee,"deleteContentForward")
    assert.deepEqual(forward,{value:"2 990",caret:1})
  }
  assert.deepEqual(identificationInputEdit("REF-001/25","REF-001/2",10,"Rwanda",true,"insertText"),{value:"REF-001/25",caret:10})
  assert.equal(normalizeIdentificationNumber("REF-001/25","Rwanda",true),"REF-001/25")
  assert.equal(identificationInputEdit("0012345678901234","",16,"Rwanda",true).value,"0 0123 4 5678901 2 34")
})

async function entryEnvironment(callback){
  const names=["NODE_ENV","APPLICATION_ENTRY_ENCRYPTION_KEY","APPLICATION_PORTAL_URL","IGIRE_APPLICATION_ENTRY_SECRET","SHECANCODE_APPLICATION_ENTRY_SECRET"]
  const previous=Object.fromEntries(names.map(name=>[name,process.env[name]]))
  Object.assign(process.env,{NODE_ENV:"production",APPLICATION_ENTRY_ENCRYPTION_KEY:crypto.randomBytes(32).toString("hex"),APPLICATION_PORTAL_URL:"https://apply.example.test",IGIRE_APPLICATION_ENTRY_SECRET:crypto.randomBytes(32).toString("hex"),SHECANCODE_APPLICATION_ENTRY_SECRET:crypto.randomBytes(32).toString("hex")})
  try{return await callback()}finally{for(const name of names){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name]}}
}
test("entry tokens encrypt website, time and nonce; reject tampering, expiry and wrong audience",()=>entryEnvironment(async()=>{
  const {issueEntryToken,verifyEntryToken}=load("lib/entry-token.ts")
  const now=Math.floor(Date.now()/1000),token=issueEntryToken("igire-backend",now),entry=verifyEntryToken(token,now)
  assert.equal(entry.domain,"www.igirerwanda.org")
  assert.equal(entry.source,"igire-backend")
  assert.equal(entry.iat,now)
  assert.equal(entry.exp,now+300)
  assert.equal(entry.nonce.length,43)
  assert.ok(!token.includes("igire")&&!token.includes(entry.nonce))
  assert.notEqual(issueEntryToken("igire-backend",now),token)
  const parts=token.split(".");parts[2]=(parts[2][0]==="A"?"B":"A")+parts[2].slice(1)
  assert.throws(()=>verifyEntryToken(parts.join("."),now))
  assert.throws(()=>verifyEntryToken(token,now+300))
  assert.throws(()=>verifyEntryToken(token,now-31))
  process.env.APPLICATION_PORTAL_URL="https://other.example.test"
  assert.throws(()=>verifyEntryToken(token,now))
  assert.throws(()=>issueEntryToken("development",now))
}))
test("source secrets authenticate only their own websites, and missing production encryption fails closed",()=>entryEnvironment(async()=>{
  const {authenticateEntrySource,issueEntryToken}=load("lib/entry-token.ts")
  assert.equal(authenticateEntrySource("igire-frontend",`Bearer ${process.env.IGIRE_APPLICATION_ENTRY_SECRET}`),true)
  assert.equal(authenticateEntrySource("shecancode",`Bearer ${process.env.IGIRE_APPLICATION_ENTRY_SECRET}`),false)
  assert.equal(authenticateEntrySource("development",`Bearer ${process.env.IGIRE_APPLICATION_ENTRY_SECRET}`),false)
  assert.equal(authenticateEntrySource("igire-backend",null),false)
  delete process.env.APPLICATION_ENTRY_ENCRYPTION_KEY
  assert.throws(()=>issueEntryToken("igire-backend"))
}))
test("redemption stores hashed credentials, rejects replay across instances, and expires browser sessions",()=>entryEnvironment(async()=>{
  const {issueEntryToken,digestEntrySecret}=load("lib/entry-token.ts")
  const records=new Map(),prisma={applicationEntry:{create:async({data})=>{if(records.has(data.nonceHash))throw Object.assign(Error("replay"),{code:"P2002"});records.set(data.nonceHash,data)},findUnique:async({where})=>Array.from(records.values()).find(value=>value.sessionHash===where.sessionHash)||null}}
  const stubs={"./prisma":{__esModule:true,default:prisma}}
  const first=load("lib/entry-session.ts",stubs),second=load("lib/entry-session.ts",stubs)
  const token=issueEntryToken("igire-frontend"),session=await first.redeemEntryToken(token)
  const stored=Array.from(records.values())[0]
  assert.equal(stored.sessionHash,digestEntrySecret(session));assert.notEqual(stored.sessionHash,session)
  await assert.rejects(()=>second.redeemEntryToken(token))
  assert.equal((await second.entrySessionFromCookie(session)).source,"igire-frontend")
  stored.submittedAt=new Date();assert.equal(await first.entrySessionFromCookie(session),null)
  stored.submittedAt=null;stored.expiresAt=new Date(0);assert.equal(await second.entrySessionFromCookie(session),null)
  assert.equal(await first.entrySessionFromCookie("invalid"),null)
}))
test("direct API submission without a valid entry cannot write an application",async()=>{
  let written=false
  const {POST}=load("app/api/applications/route.ts",{"@/lib/entry-session":{readEntrySession:async()=>null},"@/lib/prisma":{__esModule:true,default:{application:{create:async()=>{written=true}}}}})
  const response=await POST(new Request("https://apply.example.test/api/applications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(valid())}))
  assert.equal(response.status,403);assert.equal(written,false)
})
test("entry sessions are reserved within submission transactions and cannot submit twice",async()=>{
  const {createApplicationWithAvailability}=load("lib/create-application.ts")
  let reserved=false,created=0
  const tx={applicationEntry:{updateMany:async()=>reserved?{count:0}:(reserved=true,{count:1})},course:{findUnique:async()=>({id:"p",isOpen:true,_count:{cohorts:0,applications:0}}),update:async()=>({})},application:{create:async()=>({id:String(++created)})}}
  const prisma={$transaction:async callback=>callback(tx)}
  const data={entryGrantId:"e",courseId:"p",email:"example@example.test"}
  assert.equal((await createApplicationWithAvailability(prisma,data)).id,"1")
  await assert.rejects(()=>createApplicationWithAvailability(prisma,data),/already used/)
  assert.equal(created,1)
})
test("public token issuer and redemption endpoints fail closed without valid credentials",()=>entryEnvironment(async()=>{
  const {POST}=load("app/api/application-entry/token/route.ts")
  const request=authorization=>new Request("https://apply.example.test/api/application-entry/token",{method:"POST",headers:{"Content-Type":"application/json",...(authorization?{Authorization:authorization}:{})},body:JSON.stringify({source:"igire-fundamentals"})})
  assert.equal((await POST(request())).status,401)
  const response=await POST(request(`Bearer ${process.env.IGIRE_APPLICATION_ENTRY_SECRET}`))
  assert.equal(response.status,200);assert.equal(response.headers.get("Cache-Control"),"private, no-store")
  assert.equal(new URL((await response.json()).entryUrl).origin,"https://apply.example.test")
  const {POST:dev}=load("app/api/application-entry/development/route.ts")
  assert.equal((await dev(new Request("http://localhost:3000/api/application-entry/development",{method:"POST"}))).status,404)
}))

test("Igire integration obtains a fresh server token for each of its three program buttons",()=>entryEnvironment(async()=>{
  const originalFetch=global.fetch,calls=[]
  const {POST}=load("integrations/igire-entry-route.ts")
  global.fetch=async(url,options)=>{calls.push({url:String(url),options});return Response.json({entryUrl:"https://apply.example.test/entry?token=opaque"})}
  try{
    for(const [slug,source] of [["advanced-java-backend-development","igire-backend"],["advanced-frontend-development","igire-frontend"],["web-fundamentals","igire-fundamentals"]]){
      const body=new FormData();body.set("program",slug)
      const response=await POST(new Request("https://www.igirerwanda.org/api/application-entry",{method:"POST",headers:{Origin:"https://www.igirerwanda.org"},body}))
      assert.equal(response.status,303)
      assert.equal(response.headers.get("location"),"https://apply.example.test/entry?token=opaque")
      assert.equal(JSON.parse(calls.at(-1).options.body).source,source)
      assert.equal(calls.at(-1).options.headers.Authorization,`Bearer ${process.env.IGIRE_APPLICATION_ENTRY_SECRET}`)
      assert.equal(calls.at(-1).options.redirect,"error")
    }
    const body=new FormData();body.set("program","web-fundamentals")
    assert.equal((await POST(new Request("https://www.igirerwanda.org/api/application-entry",{method:"POST",headers:{Origin:"https://untrusted.example"},body}))).status,403)
    assert.equal(calls.length,3)
  }finally{global.fetch=originalFetch}
}))

test("SheCanCode integration uses its own secret and source",()=>entryEnvironment(async()=>{
  const originalFetch=global.fetch,calls=[]
  global.fetch=async(url,options)=>{calls.push(options);return Response.json({entryUrl:"https://apply.example.test/entry?token=opaque"})}
  try{
    const {POST}=load("integrations/shecancode-entry-route.ts")
    const response=await POST(new Request("https://www.shecancodeschool.org/api/application-entry",{method:"POST",headers:{Origin:"https://www.shecancodeschool.org"}}))
    assert.equal(response.status,303)
    assert.equal(calls[0].headers.Authorization,`Bearer ${process.env.SHECANCODE_APPLICATION_ENTRY_SECRET}`)
    assert.deepEqual(JSON.parse(calls[0].body),{source:"shecancode"})
  }finally{global.fetch=originalFetch}
}))
test("redemption issues only a private session cookie and removes the token from the next URL",()=>entryEnvironment(async()=>{
  let redeemed=0
  const {POST}=load("app/api/application-entry/redeem/route.ts",{"@/lib/entry-session":{redeemEntryToken:async token=>{redeemed++;if(token!=="valid")throw Error();return "x".repeat(43)}}})
  const request=(token,origin="https://apply.example.test")=>{const data=new FormData();data.set("token",token);return new Request("https://apply.example.test/api/application-entry/redeem",{method:"POST",headers:{Origin:origin},body:data})}
  const response=await POST(request("valid"))
  assert.equal(response.status,303)
  assert.equal(response.headers.get("location"),"https://apply.example.test/apply?step=1")
  assert.match(response.headers.get("set-cookie"),/HttpOnly/)
  assert.match(response.headers.get("set-cookie"),/Secure/)
  assert.match(response.headers.get("set-cookie"),/SameSite=lax/i)
  assert.equal((await POST(request("valid","https://other.example"))).headers.get("set-cookie"),null)
  assert.equal(redeemed,1)
  const invalid=await POST(request("used"))
  assert.match(invalid.headers.get("location"),/entry\/required\?error=invalid$/)
  assert.equal(invalid.headers.get("set-cookie"),null)
}))

test("Igire Apply hrefs preserve existing button content and use navigation rather than a cross-site form",()=>{
  const {rewriteProgramApplyLinks}=load("integrations/igire-entry-links.ts")
  for(const href of ["https://apply.shecancodeschool.org/apply","https://apply.shecancodeschool.org/"]){
    const html=`<a href="${href}" target="_blank" class="original-style">Apply Now</a>`
    const rewritten=rewriteProgramApplyLinks(html,"advanced-java-backend-development")
    assert.equal(rewritten,'<a href="/api/application-entry?program=advanced-java-backend-development" class="original-style">Apply Now</a>')
    assert.doesNotMatch(rewritten,/<form|https:\/\/apply/)
  }
  assert.equal(rewriteProgramApplyLinks('<span>Applications Closed</span>',"web-fundamentals"),'<span>Applications Closed</span>')
})
test("Igire link navigation issues a fresh token without consuming it and rejects unknown programs",()=>entryEnvironment(async()=>{
  const originalFetch=global.fetch,calls=[]
  global.fetch=async(url,options)=>{calls.push(options);return Response.json({entryUrl:`https://apply.example.test/entry?token=fresh${calls.length}`})}
  try{
    const {GET}=load("integrations/igire-entry-route.ts")
    const request=()=>new Request("https://www.igirerwanda.org/api/application-entry?program=advanced-java-backend-development")
    const first=await GET(request()),second=await GET(request())
    assert.equal(first.status,303)
    assert.notEqual(first.headers.get("location"),second.headers.get("location"))
    assert.equal(first.headers.get("Cache-Control"),"private, no-store")
    assert.deepEqual(JSON.parse(calls[0].body),{source:"igire-backend"})
    assert.equal((await GET(new Request("https://www.igirerwanda.org/api/application-entry?program=constructor"))).status,400)
    assert.equal(calls.length,2)
  }finally{global.fetch=originalFetch}
}))

test("local automatic entry requires development mode, a loopback portal and the configured origin",()=>entryEnvironment(async()=>{
  const {isLocalDevelopmentPortal,isLocalDevelopmentRequest,issueEntryToken,verifyEntryToken}=load("lib/entry-token.ts")
  process.env.APPLICATION_PORTAL_URL="http://localhost:3000"
  assert.equal(isLocalDevelopmentPortal(),false)
  assert.throws(()=>issueEntryToken("development"))
  process.env.NODE_ENV="development"
  for(const origin of ["http://localhost:3000","http://127.0.0.1:3001","http://[::1]:3002"]){
    process.env.APPLICATION_PORTAL_URL=origin
    assert.equal(isLocalDevelopmentPortal(),true)
    assert.equal(isLocalDevelopmentRequest(origin+"/entry/development"),true)
    assert.equal(verifyEntryToken(issueEntryToken("development")).source,"development")
    assert.equal(isLocalDevelopmentRequest("http://localhost:4000/entry/development"),false)
  }
  process.env.APPLICATION_PORTAL_URL="https://apply.example.test"
  assert.equal(isLocalDevelopmentPortal(),false)
  assert.equal(isLocalDevelopmentRequest("http://localhost:3000"),false)
  assert.throws(()=>issueEntryToken("development"))
}))

test("development bootstrap rejects foreign origins and production while accepting local automatic POSTs",()=>entryEnvironment(async()=>{
  const {POST}=load("app/api/application-entry/development/route.ts")
  const request=(url,origin)=>new Request(url+"/api/application-entry/development",{method:"POST",headers:{Origin:origin}})
  process.env.NODE_ENV="development"
  process.env.APPLICATION_PORTAL_URL="http://localhost:3000"
  const response=await POST(request("http://localhost:3000","http://localhost:3000"))
  assert.equal(response.status,303)
  const target=new URL(response.headers.get("location"))
  assert.equal(target.pathname,"/entry")
  const {verifyEntryToken}=load("lib/entry-token.ts")
  assert.equal(verifyEntryToken(target.searchParams.get("token")).source,"development")
  assert.equal((await POST(request("http://localhost:3000","https://other.example"))).status,403)
  assert.equal((await POST(request("http://localhost:3001","http://localhost:3001"))).status,404)
  process.env.NODE_ENV="production"
  assert.equal((await POST(request("http://localhost:3000","http://localhost:3000"))).status,404)
}))

test("valid website entry renders only automatic redemption and invalid links still redirect",()=>entryEnvironment(async()=>{
  const {issueEntryToken}=load("lib/entry-token.ts")
  const token=issueEntryToken("igire-frontend")
  const {default:EntryPage}=load("app/entry/page.tsx",{
    "@/components/automatic-application-entry":{__esModule:true,default:function AutoEntry(){}},
    "next/navigation":{redirect:target=>{throw Error("redirect:"+target)}},
  })
  const page=await EntryPage({searchParams:Promise.resolve({token})})
  assert.equal(page.props.action,"/api/application-entry/redeem")
  assert.equal(page.props.token,token)
  await assert.rejects(()=>EntryPage({searchParams:Promise.resolve({token:"invalid"})}),/redirect:\/entry\/required\?error=invalid/)
}))

test("automatic entry posts once even when React replays the mount effect",()=>{
  let posts=0,refs=0
  const effects=[]
  const {default:AutomaticEntry}=load("components/automatic-application-entry.tsx",{
    react:{useRef:()=>({current:refs++===0?{requestSubmit:()=>posts++}:false}),useEffect:callback=>effects.push(callback)},
    "./application-skeletons":{ApplicationEntrySkeleton:()=>null},
  })
  const page=AutomaticEntry({action:"/api/application-entry/redeem",token:"test-token"})
  const form=page.props.children[1]
  assert.equal(form.props.method,"post")
  assert.equal(form.props.action,"/api/application-entry/redeem")
  effects[0]();effects[0]()
  assert.equal(posts,1)
})
