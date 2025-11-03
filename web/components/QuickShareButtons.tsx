// ================================
// Week 5: 快速分享狀態按鈕
// components/QuickShareButtons.tsx
// ================================

'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LocationData } from '@/lib/locationUtils';

interface QuickShareButtonsProps {
  groupId: string;
  deviceId: string;
  deviceName: string;
  currentLocation?: LocationData;
  meetupPoint?: { latitude: number; longitude: number };
  onShareSuccess?: () => void;
}

interface ShareButton {
  emoji: string;
  label: string;
  message: string;
  color: string;
  hoverColor: string;
}

export default function QuickShareButtons({
  groupId,
  deviceId,
  deviceName,
  currentLocation,
  meetupPoint,
  onShareSuccess
}: QuickShareButtonsProps) {
  const [sending, setSending] = useState(false);
  const [lastShared, setLastShared] = useState<string | null>(null);

  const shareButtons: ShareButton[] = [
    {
      emoji: '🚶',
      label: 'On My Way',
      message: '🚶 I\'m on my way!',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      emoji: '✅',
      label: 'Arrived',
      message: '✅ I\'ve arrived at the meetup point!',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      emoji: '⏰',
      label: 'Almost There',
      message: '⏰ Almost there! Just a few more minutes.',
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600'
    },
    {
      emoji: '📍',
      label: 'Share Location',
      message: '📍 Here\'s my current location',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    }
  ];

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleQuickShare = async (button: ShareButton) => {
    if (sending) return;

    setSending(true);
    setLastShared(null);

    try {
      let messageContent = button.message;

      // 如果有當前位置，附加位置資訊
      if (currentLocation) {
        const locationInfo = `\n📍 Location: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`;
        
        // 如果有集合點，計算距離
        if (meetupPoint) {
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            meetupPoint.latitude,
            meetupPoint.longitude
          );
          messageContent += `${locationInfo}\n📏 Distance to meetup: ${distance.toFixed(2)} km`;
        } else {
          messageContent += locationInfo;
        }

        // 加上 Google Maps 連結
        const mapsUrl = `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
        messageContent += `\n🗺️ View on map: ${mapsUrl}`;
      }

      // 發送訊息到聊天室
      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          device_id: deviceId,
          device_name: deviceName,
          content: messageContent,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setLastShared(button.label);
      onShareSuccess?.();

      // 3 秒後清除成功提示
      setTimeout(() => {
        setLastShared(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to share status:', error);
      alert('Failed to share status. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-900">Quick Share</h3>
      
      <p className="text-sm text-gray-600 mb-4">
        Share your status with the group instantly
      </p>

      {/* 成功提示 */}
      {lastShared && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
          <p className="text-sm text-green-700 font-semibold">
            ✅ "{lastShared}" shared successfully!
          </p>
        </div>
      )}

      {/* 如果沒有位置追蹤，顯示提示 */}
      {!currentLocation && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            💡 Start location tracking to share your exact location
          </p>
        </div>
      )}

      {/* 快速分享按鈕 */}
      <div className="grid grid-cols-2 gap-2">
        {shareButtons.map((button, index) => (
          <button
            key={index}
            onClick={() => handleQuickShare(button)}
            disabled={sending}
            className={`${button.color} ${button.hoverColor} text-white py-3 px-4 rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1`}
          >
            <span className="text-2xl">{button.emoji}</span>
            <span className="text-xs">{button.label}</span>
          </button>
        ))}
      </div>

      {/* 說明文字 */}
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500">
          💬 Messages will be sent to the group chat with your location info
        </p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

