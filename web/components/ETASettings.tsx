'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ETASettingsProps {
  groupId: string;
  deviceId: string;
  deviceName: string;
  meetupPoint?: {
    latitude: number;
    longitude: number;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  distanceToMeetup?: number;
}

export default function ETASettings({
  groupId,
  deviceId,
  deviceName,
  meetupPoint,
  currentLocation,
  distanceToMeetup
}: ETASettingsProps) {
  const [etaTime, setEtaTime] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // 根據距離計算預估時間
  const calculateETA = (minutes: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    return now.toISOString().slice(0, 16);
  };

  // 根據距離自動計算
  const autoCalculateETA = () => {
    if (!distanceToMeetup) return;
    
    // 假設平均速度 50 km/h
    const avgSpeedKmh = 50;
    const timeMinutes = (distanceToMeetup / avgSpeedKmh) * 60;
    
    setEtaTime(calculateETA(Math.round(timeMinutes)));
  };

  // 儲存 ETA 並發送訊息到聊天室
  const handleSetETA = async () => {
    if (!etaTime) {
      alert('Please select an arrival time');
      return;
    }

    setLoading(true);

    try {
      const arrivalTime = new Date(etaTime);
      const now = new Date();
      const minutesUntilArrival = Math.round((arrivalTime.getTime() - now.getTime()) / 60000);

      // 1. 更新資料庫中的 ETA
      const { error: updateError } = await supabase
        .from('group_members')
        .update({
          estimated_arrival_time: arrivalTime.toISOString()
        })
        .eq('group_id', groupId)
        .eq('device_id', deviceId);

      if (updateError) throw updateError;

      // 2. 發送 ETA 訊息到聊天室
      let message = `⏰ ${deviceName}: I'll arrive at ${arrivalTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })} (in ~${minutesUntilArrival} mins)`;

      if (currentLocation && meetupPoint) {
        message += `\n📍 Current distance: ${distanceToMeetup?.toFixed(2)} km`;
      }

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          device_id: deviceId,
          device_name: deviceName,
          content: message,
          created_at: new Date().toISOString()
        });

      if (messageError) throw messageError;

      // 顯示成功提示
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

      // 清空輸入
      setEtaTime('');
    } catch (error) {
      console.error('Failed to set ETA:', error);
      alert('Failed to set arrival time');
    } finally {
      setLoading(false);
    }
  };

  // 清除 ETA
  const handleClearETA = async () => {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({
          estimated_arrival_time: null
        })
        .eq('group_id', groupId)
        .eq('device_id', deviceId);

      if (error) throw error;

      setEtaTime('');
      alert('Arrival time cleared');
    } catch (error) {
      console.error('Failed to clear ETA:', error);
      alert('Failed to clear arrival time');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-900">
        ⏰ Estimated Arrival Time
      </h3>

      {/* 成功提示 */}
      {showSuccess && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 font-semibold">
            ✅ Arrival time shared to chat!
          </p>
        </div>
      )}

      {/* 只有當有集合點時才顯示 */}
      {meetupPoint ? (
        <div>
          {/* 快速選擇按鈕 */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => setEtaTime(calculateETA(15))}
              className="px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded text-sm font-medium text-blue-700"
            >
              15m
            </button>
            <button
              onClick={() => setEtaTime(calculateETA(30))}
              className="px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded text-sm font-medium text-blue-700"
            >
              30m
            </button>
            <button
              onClick={() => setEtaTime(calculateETA(60))}
              className="px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded text-sm font-medium text-blue-700"
            >
              1h
            </button>
            <button
              onClick={autoCalculateETA}
              disabled={!distanceToMeetup}
              className="px-3 py-2 bg-purple-100 hover:bg-purple-200 disabled:bg-gray-100 disabled:text-gray-400 rounded text-sm font-medium text-purple-700"
              title="Calculate based on distance"
            >
              Auto
            </button>
          </div>

          {/* 自訂時間選擇器 */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or set custom time:
            </label>
            <input
              type="datetime-local"
              value={etaTime}
              onChange={(e) => setEtaTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 動作按鈕 */}
          <div className="flex gap-2">
            <button
              onClick={handleSetETA}
              disabled={!etaTime || loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg transition-colors font-semibold"
            >
              {loading ? 'Setting...' : 'Share ETA'}
            </button>
            {etaTime && (
              <button
                onClick={handleClearETA}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* 說明 */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              💡 Your estimated arrival time will be shared in the chat and visible to all members.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-sm text-gray-600">
            Set a meet up point first to share your ETA
          </p>
        </div>
      )}
    </div>
  );
}

