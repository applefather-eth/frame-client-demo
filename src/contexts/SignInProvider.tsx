"use client";

import React, { useCallback, useMemo, useState, createContext, useContext } from 'react';
import { SignIn, SignInOptions } from '@farcaster/frame-core';
import { useAccount, useSignMessage } from 'wagmi';
import { getAddress } from 'viem';

export type User = {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
};

type SignInParams = {
  name?: string;
  domain: string;
  uri: string;
  options: SignInOptions;
  renderInPortal?: boolean;
  currentUser: User;
};

export type SignInContextValue = {
  signIn: (params: SignInParams) => Promise<SignIn.SignInResult>;
};

const SignInContext = createContext<SignInContextValue>({
  signIn: async () => {
    throw new Error('Must be called in SignInContext provider');
  },
});

type SignInProviderProps = {
  children: React.ReactNode;
};

export const useSignIn = () => useContext(SignInContext);

export const SignInProvider: React.FC<SignInProviderProps> = ({ children }) => {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const signIn = useCallback(async (params: SignInParams) => {
    if (!address) throw new Error('No wallet connected');
    
    const { domain, uri, options, currentUser } = params;
    
    // Create SIWE message according to FIP-11 spec
    const message = [
      `${domain} wants you to sign in with your Ethereum account:`,
      address,
      '',
      'Farcaster Auth',
      '',
      `URI: ${uri}`,
      'Version: 1',
      'Chain ID: 10',
      `Nonce: ${options.nonce || Math.random().toString(36).slice(2)}`,
      `Issued At: ${new Date().toISOString()}`,
      options.expirationTime ? `Expiration Time: ${new Date(options.expirationTime).toISOString()}` : '',
      options.notBefore ? `Not Before: ${new Date(options.notBefore).toISOString()}` : '',
      '',
      'Resources:',
      `- farcaster://fids/${currentUser.fid}`,
    ].filter(Boolean).join('\n');

    console.log('Signing SIWF message:', message);
    try {
      const signature = await signMessageAsync({ message });

      return {
        message,
        signature,
        fid: currentUser.fid,
      };
    } catch (error) {
      console.error('SIWF failed:', error);
      throw error;
    }
  }, [address, signMessageAsync]);

  const contextValue = useMemo(
    () => ({
      signIn,
    }),
    [signIn],
  );

  return (
    <SignInContext.Provider value={contextValue}>
      {children}
    </SignInContext.Provider>
  );
}; 