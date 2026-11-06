const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")
const crypto = require("node:crypto")
const root = path.resolve(__dirname, "..")

function transactionClient(prisma) {
  return { ...prisma, $transaction: async callback => callback({
    ...prisma, course: { ...prisma.course, update: async () => ({}) },
  }) }
}

function load(relative, stubs = {}) {
  const filename = path.join(root, relative)
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const mod = { exports: {} }
  const localRequire = (id) => {
    if (id in stubs) return stubs[id]
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
  const courses=[{id:"open",isOpen:true,_count:{applications:0}},{id:"closed",isOpen:false,_count:{applications:0}},{id:"legacy",_count:{applications:0}}]
  const {GET}=load("app/api/courses/route.ts",{"@/lib/prisma":{default:{course:{findMany:async()=>courses}},__esModule:true}})
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
  const prisma={course:{findMany:async()=>{reads++;return [{id:"p",name:"Frontend",description:null,isOpen:true,closesAt:null,capacity:10,_count:{applications:2}}]}}}
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
  assert.equal(formatIdentificationNumber("0012345678901234","Rwanda",false),"0012 3456 7890 1234")
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
