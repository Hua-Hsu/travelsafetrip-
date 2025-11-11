// ================================
// Week 6 Task 3: Online Status Tracker Hook
// hooks/useOnlineStatus.ts
// ================================

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UseOnlineStatusProps {
  groupId: string;
  deviceId: string;
  isActive: boolean; // 是否正在分享位置（非預覽模式）
}

/**
 * 自動追蹤並更新使用者的在線狀態
 * - 每 30 秒更新一次 last_seen
 * - 離開頁面時設定為離線
 * - 只在正在分享位置時追蹤
 */
export function useOnlineStatus({ groupId, deviceId, isActive }: UseOnlineStatusProps) {
  const intervalRef = useRef<number | undefined>(undefined);

  // 使用 useCallback 來穩定函數引用
  const setOnline = useCallback(async () => {
    if (!groupId || !deviceId) return;
    
    try {
      await supabase
        .from('group_members')
        .update({
          is_online: true,
          last_seen: new Date().toISOString()
        })
        .eq('group_id', groupId)
        .eq('device_id', deviceId);
    } catch (error) {
      console.error('Failed to set online status:', error);
    }
  }, [groupId, deviceId]);

  const setOffline = useCallback(async () => {
    if (!groupId || !deviceId) return;
    
    try {
      await supabase
        .from('group_members')
        .update({
          is_online: false,
          last_seen: new Date().toISOString()
        })
        .eq('group_id', groupId)
        .eq('device_id', deviceId);
    } catch (error) {
      console.error('Failed to set offline status:', error);
    }
  }, [groupId, deviceId]);

  const updateLastSeen = useCallback(async () => {
    if (!groupId || !deviceId) return;
    
    try {
      await supabase
        .from('group_members')
        .update({
          last_seen: new Date().toISOString()
        })
        .eq('group_id', groupId)
        .eq('device_id', deviceId);
    } catch (error) {
      console.error('Failed to update last_seen:', error);
    }
  }, [groupId, deviceId]);

  useEffect(() => {
    if (!groupId || !deviceId || !isActive) {
      // 如果不活躍，設定為離線
      if (groupId && deviceId) {
        setOffline();
      }
      return;
    }

    // 設定為在線
    setOnline();

    // 每 30 秒更新一次 last_seen
    intervalRef.current = window.setInterval(() => {
      updateLastSeen();
    }, 30000); // 30 seconds

    // 頁面可見性變化時更新狀態
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOffline();
      } else {
        setOnline();
      }
    };

    // 頁面關閉前設定為離線
    const handleBeforeUnload = () => {
      setOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setOffline();
    };
  }, [groupId, deviceId, isActive, setOnline, setOffline, updateLastSeen]);
}

