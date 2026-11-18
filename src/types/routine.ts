import type { ProductLink } from './chat'

export type RoutinePlanStep = {
  title: string
  description: string
  product?: ProductLink
}

export type RoutinePlan = {
  morning: RoutinePlanStep[]
  evening: RoutinePlanStep[]
}

export type RoutineLocationState = {
  liveDemoRoutine?: RoutinePlan
}
