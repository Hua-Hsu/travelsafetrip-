// hooks/useAutoReconnect.ts

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { supabase } from '@/lib/supabase';

interface UseAutoReconnectOptions {
  maxAttempts?: number;
  baseDelay?: number; // 基礎延遲時間（毫秒）
  maxDelay?: number;  // 最大延遲時間（毫秒）
  onReconnected?: () => void;
  onReconnectFailed?: () => void;
}

export function useAutoReconnect(options: UseAutoReconnectOptions = {}) {
  const {
    maxAttempts = 5,
    baseDelay = 1000,
    maxDelay = 30000,
    onReconnected,
    onReconnectFailed
  } = options;

  const {
    isOnline,
    isReconnecting,
    reconnectAttempts,
    setReconnecting,
    incrementReconnectAttempts,
    resetReconnectAttempts
  } = useNetworkStatus();

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReconnectedRef = useRef(false);

  /**
   * 計算重連延遲（指數退避）
   */
  const calculateDelay = useCallback((attempt: number): number => {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay;
  }, [baseDelay, maxDelay]);

  /**
   * 測試 Supabase 連線
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase.from('groups').select('id').limit(1);
      return !error;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }, [supabase]);

  /**
   * 執行重連
   */
  const attemptReconnect = useCallback(async () => {
    if (!isOnline) {
      console.log('Network offline, waiting for network...');
      return;
    }

    if (reconnectAttempts >= maxAttempts) {
      console.log('Max reconnect attempts reached');
      setReconnecting(false);
      onReconnectFailed?.();
      return;
    }

    console.log(`Reconnect attempt ${reconnectAttempts + 1}/${maxAttempts}...`);
    setReconnecting(true);
    incrementReconnectAttempts();

    const isConnected = await testConnection();

    if (isConnected) {
      console.log('✅ Reconnected successfully!');
      setReconnecting(false);
      resetReconnectAttempts();
      hasReconnectedRef.current = true;
      onReconnected?.();
    } else {
      console.log('❌ Reconnect failed, retrying...');
      const delay = calculateDelay(reconnectAttempts);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        attemptReconnect();
      }, delay);
    }
  }, [
    isOnline,
    reconnectAttempts,
    maxAttempts,
    testConnection,
    setReconnecting,
    incrementReconnectAttempts,
    resetReconnectAttempts,
    calculateDelay,
    onReconnected,
    onReconnectFailed
  ]);

  /**
   * 手動重試
   */
  const manualRetry = useCallback(() => {
    console.log('Manual retry triggered');
    resetReconnectAttempts();
    attemptReconnect();
  }, [resetReconnectAttempts, attemptReconnect]);

  /**
   * 監聽網路狀態變化
   */
  useEffect(() => {
    if (isOnline && !isReconnecting && reconnectAttempts === 0) {
      // 網路恢復且未在重連中，嘗試重連
      if (!hasReconnectedRef.current) {
        attemptReconnect();
      }
    } else if (!isOnline) {
      // 網路斷線，重置狀態
      hasReconnectedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    }
  }, [isOnline, isReconnecting, reconnectAttempts, attemptReconnect]);

  /**
   * 清理
   */
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    isOnline,
    isReconnecting,
    reconnectAttempts,
    maxAttempts,
    canRetry: reconnectAttempts < maxAttempts,
    manualRetry
  };
}

