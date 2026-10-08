import type { Dimensions } from '../api/types'

export const DIMENSION_ORDER: (keyof Dimensions)[] = [
  'preparation',
  'assertiveness',
  'concessions',
  'leverage_use',
  'outcome',
]

export const DIMENSION_LABEL: Record<keyof Dimensions, string> = {
  preparation: 'Preparation',
  assertiveness: 'Assertiveness',
  concessions: 'Concessions',
  leverage_use: 'Leverage use',
  outcome: 'Outcome',
}