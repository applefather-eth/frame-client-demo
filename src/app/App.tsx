"use client";

import React, { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { config } from './config';

export default function App({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      {children}
    </WagmiProvider>
  );
} 