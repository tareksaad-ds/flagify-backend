import { createHash } from 'crypto'

type Operator = 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt'

export interface Rule {
  attribute: string
  operator: Operator
  value: string | number
}

export interface FlagState {
  enabled: boolean
  rollout_percentage: number
  rules: Rule[]
}

export interface EvaluationContext {
  userId: string
  flagKey: string
  [key: string]: string | number
}

function hashBucket(userId: string, flagKey: string): number {
  const hex = createHash('sha256').update(`${userId}:${flagKey}`).digest('hex')
  return parseInt(hex.slice(0, 8), 16) % 100
}

function matchesRule(rule: Rule, context: EvaluationContext): boolean {
  const ctxValue = context[rule.attribute]
  if (ctxValue === undefined) return false

  switch (rule.operator) {
    case 'equals':
      return ctxValue === rule.value
    case 'not_equals':
      return ctxValue !== rule.value
    case 'contains':
      return typeof ctxValue === 'string' && typeof rule.value === 'string'
        ? ctxValue.includes(rule.value)
        : false
    case 'gt':
      return typeof ctxValue === 'number' && typeof rule.value === 'number'
        ? ctxValue > rule.value
        : false
    case 'lt':
      return typeof ctxValue === 'number' && typeof rule.value === 'number'
        ? ctxValue < rule.value
        : false
  }
}

export function evaluateFlag(flagState: FlagState, context: EvaluationContext): boolean {
  if (!flagState.enabled) return false

  if (flagState.rules.length > 0) {
    const matchedByRule = flagState.rules.some(rule => matchesRule(rule, context))
    if (matchedByRule) return true
  }

  if (flagState.rollout_percentage > 0) {
    return hashBucket(context.userId, context.flagKey) < flagState.rollout_percentage
  }

  return flagState.enabled
}
