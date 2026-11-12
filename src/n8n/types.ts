export interface Workflow {
  id: string;
  name: string;
  active: boolean;
}

/** Its nodes are unchecked, like everything the instance sends. */
export interface WorkflowDetail extends Workflow {
  /** `runsOnAClock` is the way to read them. */
  nodes?: unknown;
}

export type ExecutionStatus =
  | 'success'
  | 'error'
  | 'running'
  | 'waiting'
  | 'canceled'
  | 'crashed'
  | 'new';

export interface Execution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  stoppedAt: string | null;
}

export interface NodeRun {
  data?: {
    main?: Array<Array<{ json?: Record<string, unknown> }> | null>;
  };
}

export interface ExecutionDetail extends Execution {
  data?: {
    resultData?: {
      runData?: Record<string, NodeRun[]>;
    };
  };
}
