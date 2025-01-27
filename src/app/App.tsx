"use client";

import React, { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config';

export default function App({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient()
  
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  );
} 