export interface SyntheticRequest {
  method: string;
  path: string;
  authorised: boolean;
}

export interface SyntheticServer {
  url: string;
  requests: SyntheticRequest[];
  close(): Promise<void>;
}

export function startSyntheticServer(options: { key: string; now?: Date; port?: number }): Promise<SyntheticServer>;
