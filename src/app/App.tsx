"use client";

import React, { ReactNode } from 'react';
import { useAccount, WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config';
import { WalletOptions } from './wallet-options';
import { Account } from './account';

function ConnectWallet() {
    const { isConnected } = useAccount()
    if (isConnected) return <Account />
    return <WalletOptions />
  }
export default function App({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient()
  
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <ConnectWallet />
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  );
} 