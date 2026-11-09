export function cohortNumberFromInput(value:string):string|undefined {
  const match=/^(?:cohort-)?(\d*)$/i.exec(value.trim())
  return match?.[1]
}
