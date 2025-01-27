import { useEffect } from 'react';

export function useMessageHandler(expectedSourceUrl: string) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('event', event.origin);
      if (event.origin !== expectedSourceUrl) {
        return;
      }

      // Log details about the event
      console.group('Intercepted Message');
      console.log('Origin:', event.origin);
      console.log('Source:', event.source);
      console.log('Data:', event.data);
      console.groupEnd();

      // Optionally handle specific message types
      if (event.data && event.data.type) {
        switch (event.data.type) {
          case 'GET':
            console.log('GET request intercepted:', event.data);
            break;
          case 'APPLY':
            console.log('APPLY request intercepted:', event.data);
            break;
          default:
            console.warn('Unhandled message type:', event.data.type);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [expectedSourceUrl]);
} 