'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useReplaceParams(): (params: URLSearchParams) => void {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (params) => {
      const query = params.toString();
      router.replace(query === '' ? pathname : `${pathname}?${query}`, { scroll: false });
    },
    [router, pathname],
  );
}
