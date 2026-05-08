import { describe, it, expect, vi } from 'vitest'
import {
  createStateMachine,
  type StateConfig,
  type WorkflowContext,
} from '@/lib/workflow/state-machine'

// Define a simple approval workflow for testing
type TestState = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
type TestAction = 'SUBMIT' | 'APPROVE' | 'REJECT' | 'REVISE'

const testConfig: StateConfig<TestState, TestAction> = {
  initialState: 'DRAFT',
  states: {
    DRAFT: {
      transitions: {
        SUBMIT: { target: 'PENDING' },
      },
    },
    PENDING: {
      transitions: {
        APPROVE: { target: 'APPROVED' },
        REJECT: { target: 'REJECTED' },
      },
    },
    APPROVED: {
      transitions: {},
    },
    REJECTED: {
      transitions: {
        REVISE: { target: 'DRAFT' },
      },
    },
  },
}

function createTestContext(overrides: Partial<WorkflowContext> = {}): WorkflowContext {
  return {
    entityId: 'entity-1',
    entityType: 'expense',
    currentUserId: 'user-1',
    currentUserRole: 'ADMIN',
    data: {},
    history: [],
    ...overrides,
  }
}

describe('createStateMachine', () => {
  it('creates a state machine with the correct initial state', () => {
    const machine = createStateMachine(testConfig)
    expect(machine.initialState).toBe('DRAFT')
  })

  it('lists all states', () => {
    const machine = createStateMachine(testConfig)
    expect(machine.states).toEqual(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'])
  })

  it('performs a valid transition', () => {
    const machine = createStateMachine(testConfig)
    const ctx = createTestContext()
    const result = machine.transition('DRAFT', 'SUBMIT', ctx)
    expect(result.allowed).toBe(true)
    expect(result.newState).toBe('PENDING')
  })

  it('rejects an invalid action for the current state', () => {
    const machine = createStateMachine(testConfig)
    const ctx = createTestContext()
    const result = machine.transition('DRAFT', 'APPROVE', ctx)
    expect(result.allowed).toBe(false)
    expect(result.newState).toBe('DRAFT')
    expect(result.reason).toContain('not available')
  })

  it('rejects transition from an unknown state', () => {
    const machine = createStateMachine(testConfig)
    const ctx = createTestContext()
    const result = machine.transition('UNKNOWN' as TestState, 'SUBMIT', ctx)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Unknown state')
  })

  it('records transition history', () => {
    const machine = createStateMachine(testConfig)
    const ctx = createTestContext()

    machine.transition('DRAFT', 'SUBMIT', ctx)
    const history = machine.getHistory(ctx)

    expect(history).toHaveLength(1)
    expect(history[0].from).toBe('DRAFT')
    expect(history[0].to).toBe('PENDING')
    expect(history[0].action).toBe('SUBMIT')
    expect(history[0].userId).toBe('user-1')
  })

  it('records a note in transition history', () => {
    const machine = createStateMachine(testConfig)
    const ctx = createTestContext()

    machine.transition('DRAFT', 'SUBMIT', ctx, 'Submitting for review')
    const history = machine.getHistory(ctx)

    expect(history[0].note).toBe('Submitting for review')
  })

  it('accumulates multiple transitions in history', () => {
    const machine = createStateMachine(testConfig)
    const ctx = createTestContext()

    machine.transition('DRAFT', 'SUBMIT', ctx)
    machine.transition('PENDING', 'REJECT', ctx)
    machine.transition('REJECTED', 'REVISE', ctx)

    const history = machine.getHistory(ctx)
    expect(history).toHaveLength(3)
    expect(history[0].to).toBe('PENDING')
    expect(history[1].to).toBe('REJECTED')
    expect(history[2].to).toBe('DRAFT')
  })

  it('blocks transition when guard function returns false', () => {
    const guardConfig: StateConfig<TestState, TestAction> = {
      initialState: 'DRAFT',
      states: {
        DRAFT: {
          transitions: {
            SUBMIT: {
              target: 'PENDING',
              guard: (ctx) => ctx.currentUserRole === 'MANAGER',
            },
          },
        },
        PENDING: { transitions: {} },
        APPROVED: { transitions: {} },
        REJECTED: { transitions: {} },
      },
    }

    const machine = createStateMachine(guardConfig)
    const ctx = createTestContext({ currentUserRole: 'ADMIN' })
    const result = machine.transition('DRAFT', 'SUBMIT', ctx)

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Guard condition failed')
  })

  it('allows transition when guard function returns true', () => {
    const guardConfig: StateConfig<TestState, TestAction> = {
      initialState: 'DRAFT',
      states: {
        DRAFT: {
          transitions: {
            SUBMIT: {
              target: 'PENDING',
              guard: (ctx) => ctx.currentUserRole === 'ADMIN',
            },
          },
        },
        PENDING: { transitions: {} },
        APPROVED: { transitions: {} },
        REJECTED: { transitions: {} },
      },
    }

    const machine = createStateMachine(guardConfig)
    const ctx = createTestContext({ currentUserRole: 'ADMIN' })
    const result = machine.transition('DRAFT', 'SUBMIT', ctx)

    expect(result.allowed).toBe(true)
    expect(result.newState).toBe('PENDING')
  })

  it('returns available actions for a state', () => {
    const machine = createStateMachine(testConfig)
    const ctx = createTestContext()
    const actions = machine.getAvailableActions('PENDING', ctx)

    expect(actions).toHaveLength(2)
    const actionNames = actions.map((a) => a.action)
    expect(actionNames).toContain('APPROVE')
    expect(actionNames).toContain('REJECT')
  })

  it('returns empty available actions for a terminal state', () => {
    const machine = createStateMachine(testConfig)
    const ctx = createTestContext()
    const actions = machine.getAvailableActions('APPROVED', ctx)
    expect(actions).toHaveLength(0)
  })

  it('excludes actions whose guards fail from available actions', () => {
    const guardConfig: StateConfig<TestState, TestAction> = {
      initialState: 'PENDING',
      states: {
        DRAFT: { transitions: {} },
        PENDING: {
          transitions: {
            APPROVE: {
              target: 'APPROVED',
              guard: (ctx) => ctx.currentUserRole === 'MANAGER',
            },
            REJECT: { target: 'REJECTED' },
          },
        },
        APPROVED: { transitions: {} },
        REJECTED: { transitions: {} },
      },
    }

    const machine = createStateMachine(guardConfig)
    const ctx = createTestContext({ currentUserRole: 'REP' })
    const actions = machine.getAvailableActions('PENDING', ctx)

    expect(actions).toHaveLength(1)
    expect(actions[0].action).toBe('REJECT')
  })

  it('calls onTransition callback during transition', () => {
    const onTransition = vi.fn()
    const config: StateConfig<TestState, TestAction> = {
      initialState: 'DRAFT',
      states: {
        DRAFT: {
          transitions: {
            SUBMIT: { target: 'PENDING', onTransition },
          },
        },
        PENDING: { transitions: {} },
        APPROVED: { transitions: {} },
        REJECTED: { transitions: {} },
      },
    }

    const machine = createStateMachine(config)
    const ctx = createTestContext()
    machine.transition('DRAFT', 'SUBMIT', ctx)

    expect(onTransition).toHaveBeenCalledOnce()
    expect(onTransition).toHaveBeenCalledWith(ctx)
  })

  it('calls onEnter callback when entering a state', () => {
    const onEnter = vi.fn()
    const config: StateConfig<TestState, TestAction> = {
      initialState: 'DRAFT',
      states: {
        DRAFT: {
          transitions: {
            SUBMIT: { target: 'PENDING' },
          },
        },
        PENDING: {
          onEnter,
          transitions: {},
        },
        APPROVED: { transitions: {} },
        REJECTED: { transitions: {} },
      },
    }

    const machine = createStateMachine(config)
    const ctx = createTestContext()
    machine.transition('DRAFT', 'SUBMIT', ctx)

    expect(onEnter).toHaveBeenCalledOnce()
    expect(onEnter).toHaveBeenCalledWith(ctx)
  })
})
