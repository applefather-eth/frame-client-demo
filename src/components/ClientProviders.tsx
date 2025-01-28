"use client";

import { WagmiProvider, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { createPublicClient, http } from 'viem';
import { SignInProvider } from '../contexts/SignInProvider';
import App from '../app/App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http()
  },
});

const queryClient = new QueryClient();

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SignInProvider>
          <App>
            {children}
          </App>
        </SignInProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 