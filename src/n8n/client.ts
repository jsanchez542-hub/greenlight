import { messagesFor, type Lang } from '../i18n/index.js';
import { isPrivateHost } from './network.js';
import { isRecord, type JsonRecord } from './shape.js';
import type { Execution, ExecutionDetail, Workflow, WorkflowDetail } from './types.js';

const PAGE_SIZE = 250;
// Far more than any instance holds: a list that gets this far is one that is not going to end.
const MAX_PAGES = 400;
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

/** A loop and not a regular expression: one that backtracks over a long run of slashes is quadratic. */
export function withoutTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end -= 1;
  }
  return value.slice(0, end);
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
  nextCursor?: unknown;
}

function isPage(body: unknown): body is Page<JsonRecord> {
  return isRecord(body) && Array.isArray(body['data']) && body['data'].every(isRecord);
}

function nextCursorOf(page: Page<unknown>): string | undefined {
  return typeof page.nextCursor === 'string' && page.nextCursor !== '' ? page.nextCursor : undefined;
}

/**
 * A body that is not JSON, such as the page of a proxy, reads as nothing, which no caller takes
 * for an answer of the API. Anything else that goes wrong while it is read is a failure of the
 * network and is thrown as it is.
 */
async function jsonOf(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined;
    }
    throw error;
  }
}

export class N8nClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly lang: Lang;

  constructor(options: N8nClientOptions) {
    this.baseUrl = withoutTrailingSlashes(options.baseUrl);
    this.lang = options.lang ?? 'en';
    assertSafeAddress(this.baseUrl, options.allowInsecureHttp === true, this.lang);
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  async listWorkflows(): Promise<Workflow[]> {
    const workflows = await this.collect<Workflow>('/api/v1/workflows');
    // The id goes on as text into keys, addresses and the result, so one that arrives as a
    // number becomes its text here and nothing after this has to wonder.
    return workflows.map((workflow) => ({ ...workflow, id: String(workflow.id) }));
  }

  listExecutions(options: ListExecutionsOptions = {}): Promise<Execution[]> {
    const query: Record<string, string> = { includeData: 'false' };
    if (options.workflowId !== undefined) {
      query['workflowId'] = options.workflowId;
    }
    return this.collect<Execution>('/api/v1/executions', query, options.limit);
  }

  getWorkflow(id: string): Promise<WorkflowDetail> {
    return this.one<WorkflowDetail>(`/api/v1/workflows/${encodeURIComponent(id)}`, {});
  }

  getExecution(id: string): Promise<ExecutionDetail> {
    return this.one<ExecutionDetail>(`/api/v1/executions/${encodeURIComponent(id)}`, { includeData: 'true' });
  }

  private one<T>(path: string, query: Record<string, string>): Promise<T> {
    return this.request<T>(path, query, (body) => (isRecord(body) ? null : messagesFor(this.lang).client.notTheApi(path)));
  }

  private async collect<T>(
    path: string,
    query: Record<string, string> = {},
    limit?: number,
  ): Promise<T[]> {
    const t = messagesFor(this.lang).client;
    const items: T[] = [];
    const cursorsGiven = new Set<string>();
    let cursor: string | undefined;

    // The instance decides when a list ends, and one that never did would be read for ever. So a
    // cursor that was already given, an empty page that says there is more and a list longer than
    // any real one all end it with a reason.
    const problemWith = (body: unknown): string | null => {
      if (!isPage(body)) {
        return t.notTheApi(path);
      }
      const next = nextCursorOf(body);
      if (next === undefined) {
        return null;
      }
      if (body.data.length === 0 || cursorsGiven.has(next)) {
        return t.listDoesNotEnd(path);
      }
      return cursorsGiven.size + 1 >= MAX_PAGES ? t.listTooLong(path, MAX_PAGES * PAGE_SIZE) : null;
    };

    do {
      const remaining = limit === undefined ? PAGE_SIZE : limit - items.length;
      const page = await this.request<Page<T>>(
        path,
        {
          ...query,
          limit: String(Math.min(PAGE_SIZE, remaining)),
          ...(cursor === undefined ? {} : { cursor }),
        },
        problemWith,
      );

      items.push(...page.data);
      cursor = nextCursorOf(page);
      if (cursor !== undefined) {
        cursorsGiven.add(cursor);
      }
    } while (cursor !== undefined && (limit === undefined || items.length < limit));

    return limit === undefined ? items : items.slice(0, limit);
  }

  /**
   * Redirects are followed here and not by the runtime, because the API key travels in a header
   * and the runtime would send it wherever the redirect points. A redirect is only followed when
   * it stays on the same host and does not drop from https to http.
   *
   * `problemWith` says what is wrong with a body the caller cannot read, or null. The address can
   * belong to something that is not n8n and still answer with a success, and that must end the
   * scan with a reason: read as an empty list it would pass for an instance with nothing wrong.
   */
  private async request<T>(
    path: string,
    query: Record<string, string>,
    problemWith: (body: unknown) => string | null,
  ): Promise<T> {
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

      const body = await jsonOf(response);
      const problem = problemWith(body);
      if (problem !== null) {
        throw new N8nApiError(problem, response.status);
      }
      return body as T;
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
