"use client";

import Image from "next/image";
import styles from "./page.module.css";
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  AddFrame,
  Context,
  createIframeEndpoint,
  FrameClientEvent,
  FrameHost,
  HostEndpoint,
  useExposeToEndpoint,
  ViewProfile,
  ReadyOptions,
} from '@farcaster/frame-host';
import { useMessageHandler } from '../hooks/useMessageHandler';


const DEFAULT_FRAME_URL = 'https://frames-v2-demo-lilac.vercel.app/';

export default function Home() {
  const [frameUrl, setFrameUrl] = useState<string | null>(DEFAULT_FRAME_URL);
  const [endpoint, setEndpoint] = useState<HostEndpoint | undefined>(undefined);
  const [debug] = useState(true);
  const [frameVisible, setFrameVisible] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  

  useEffect(() => {
    if(frameVisible){
      

      iframeRef!.current!.onload = () => {
        const newEndpoint = createIframeEndpoint({
          iframe: iframeRef.current!,
          targetOrigin: new URL(DEFAULT_FRAME_URL).origin,
          debug,
        });
        console.log('newEndpoint', newEndpoint);
        if (newEndpoint) {
          setEndpoint(newEndpoint);
          newEndpoint.emit?.({
            event: 'frame_added',
          });
        } else {
          console.error('newEndpoint is undefined or invalid');
        }
        handleAddFrame();
      };
    }
  }, [frameVisible]);

  const ready = useCallback(async () => {
    if (frameVisible && endpoint) {
      return true;
    }
    return false;
  }, [frameVisible, endpoint]);

  const currentUser = {
    fid: 1032478023498,
    username: 'test',
    displayName: 'test',
    pfp: { url: 'https://picsum.photos/200/300' },
    profile: { location: 'test' },
  };

  const onClose = () => {
    console.log('onClose');
  };
  
  const handleReady = (options?: Partial<ReadyOptions>) => {
    console.log('ready', options);
  };

  const handleSetPrimaryButton = () => {
    console.log('setPrimaryButton');
  };

  const handleProviderRequest = async ({ method, params }: { method: string; params?: any[] }) => {
    console.log('providerRequest', method, params);
    return [] as const; // Return empty array for now as placeholder
  };

  const handleSignIn = () => {
    console.log('signIn');
  };

  const handleOpenUrl = (url: string) => {
    console.log('openUrl', url);
  };

  const handleViewProfile = () => {
    console.log('viewProfile');
  };

  const emit = useMemo(() => endpoint?.emit, [endpoint?.emit]);

  const handleAddFrame = useCallback(async () => {
    emit?.({
        event: 'frame_added',
      });
      console.log('frame_added');
      return Promise.resolve<AddFrame.AddFrameResult>({});

  }, [endpoint, emit]);

  const sdk = useMemo<Omit<FrameHost, 'ethProviderRequestV2'>>(
    () => ({
      context: {
        user: {
          fid: currentUser.fid,
          username: currentUser.username,
          displayName: currentUser.displayName,
          pfpUrl: currentUser.pfp?.url,
        },
        client: {
          clientFid: 9152,
          added: true,
        },
      },
      close: onClose,
      ready: ready,
      setPrimaryButton: handleSetPrimaryButton,
      ethProviderRequest: async () => {
        throw new Error('not implemented');
      },
      signIn: async () => ({ 
        message: 'Test message',
        signature: '0x123',
      }),
      openUrl: handleOpenUrl,
      addFrame: handleAddFrame,
      viewProfile: async () => {},
      eip6963RequestProvider: () => {
      },
    }),[frameVisible]
  );
  useExposeToEndpoint({
    endpoint,
    sdk,
    frameOrigin: '*',
    debug,
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.urlContainer}>
          <input 
            type="text" 
            value={frameUrl || ''}
            onChange={(e) => {
              setFrameUrl(e.target.value);
            }}
            placeholder="Enter frame URL" 
            className={`${styles.urlInput} ${styles.customInput}`}
          />
          
          {!frameVisible && (
            <button 
              onClick={() => setFrameVisible(true)}
              className={styles.loadFrameButton}
            >
              Load Frame
            </button>
          )}
          {frameVisible && (
            <button 
              onClick={() => setFrameVisible(false)}
              className={styles.loadFrameButton}
            >
              Close Frame
            </button>
          )}
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.frameContainer}>
          <div>
            <h3>Frame Content</h3>
          </div>
          {frameVisible && (
            <div className={styles.frameWrapper}>
              <h4>Frame Inner</h4>
              <iframe
                ref={iframeRef}
                src={frameUrl || ''}
                width="424"
                height="695"
                className={styles.frameIframe}
                allow="microphone; camera; clipboard-write; web-share"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
          )}
        </div>

      </main>

      <footer className={styles.footer}>
        <div className={styles.interactionButtons}>
          <button onClick={handleAddFrame} className={styles.interactionButton}>
            Ready
          </button>
        </div>
      </footer>
    </div>
  );
}
