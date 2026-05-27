'use client';

import { SWRConfig } from 'swr';
import React from 'react';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        dedupingInterval: 5000,
        fetcher: (resource, init) => fetch(resource, init).then(res => res.json()),
      }}
    >
      {children}
    </SWRConfig>
  );
}
