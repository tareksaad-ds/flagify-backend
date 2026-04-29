import { describe, it, expect } from 'vitest'
import { evaluateFlag, FlagState, EvaluationContext } from './evaluation.service'

const baseContext: EvaluationContext = {
  userId: 'user-123',
  flagKey: 'dark-mode',
}

const baseState: FlagState = {
  enabled: true,
  rollout_percentage: 0,
  rules: [],
}

describe('evaluateFlag', () => {
  describe('global kill switch', () => {
    it('returns false when flag is disabled regardless of rules or rollout', () => {
      const state: FlagState = {
        enabled: false,
        rollout_percentage: 100,
        rules: [{ attribute: 'userId', operator: 'equals', value: 'user-123' }],
      }
      expect(evaluateFlag(state, baseContext)).toBe(false)
    })
  })

  describe('simple on/off', () => {
    it('returns true when enabled with no rules and no rollout', () => {
      expect(evaluateFlag(baseState, baseContext)).toBe(true)
    })
  })

  describe('targeting rules', () => {
    it('equals — returns true when attribute matches', () => {
      const state: FlagState = {
        ...baseState,
        rules: [{ attribute: 'email', operator: 'equals', value: 'tarek@gmail.com' }],
      }
      const ctx: EvaluationContext = { ...baseContext, email: 'tarek@gmail.com' }
      expect(evaluateFlag(state, ctx)).toBe(true)
    })

    it('equals — returns false when attribute does not match', () => {
      const state: FlagState = {
        ...baseState,
        rules: [{ attribute: 'email', operator: 'equals', value: 'other@gmail.com' }],
      }
      const ctx: EvaluationContext = { ...baseContext, email: 'tarek@gmail.com' }
      expect(evaluateFlag(state, ctx)).toBe(true) // falls through to enabled=true
    })

    it('not_equals — returns true when attribute does not match', () => {
      const state: FlagState = {
        ...baseState,
        rollout_percentage: 0,
        rules: [{ attribute: 'plan', operator: 'not_equals', value: 'free' }],
      }
      const ctx: EvaluationContext = { ...baseContext, plan: 'pro' }
      expect(evaluateFlag(state, ctx)).toBe(true)
    })

    it('contains — returns true when string includes value', () => {
      const state: FlagState = {
        ...baseState,
        rules: [{ attribute: 'email', operator: 'contains', value: '@company.com' }],
      }
      const ctx: EvaluationContext = { ...baseContext, email: 'tarek@company.com' }
      expect(evaluateFlag(state, ctx)).toBe(true)
    })

    it('contains — returns false when string does not include value', () => {
      const state: FlagState = {
        ...baseState,
        enabled: false,
        rules: [{ attribute: 'email', operator: 'contains', value: '@company.com' }],
      }
      const ctx: EvaluationContext = { ...baseContext, email: 'tarek@gmail.com' }
      expect(evaluateFlag(state, ctx)).toBe(false)
    })

    it('gt — returns true when context value is greater', () => {
      const state: FlagState = {
        ...baseState,
        rules: [{ attribute: 'age', operator: 'gt', value: 18 }],
      }
      const ctx: EvaluationContext = { ...baseContext, age: 25 }
      expect(evaluateFlag(state, ctx)).toBe(true)
    })

    it('lt — returns true when context value is less', () => {
      const state: FlagState = {
        ...baseState,
        rules: [{ attribute: 'age', operator: 'lt', value: 18 }],
      }
      const ctx: EvaluationContext = { ...baseContext, age: 16 }
      expect(evaluateFlag(state, ctx)).toBe(true)
    })

    it('returns false when attribute is missing from context', () => {
      const state: FlagState = {
        ...baseState,
        enabled: false,
        rules: [{ attribute: 'plan', operator: 'equals', value: 'pro' }],
      }
      expect(evaluateFlag(state, baseContext)).toBe(false)
    })

    it('OR logic — returns true if any rule matches', () => {
      const state: FlagState = {
        ...baseState,
        rules: [
          { attribute: 'email', operator: 'equals', value: 'other@gmail.com' },
          { attribute: 'plan', operator: 'equals', value: 'pro' },
        ],
      }
      const ctx: EvaluationContext = { ...baseContext, email: 'tarek@gmail.com', plan: 'pro' }
      expect(evaluateFlag(state, ctx)).toBe(true)
    })
  })

  describe('percentage rollout', () => {
    it('returns consistent result for the same userId + flagKey', () => {
      const state: FlagState = { ...baseState, rollout_percentage: 50, rules: [] }
      const result1 = evaluateFlag(state, baseContext)
      const result2 = evaluateFlag(state, baseContext)
      expect(result1).toBe(result2)
    })

    it('returns false for 0% rollout', () => {
      const state: FlagState = { ...baseState, rollout_percentage: 0, rules: [] }
      expect(evaluateFlag(state, baseContext)).toBe(true) // falls through to enabled=true
    })

    it('returns true for 100% rollout', () => {
      const state: FlagState = { ...baseState, rollout_percentage: 100, rules: [] }
      expect(evaluateFlag(state, baseContext)).toBe(true)
    })

    it('rules take priority over rollout', () => {
      const state: FlagState = {
        ...baseState,
        rollout_percentage: 0,
        rules: [{ attribute: 'userId', operator: 'equals', value: 'user-123' }],
      }
      expect(evaluateFlag(state, baseContext)).toBe(true)
    })
  })
})
