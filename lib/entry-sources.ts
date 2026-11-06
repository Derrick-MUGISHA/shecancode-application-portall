export const ENTRY_SOURCES = {
  "igire-backend": {label:"Igire Rwanda · Advanced Java Backend Development",url:"https://www.igirerwanda.org/programs/advanced-java-backend-development",secretEnv:"IGIRE_APPLICATION_ENTRY_SECRET"},
  "igire-frontend": {label:"Igire Rwanda · Advanced Frontend Development",url:"https://www.igirerwanda.org/programs/advanced-frontend-development",secretEnv:"IGIRE_APPLICATION_ENTRY_SECRET"},
  "igire-fundamentals": {label:"Igire Rwanda · Web Fundamentals",url:"https://www.igirerwanda.org/programs/web-fundamentals",secretEnv:"IGIRE_APPLICATION_ENTRY_SECRET"},
  "shecancode": {label:"SheCanCode School",url:"https://www.shecancodeschool.org/",secretEnv:"SHECANCODE_APPLICATION_ENTRY_SECRET"},
  "development": {label:"Local development",url:"http://localhost:3000/entry/development",secretEnv:null},
} as const
export type EntrySource = keyof typeof ENTRY_SOURCES
export function isEntrySource(value:unknown):value is EntrySource {return typeof value==="string"&&Object.hasOwn(ENTRY_SOURCES,value)}
