import { applicationStepSchemas } from "./application-steps"
import { acceptingApplications, programClock } from "./program-availability"
import { availableProgram, selectedAvailability } from "./cohorts"
import type { Program } from "./program-types"

// Re-check the actual answers; a saved step number or URL never grants progress.
export function firstUnfinishedApplicationStep(values:unknown,programs?:Program[]) {
  for(let step=0;step<3;step++) {
    const result=applicationStepSchemas[step].safeParse(values)
    if(!result.success)return step
    if(step===0&&programs) {
      const answers=values as {courseId?:string;cohortId?:string}
      const program=programs.find(item=>item.id===answers.courseId)
      if(!program||!availableProgram(program,programClock(program)))return 0
      const intake=selectedAvailability(program,answers.cohortId)
      if(!intake||!acceptingApplications(intake,programClock(program)))return 0
    }
  }
  return 3
}
export function restoredApplicationStep(values:unknown,savedStep:number,requestedStep?:number,programs?:Program[]) {
  const saved=Number.isInteger(savedStep)?Math.max(0,Math.min(3,savedStep)):0
  const requested=requestedStep===undefined?saved:Number.isInteger(requestedStep)?Math.max(0,Math.min(3,requestedStep)):0
  return Math.min(saved,requested,firstUnfinishedApplicationStep(values,programs))
}
