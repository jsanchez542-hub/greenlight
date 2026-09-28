export interface Workflow {
  id: string;
  name: string;
  active: boolean;
}

export interface WorkflowNode {
  name: string;
  type: string;
  parameters?: Record<string, unknown>;
}

export interface WorkflowDetail extends Workflow {
  nodes: WorkflowNode[];
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
