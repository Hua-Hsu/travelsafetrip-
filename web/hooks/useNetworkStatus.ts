// hooks/useNetworkStatus.ts

'use client';

import { useState, useEffect, useCallback } from 'react';
import { NetworkStatus } from '@/types/offline';

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isReconnecting: false,
    lastConnected: null,
    reconnectAttempts: 0
  });

  useEffect(() => {
    // 初始化時記錄連線時間
    if (navigator.onLine) {
      setNetworkStatus(prev => ({
        ...prev,
        lastConnected: new Date().toISOString()
      }));
    }

    const handleOnline = () => {
      console.log('Network: Online');
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: true,
        isReconnecting: false,
        lastConnected: new Date().toISOString(),
        reconnectAttempts: 0
      }));
    };

    const handleOffline = () => {
      console.log('Network: Offline');
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false,
        isReconnecting: false
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setReconnecting = useCallback((isReconnecting: boolean) => {
    setNetworkStatus(prev => ({
      ...prev,
      isReconnecting
    }));
  }, []);

  const incrementReconnectAttempts = useCallback(() => {
    setNetworkStatus(prev => ({
      ...prev,
      reconnectAttempts: prev.reconnectAttempts + 1
    }));
  }, []);

  const resetReconnectAttempts = useCallback(() => {
    setNetworkStatus(prev => ({
      ...prev,
      reconnectAttempts: 0
    }));
  }, []);

  return {
    ...networkStatus,
    setReconnecting,
    incrementReconnectAttempts,
    resetReconnectAttempts
  };
}

