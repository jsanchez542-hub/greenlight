import type { Execution, ExecutionDetail, Workflow, WorkflowDetail } from './types.js';

const PAGE_SIZE = 250;

export interface N8nClientOptions {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof globalThis.fetch;
}

export interface ListExecutionsOptions {
  workflowId?: string;
  limit?: number;
}

export class N8nApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'N8nApiError';
  }
}

interface Page<T> {
  data: T[];
  nextCursor?: string | null;
}

export class N8nClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(options: N8nClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  listWorkflows(): Promise<Workflow[]> {
    return this.collect<Workflow>('/api/v1/workflows');
  }

  listExecutions(options: ListExecutionsOptions = {}): Promise<Execution[]> {
    const query: Record<string, string> = { includeData: 'false' };
    if (options.workflowId !== undefined) {
      query['workflowId'] = options.workflowId;
    }
    return this.collect<Execution>('/api/v1/executions', query, options.limit);
  }

  getWorkflow(id: string): Promise<WorkflowDetail> {
    return this.request<WorkflowDetail>(`/api/v1/workflows/${encodeURIComponent(id)}`, {});
  }

  getExecution(id: string): Promise<ExecutionDetail> {
    return this.request<ExecutionDetail>(`/api/v1/executions/${encodeURIComponent(id)}`, {
      includeData: 'true',
    });
  }

  private async collect<T>(
    path: string,
    query: Record<string, string> = {},
    limit?: number,
  ): Promise<T[]> {
    const items: T[] = [];
    let cursor: string | undefined;

    do {
      const remaining = limit === undefined ? PAGE_SIZE : limit - items.length;
      const page = await this.request<Page<T>>(path, {
        ...query,
        limit: String(Math.min(PAGE_SIZE, remaining)),
        ...(cursor === undefined ? {} : { cursor }),
      });

      items.push(...page.data);
      cursor = page.nextCursor ?? undefined;
    } while (cursor !== undefined && (limit === undefined || items.length < limit));

    return limit === undefined ? items : items.slice(0, limit);
  }

  private async request<T>(path: string, query: Record<string, string>): Promise<T> {
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    const response = await this.fetchImpl(url, {
      headers: { 'X-N8N-API-KEY': this.apiKey, accept: 'application/json' },
    });

    if (!response.ok) {
      throw new N8nApiError(
        `n8n API returned ${response.status} for ${path}. Check N8N_BASE_URL and N8N_API_KEY.`,
        response.status,
      );
    }

    return (await response.json()) as T;
  }
}
