"use client";

import React, { useCallback, useMemo, useState, createContext, useContext } from 'react';
import { SignIn, SignInOptions } from '@farcaster/frame-core';
import { useAccount, useSignMessage } from 'wagmi';
import { getAddress, verifyMessage } from 'viem';
import { createAppClient, createWalletClient, viemConnector } from '@farcaster/auth-client';

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
  isConnectFlow: boolean;
  walletAddress?: string;
  onChannelCreated?: (url: string) => void;
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

  const appClient = createAppClient({
    relay: 'https://relay.farcaster.xyz',
    ethereum: viemConnector(),
  });


  const signIn = useCallback(async (params: SignInParams) => {
    if (!address && !params.walletAddress) throw new Error('No wallet connected');
    
    const { domain, uri, options, currentUser, isConnectFlow, onChannelCreated, walletAddress } = params;
    
    console.log("Frame host received params for signIn:", params);
    
    const effectiveAddress = walletAddress || (address as string) || '0x0000000000000000000000000000000000000000';
    
    const { siweMessage, message } = walletClient.buildSignInMessage({
      address: getAddress(effectiveAddress),
      fid: currentUser.fid,
      uri,
      domain,
      nonce: options.nonce,
    });

    if (isConnectFlow) {
    // Create a Farcaster Auth relay channel.
    // Returns a secret token identifying the channel, and a URI to display to the end user as a link or QR code.
      const channel = await appClient.createChannel({
        siweUri: uri,
        domain: domain,
        nonce: options.nonce,
        notBefore: options.notBefore,
        expirationTime: options.expirationTime,
      });
      console.log("created channel for connect flow: ", channel);

      if (onChannelCreated) {
        onChannelCreated(channel.data.url);
      }

      console.log('channel url: ', channel.data.url);
      let signature: `0x${string}` | undefined;
      let message: string | undefined;
      
      const status = await appClient.watchStatus({
        channelToken: channel.data.channelToken,
        timeout: 60_000,
        interval: 1_000,
        onResponse: ({ response, data }) => {
          console.log('Response code:', response.status);
          console.log('Status data:', data);
          if (data.state === 'completed' && data.signature) {
            signature = data.signature as `0x${string}`;
            message = data.message;
            console.log("completed polling: ", signature);
            console.log("completed polling message: ", message);

            return true; // Stop polling
          }
          return false;
        },
      });

      console.log("connected message: ", message);
      console.log('SIWE message:', siweMessage);

      if (!signature || !message) {
        throw new Error('No signature or message received');
      }

      console.log("did it get here before success?", signature);


      // const { success } = await appClient.verifySignInMessage({
      //   nonce: options.nonce,
      //   domain: domain,
      //   message: message,
      //   signature: signature,
      // });

      // console.log("did it get here after success?", success);

      // if (!success) {
      //   throw new Error('Failed to verify signature');
      // }

      return {
        message: message || "",
        signature: signature,
      };

    } else {
      // sign in flow for accounts created natively on the frame host
      try {
        const signature = await signMessageAsync({ message });
        console.log('Signature:', signature);

        // Verify the signature matches the message and address
        const isValid = await verifyMessage({
          message,
          signature,
          address: getAddress(address as string),
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