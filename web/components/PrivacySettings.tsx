'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface PrivacySettingsProps {
  groupId: string;
  deviceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacySettings({ 
  groupId, 
  deviceId, 
  isOpen, 
  onClose 
}: PrivacySettingsProps) {
  const [isSharingLocation, setIsSharingLocation] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [shareUntil, setShareUntil] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 載入當前設定
  useEffect(() => {
    if (isOpen) {
      loadCurrentSettings();
    }
  }, [isOpen, groupId, deviceId]);

  const loadCurrentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('is_sharing_location, preview_mode, location_share_until')
        .eq('group_id', groupId)
        .eq('device_id', deviceId)
        .single();

      if (error) throw error;

      if (data) {
        setIsSharingLocation(data.is_sharing_location ?? true);
        setPreviewMode(data.preview_mode ?? false);
        if (data.location_share_until) {
          setShareUntil(new Date(data.location_share_until).toISOString().slice(0, 16));
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      const updateData: any = {
        is_sharing_location: isSharingLocation,
        preview_mode: previewMode,
      };

      // 如果設定了分享時間限制
      if (shareUntil) {
        updateData.location_share_until = new Date(shareUntil).toISOString();
      } else {
        updateData.location_share_until = null;
      }

      // 預覽模式時自動關閉位置分享
      if (previewMode) {
        updateData.is_sharing_location = false;
      }

      const { error } = await supabase
        .from('group_members')
        .update(updateData)
        .eq('group_id', groupId)
        .eq('device_id', deviceId);

      if (error) throw error;

      setMessage('✅ Settings saved successfully!');
      
      // 2 秒後關閉對話框
      setTimeout(() => {
        onClose();
        setMessage('');
      }, 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('❌ Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewModeToggle = (enabled: boolean) => {
    setPreviewMode(enabled);
    if (enabled) {
      // 啟用預覽模式時，自動停止分享位置
      setIsSharingLocation(false);
    }
  };

  const handleSharingToggle = (enabled: boolean) => {
    setIsSharingLocation(enabled);
    if (enabled) {
      // 啟用位置分享時，自動關閉預覽模式
      setPreviewMode(false);
    }
  };

  const setQuickDuration = (hours: number) => {
    const now = new Date();
    now.setHours(now.getHours() + hours);
    setShareUntil(now.toISOString().slice(0, 16));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* 對話框 */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-50 w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Privacy Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* 預覽模式 */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  👁️ Preview Mode
                </h3>
                <p className="text-sm text-gray-600">
                  View the map without sharing your location
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={previewMode}
                  onChange={(e) => handlePreviewModeToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* 位置分享 */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  📍 Share My Location
                </h3>
                <p className="text-sm text-gray-600">
                  Let others see your real-time location
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={isSharingLocation}
                  onChange={(e) => handleSharingToggle(e.target.checked)}
                  disabled={previewMode}
                  className="sr-only peer disabled:opacity-50"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:opacity-50"></div>
              </label>
            </div>
          </div>

          {/* 分享時間限制 */}
          {isSharingLocation && !previewMode && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-gray-900 mb-3">
                ⏰ Share Duration (Optional)
              </h3>
              
              {/* 快速選擇按鈕 */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <button
                  onClick={() => setQuickDuration(1)}
                  className="px-3 py-2 bg-purple-100 hover:bg-purple-200 rounded text-sm font-medium text-purple-700"
                >
                  1h
                </button>
                <button
                  onClick={() => setQuickDuration(3)}
                  className="px-3 py-2 bg-purple-100 hover:bg-purple-200 rounded text-sm font-medium text-purple-700"
                >
                  3h
                </button>
                <button
                  onClick={() => setQuickDuration(6)}
                  className="px-3 py-2 bg-purple-100 hover:bg-purple-200 rounded text-sm font-medium text-purple-700"
                >
                  6h
                </button>
                <button
                  onClick={() => setQuickDuration(12)}
                  className="px-3 py-2 bg-purple-100 hover:bg-purple-200 rounded text-sm font-medium text-purple-700"
                >
                  12h
                </button>
              </div>

              {/* 自訂時間 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or set custom time:
                </label>
                <input
                  type="datetime-local"
                  value={shareUntil}
                  onChange={(e) => setShareUntil(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {shareUntil && (
                  <button
                    onClick={() => setShareUntil('')}
                    className="mt-2 text-sm text-purple-600 hover:text-purple-700"
                  >
                    Clear time limit
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 提示訊息 */}
          {message && (
            <div className={`p-3 rounded-lg text-center ${
              message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {/* 說明文字 */}
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
            <p className="font-semibold mb-1">ℹ️ How it works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Preview Mode:</strong> See map without sharing location</li>
              <li><strong>Share Location:</strong> Others can see your real-time position</li>
              <li><strong>Time Limit:</strong> Auto-stop sharing after set time</li>
            </ul>
          </div>

          {/* 儲存按鈕 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

