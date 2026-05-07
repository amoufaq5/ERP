// ─── Approval State Machine Engine ───
// Pure TypeScript state machine for approval workflows.
// No external dependencies — generic enough for any entity type.

// ─── Core Types ───

export interface TransitionConfig<S extends string, A extends string> {
  target: S;
  guard?: (context: WorkflowContext) => boolean;
  onTransition?: (context: WorkflowContext) => void;
}

export interface StateNode<S extends string, A extends string> {
  transitions: Partial<Record<A, TransitionConfig<S, A>>>;
  onEnter?: (context: WorkflowContext) => void;
}

export interface StateConfig<S extends string, A extends string> {
  states: Record<S, StateNode<S, A>>;
  initialState: S;
}

export interface HistoryEntry {
  from: string;
  to: string;
  action: string;
  userId: string;
  timestamp: string;
  note?: string;
}

export interface WorkflowContext {
  entityId: string;
  entityType: string;
  currentUserId: string;
  currentUserRole: string;
  data: Record<string, unknown>;
  history: HistoryEntry[];
}

export interface TransitionResult<S extends string> {
  newState: S;
  allowed: boolean;
  reason?: string;
}

export interface AvailableAction<A extends string> {
  action: A;
  targetState: string;
}

export interface StateMachineInstance<S extends string, A extends string> {
  /** Attempt a state transition. Returns result with newState and allowed flag. */
  transition: (
    currentState: S,
    action: A,
    context: WorkflowContext,
    note?: string
  ) => TransitionResult<S>;

  /** Get all actions available from the given state for the current user/context. */
  getAvailableActions: (
    currentState: S,
    context: WorkflowContext
  ) => AvailableAction<A>[];

  /** Return the transition history from the context. */
  getHistory: (context: WorkflowContext) => HistoryEntry[];

  /** The initial state of the machine. */
  initialState: S;

  /** All state names. */
  states: S[];
}

// ─── Factory ───

export function createStateMachine<S extends string, A extends string>(
  config: StateConfig<S, A>
): StateMachineInstance<S, A> {
  const allStates = Object.keys(config.states) as S[];

  function transition(
    currentState: S,
    action: A,
    context: WorkflowContext,
    note?: string
  ): TransitionResult<S> {
    const stateNode = config.states[currentState];
    if (!stateNode) {
      return { newState: currentState, allowed: false, reason: `Unknown state: ${currentState}` };
    }

    const transitionDef = stateNode.transitions[action];
    if (!transitionDef) {
      return {
        newState: currentState,
        allowed: false,
        reason: `Action "${action}" is not available in state "${currentState}"`,
      };
    }

    // Evaluate guard
    if (transitionDef.guard && !transitionDef.guard(context)) {
      return {
        newState: currentState,
        allowed: false,
        reason: `Guard condition failed for action "${action}"`,
      };
    }

    const target = transitionDef.target;

    // Record history
    const entry: HistoryEntry = {
      from: currentState,
      to: target,
      action,
      userId: context.currentUserId,
      timestamp: new Date().toISOString(),
      note,
    };
    context.history.push(entry);

    // Fire onTransition callback
    if (transitionDef.onTransition) {
      transitionDef.onTransition(context);
    }

    // Fire onEnter callback for the target state
    const targetNode = config.states[target];
    if (targetNode?.onEnter) {
      targetNode.onEnter(context);
    }

    return { newState: target, allowed: true };
  }

  function getAvailableActions(
    currentState: S,
    context: WorkflowContext
  ): AvailableAction<A>[] {
    const stateNode = config.states[currentState];
    if (!stateNode) return [];

    const actions: AvailableAction<A>[] = [];
    const transitions = stateNode.transitions;

    for (const actionKey of Object.keys(transitions) as A[]) {
      const def = transitions[actionKey];
      if (!def) continue;

      // Only include actions whose guards pass
      if (def.guard && !def.guard(context)) continue;

      actions.push({ action: actionKey, targetState: def.target });
    }

    return actions;
  }

  function getHistory(context: WorkflowContext): HistoryEntry[] {
    return [...context.history];
  }

  return {
    transition,
    getAvailableActions,
    getHistory,
    initialState: config.initialState,
    states: allStates,
  };
}
