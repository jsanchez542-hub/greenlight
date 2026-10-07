import { messagesFor, type Lang } from '../i18n/index.js';
import { isPrivateHost } from './network.js';
import type { Execution, ExecutionDetail, Workflow, WorkflowDetail } from './types.js';

const PAGE_SIZE = 250;
const MAX_REDIRECTS = 3;

export interface N8nClientOptions {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof globalThis.fetch;
  /** Lets the key travel over plain http to a public address. Off unless the user asks for it. */
  allowInsecureHttp?: boolean;
  /** The language error messages are written in. */
  lang?: Lang;
}

export interface ListExecutionsOptions {
  workflowId?: string;
  limit?: number;
}

export const INSECURE_HTTP_MESSAGE = messagesFor('en').client.insecureHttp;

function assertSafeAddress(baseUrl: string, allowInsecureHttp: boolean, lang: Lang): void {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return; // reported with a clearer message by the first request
  }
  if (url.protocol === 'http:' && !isPrivateHost(url.hostname) && !allowInsecureHttp) {
    throw new Error(messagesFor(lang).client.insecureHttp);
  }
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
  private readonly lang: Lang;

  constructor(options: N8nClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.lang = options.lang ?? 'en';
    assertSafeAddress(this.baseUrl, options.allowInsecureHttp === true, this.lang);
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

  /**
   * Redirects are followed here and not by the runtime, because the API key travels in a header
   * and the runtime would send it wherever the redirect points. A redirect is only followed when
   * it stays on the same host and does not drop from https to http.
   */
  private async request<T>(path: string, query: Record<string, string>): Promise<T> {
    const first = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(query)) {
      first.searchParams.set(key, value);
    }

    let target = first;
    for (let hops = 0; ; hops += 1) {
      const response = await this.fetchImpl(target, {
        headers: { 'X-N8N-API-KEY': this.apiKey, accept: 'application/json' },
        redirect: 'manual',
      });

      if (response.status >= 300 && response.status < 400) {
        target = this.followable(first, target, response, path, hops);
        continue;
      }

      if (!response.ok) {
        throw new N8nApiError(messagesFor(this.lang).client.apiStatus(response.status, path), response.status);
      }

      return (await response.json()) as T;
    }
  }

  private followable(first: URL, current: URL, response: Response, path: string, hops: number): URL {
    const status = response.status;
    const location = response.headers.get('location');
    if (location === null || hops >= MAX_REDIRECTS) {
      throw new N8nApiError(messagesFor(this.lang).client.tooManyRedirects(path), status);
    }

    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      throw new N8nApiError(messagesFor(this.lang).client.unusableRedirect(path), status);
    }

    if (next.host !== first.host) {
      throw new N8nApiError(messagesFor(this.lang).client.otherHost(path), status);
    }
    if (current.protocol === 'https:' && next.protocol === 'http:') {
      throw new N8nApiError(messagesFor(this.lang).client.httpsToHttp(path), status);
    }
    return next;
  }
}
