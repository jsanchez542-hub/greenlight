'use client';

import { createContext, useContext } from 'react';
import type { FailureCode } from './failure';
import type { UpdateNotice, UpdateState } from './update-notice';

export type ChoicePhase = 'idle' | 'saving' | 'saved' | 'failed';

export interface UpdatesApi {
  state: UpdateState | null;
  notice: UpdateNotice | null;
  dismiss: () => void;
  choose: (enabled: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  phase: ChoicePhase;
  problem: { code: FailureCode; seconds: number | null } | null;
  overridden: boolean;
}

const INACTIVE: UpdatesApi = {
  state: null,
  notice: null,
  dismiss: () => undefined,
  choose: async () => undefined,
  refresh: async () => undefined,
  phase: 'idle',
  problem: null,
  overridden: false,
};

export const UpdatesContext = createContext<UpdatesApi>(INACTIVE);

export function useUpdates(): UpdatesApi {
  return useContext(UpdatesContext);
}
