"use client";

import React, { useCallback, useMemo, useState, createContext, useContext } from 'react';
import { SignIn, SignInOptions } from '@farcaster/frame-core';
import { useAccount, useSignMessage } from 'wagmi';
import { getAddress, verifyMessage } from 'viem';
import { createWalletClient, viemConnector } from '@farcaster/auth-client';

const walletClient = createWalletClient({
  relay: 'https://relay.farcaster.xyz',
  ethereum: viemConnector(),
});

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
  const walletClient = useMemo(() => createWalletClient({
    relay: 'https://relay.farcaster.xyz',
    ethereum: viemConnector(),
  }), []);

  const signIn = useCallback(async (params: SignInParams) => {
    if (!address) throw new Error('No wallet connected');
    
    const { domain, uri, options, currentUser } = params;
    
    console.log("Frame host received params for signIn:", params);
    
    // Build the SIWE message directly
    const { siweMessage, message } = walletClient.buildSignInMessage({
      address: getAddress(address),
      fid: currentUser.fid,
      uri,
      domain,
      nonce: options.nonce,
    });

    console.log('message:', message);
    console.log('SIWE message:', siweMessage);

    try {
        const signature = await signMessageAsync({ message });
      console.log('Signature:', signature);

      // Verify the signature matches the message and address
      const isValid = await verifyMessage({
        message,
        signature,
        address: getAddress(address),
      });

      if (!isValid) {
        throw new Error('Invalid signature');
      }

      return {
        message,
        signature,
      };
    } catch (error) {
      console.error('SIWF failed:', error);
      throw error;
    }
  }, [address, signMessageAsync, walletClient]);

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