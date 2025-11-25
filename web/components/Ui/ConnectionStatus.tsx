// components/ui/ConnectionStatus.tsx

'use client';

import { useAutoReconnect } from '@/hooks/useAutoReconnect';
import { WifiOff, Wifi, RefreshCw, AlertCircle } from 'lucide-react';

interface ConnectionStatusProps {
  onReconnected?: () => void;
  onReconnectFailed?: () => void;
}

export function ConnectionStatus({ onReconnected, onReconnectFailed }: ConnectionStatusProps) {
  const {
    isOnline,
    isReconnecting,
    reconnectAttempts,
    maxAttempts,
    canRetry,
    manualRetry
  } = useAutoReconnect({
    onReconnected,
    onReconnectFailed
  });

  // 完全在線，不顯示任何內容
  if (isOnline && !isReconnecting && reconnectAttempts === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
        ${!isOnline ? 'bg-red-500' : isReconnecting ? 'bg-yellow-500' : 'bg-green-500'}
        text-black
      `}>
        {/* 圖示 */}
        {!isOnline ? (
          <WifiOff className="w-5 h-5" />
        ) : isReconnecting ? (
          <RefreshCw className="w-5 h-5 animate-spin" />
        ) : (
          <Wifi className="w-5 h-5" />
        )}

        {/* 訊息 */}
        <div className="flex flex-col">
          <span className="font-semibold">
            {!isOnline ? 'No Network Connection' : 
             isReconnecting ? 'Reconnecting...' : 
             'Connection Restored'}
          </span>
          
          {isReconnecting && (
            <span className="text-sm opacity-90">
              Attempt {reconnectAttempts} / {maxAttempts}
            </span>
          )}
          
          {!isOnline && !isReconnecting && (
            <span className="text-sm opacity-90">
              Some features may be unavailable
            </span>
          )}
        </div>

        {/* 手動重試按鈕 */}
        {!isOnline && canRetry && !isReconnecting && (
          <button
            onClick={manualRetry}
            className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
          >
            Retry
          </button>
        )}

        {/* 最大嘗試次數警告 */}
        {reconnectAttempts >= maxAttempts && (
          <div className="flex items-center gap-2 ml-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Cannot Connect</span>
          </div>
        )}
      </div>
    </div>
  );
}

