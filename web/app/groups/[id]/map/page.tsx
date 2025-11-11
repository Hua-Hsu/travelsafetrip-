// ================================
// Week 6 Task 1+2+3: 群組地圖頁面 - 完整版
// app/groups/[id]/map/page.tsx
// ================================

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MapView from '@/components/MapView';
import LocationTracker from '@/components/LocationTracker';
import MemberList from '@/components/MemberList';
import TutorialOverlay from '@/components/TutorialOverlay';
import QuickShareButtons from '@/components/QuickShareButtons';
import PrivacySettings from '@/components/PrivacySettings';
import ETASettings from '@/components/ETASettings';
import { useOnlineStatus } from '@/hooks/useOnlineStatus'; // 🆕 Task 3
import {
  MemberLocation,
  LocationData,
  calculateDistance
} from '@/lib/locationUtils';

export default function GroupMapPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const mapViewRef = useRef<any>(null);

  const [deviceId, setDeviceId] = useState<string>('');
  const [deviceName, setDeviceName] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [members, setMembers] = useState<MemberLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<MemberLocation | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // 教學和無障礙模式狀態
  const [showTutorial, setShowTutorial] = useState(false);
  const [accessibilityMode, setAccessibilityMode] = useState(false);

  // 隱私設定狀態
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

  // 快速分享成功提示
  const [showShareSuccess, setShowShareSuccess] = useState(false);

  // 集合點相關狀態
  const [meetupPoint, setMeetupPoint] = useState<{
    latitude: number;
    longitude: number;
    updated_by?: string;
    updated_at?: string;
  } | null>(null);
  const [showMeetupDialog, setShowMeetupDialog] = useState(false);
  const [tempMeetupLocation, setTempMeetupLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // 🆕 Task 3: 追蹤在線狀態
  useOnlineStatus({
    groupId,
    deviceId,
    isActive: !previewMode && isSharingLocation
  });

  // 獲取或創建 device ID 和 name
  useEffect(() => {
    const storedDeviceId = localStorage.getItem('device_id');
    const storedDeviceName = localStorage.getItem('device_name');
    
    if (storedDeviceId) {
      setDeviceId(storedDeviceId);
    } else {
      const newDeviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', newDeviceId);
      setDeviceId(newDeviceId);
    }

    if (storedDeviceName) {
      setDeviceName(storedDeviceName);
    } else {
      const newDeviceName = `User-${Math.random().toString(36).substr(2, 5)}`;
      localStorage.setItem('device_name', newDeviceName);
      setDeviceName(newDeviceName);
    }
  }, []);

  // 載入隱私設定
  useEffect(() => {
    if (!groupId || !deviceId) return;

    const loadPrivacySettings = async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('is_sharing_location, preview_mode')
        .eq('group_id', groupId)
        .eq('device_id', deviceId)
        .single();

      if (error) {
        console.error('Failed to load privacy settings:', error);
        return;
      }

      if (data) {
        setIsSharingLocation(data.is_sharing_location ?? true);
        setPreviewMode(data.preview_mode ?? false);
      }
    };

    loadPrivacySettings();

    // 訂閱隱私設定變更
    const channel = supabase
      .channel(`privacy-${groupId}-${deviceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`
        },
        (payload: any) => {
          if (payload.new.device_id === deviceId) {
            setIsSharingLocation(payload.new.is_sharing_location ?? true);
            setPreviewMode(payload.new.preview_mode ?? false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, deviceId]);

  // 檢查是否首次訪問（顯示教學）
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('map_tutorial_seen');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  // 載入無障礙模式設定
  useEffect(() => {
    const savedMode = localStorage.getItem('accessibility_mode');
    if (savedMode === 'true') {
      setAccessibilityMode(true);
      document.documentElement.classList.add('accessibility-mode');
    }
  }, []);

  // 載入群組資訊
  useEffect(() => {
    if (!groupId) return;

    const loadGroup = async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('name, meetup_latitude, meetup_longitude, meetup_updated_at, meetup_updated_by')
        .eq('id', groupId)
        .single();

      if (error) {
        console.error('Failed to load group:', error);
        router.push('/groups');
        return;
      }

      setGroupName(data.name);
      
      if (data.meetup_latitude && data.meetup_longitude) {
        setMeetupPoint({
          latitude: data.meetup_latitude,
          longitude: data.meetup_longitude,
          updated_by: data.meetup_updated_by,
          updated_at: data.meetup_updated_at
        });
      }
      
      setLoading(false);
    };

    loadGroup();
  }, [groupId, router]);

  // 載入並訂閱成員位置
  useEffect(() => {
    if (!groupId || !deviceId) return;

    const loadMembers = async () => {
      // 只顯示正在分享位置的成員
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_sharing_location', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) {
        console.error('Failed to load member locations:', error);
        return;
      }

      updateMembersWithDistance(data as MemberLocation[]);
    };

    loadMembers();

    const channel = supabase
      .channel(`group-locations-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          console.log('Location update:', payload);
          loadMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, deviceId]);

  // 訂閱集合點更新
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`group-meetup-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'groups',
          filter: `id=eq.${groupId}`
        },
        (payload: any) => {
          console.log('Meetup point update:', payload);
          if (payload.new.meetup_latitude && payload.new.meetup_longitude) {
            setMeetupPoint({
              latitude: payload.new.meetup_latitude,
              longitude: payload.new.meetup_longitude,
              updated_by: payload.new.meetup_updated_by,
              updated_at: payload.new.meetup_updated_at
            });
          } else {
            setMeetupPoint(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  useEffect(() => {
    if (currentLocation) {
      updateMembersWithDistance(members);
    }
  }, [currentLocation, meetupPoint]);

  const updateMembersWithDistance = (memberData: MemberLocation[]) => {
    const updatedMembers = memberData.map(member => {
      const distances: any = {};
      
      if (currentLocation) {
        distances.distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          member.latitude,
          member.longitude
        );
      }

      if (meetupPoint) {
        distances.meetupDistance = calculateDistance(
          meetupPoint.latitude,
          meetupPoint.longitude,
          member.latitude,
          member.longitude
        );
      }

      return { ...member, ...distances };
    });

    setMembers(updatedMembers);
  };

  const handleLocationUpdate = (location: LocationData) => {
    setCurrentLocation(location);
  };

  const handleMemberClick = (member: MemberLocation) => {
    setSelectedMember(member);
    setViewMode('map');
  };

  const handleReturnToMeetup = () => {
    if (meetupPoint && mapViewRef.current) {
      mapViewRef.current.flyToLocation(meetupPoint.latitude, meetupPoint.longitude, 15);
    }
  };

  const handleSetMeetupPoint = async (latitude: number, longitude: number) => {
    try {
      const { error } = await supabase
        .from('groups')
        .update({
          meetup_latitude: latitude,
          meetup_longitude: longitude,
          meetup_updated_at: new Date().toISOString(),
          meetup_updated_by: deviceId
        })
        .eq('id', groupId);

      if (error) throw error;

      setMeetupPoint({
        latitude,
        longitude,
        updated_by: deviceId,
        updated_at: new Date().toISOString()
      });

      setShowMeetupDialog(false);
      setTempMeetupLocation(null);
    } catch (error) {
      console.error('Failed to set meetup point:', error);
      alert('Failed to set meetup point');
    }
  };

  const handleClearMeetupPoint = async () => {
    try {
      const { error } = await supabase
        .from('groups')
        .update({
          meetup_latitude: null,
          meetup_longitude: null,
          meetup_updated_at: null,
          meetup_updated_by: null
        })
        .eq('id', groupId);

      if (error) throw error;

      setMeetupPoint(null);
    } catch (error) {
      console.error('Failed to clear meetup point:', error);
      alert('Failed to clear meetup point');
    }
  };

  const handleMapLongPress = (latitude: number, longitude: number) => {
    setTempMeetupLocation({ latitude, longitude });
    setShowMeetupDialog(true);
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    localStorage.setItem('map_tutorial_seen', 'true');
  };

  const handleTutorialSkip = () => {
    setShowTutorial(false);
    localStorage.setItem('map_tutorial_seen', 'true');
  };

  const toggleAccessibilityMode = () => {
    const newMode = !accessibilityMode;
    setAccessibilityMode(newMode);
    localStorage.setItem('accessibility_mode', String(newMode));
    
    if (newMode) {
      document.documentElement.classList.add('accessibility-mode', 'large-font');
    } else {
      document.documentElement.classList.remove('accessibility-mode', 'large-font');
    }
  };

  const handleShareSuccess = () => {
    setShowShareSuccess(true);
    setTimeout(() => {
      setShowShareSuccess(false);
    }, 3000);
  };

  const calculateEstimatedTime = (distanceKm: number): string => {
    const avgSpeedKmh = 50;
    const timeMinutes = (distanceKm / avgSpeedKmh) * 60;
    
    if (timeMinutes < 1) return '< 1 min';
    if (timeMinutes < 60) return `~${Math.round(timeMinutes)} mins`;
    
    const hours = Math.floor(timeMinutes / 60);
    const mins = Math.round(timeMinutes % 60);
    return `~${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 教學覆蓋層 */}
      {showTutorial && (
        <TutorialOverlay
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialSkip}
        />
      )}

      {/* 隱私設定對話框 */}
      <PrivacySettings
        groupId={groupId}
        deviceId={deviceId}
        isOpen={showPrivacySettings}
        onClose={() => setShowPrivacySettings(false)}
      />

      {/* 全局分享成功提示 */}
      {showShareSuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <span className="text-xl">✅</span>
            <span className="font-semibold">Status shared to chat!</span>
          </div>
        </div>
      )}

      {/* 預覽模式提示橫幅 */}
      {previewMode && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center font-semibold">
          👁️ Preview Mode Active - You are not sharing your location
        </div>
      )}

      {/* 頂部導航 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/groups/${groupId}`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="返回群組"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{groupName}</h1>
                <p className="text-sm text-gray-500">Group Map</p>
              </div>
            </div>

            <div className="flex gap-2">
              {/* 隱私設定按鈕 */}
              <button
                onClick={() => setShowPrivacySettings(true)}
                className={`p-2 rounded-lg transition-colors ${
                  previewMode
                    ? 'bg-yellow-100 text-yellow-600'
                    : isSharingLocation
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}
                aria-label="隱私設定"
                title="Privacy Settings"
              >
                <span className="text-2xl">
                  {previewMode ? '👁️' : isSharingLocation ? '🟢' : '🔴'}
                </span>
              </button>

              {/* 教學按鈕 */}
              <button
                onClick={() => setShowTutorial(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="重新觀看教學"
                title="Tutorial"
              >
                <span className="text-2xl">🎓</span>
              </button>

              {/* 無障礙模式按鈕 */}
              <button
                onClick={toggleAccessibilityMode}
                className={`p-2 rounded-lg transition-colors ${
                  accessibilityMode
                    ? 'bg-blue-100 text-blue-600'
                    : 'hover:bg-gray-100'
                }`}
                aria-label="切換無障礙模式"
                title="Accessibility Mode"
              >
                <span className="text-2xl">{accessibilityMode ? '👁️' : '👁️‍🗨️'}</span>
              </button>

              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'map'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Map
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {/* 預覽模式時顯示提示 */}
            {previewMode && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">👁️</span>
                  <div>
                    <h3 className="font-bold text-yellow-900 mb-1">Preview Mode</h3>
                    <p className="text-sm text-yellow-800 mb-2">
                      You can view the map, but your location is not being shared with others.
                    </p>
                    <button
                      onClick={() => setShowPrivacySettings(true)}
                      className="text-sm font-semibold text-yellow-700 hover:text-yellow-900 underline"
                    >
                      Change Settings
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 只有在分享模式下才顯示 LocationTracker */}
            {!previewMode && (
              <LocationTracker
                groupId={groupId}
                deviceId={deviceId}
                onLocationUpdate={handleLocationUpdate}
              />
            )}

            {/* 快速分享按鈕 - 預覽模式下禁用 */}
            {!previewMode && (
              <QuickShareButtons
                groupId={groupId}
                deviceId={deviceId}
                deviceName={deviceName}
                currentLocation={currentLocation || undefined}
                meetupPoint={meetupPoint || undefined}
                onShareSuccess={handleShareSuccess}
              />
            )}

            {/* Task 2: ETA 設定 */}
            {!previewMode && meetupPoint && (
              <ETASettings
                groupId={groupId}
                deviceId={deviceId}
                deviceName={deviceName}
                meetupPoint={meetupPoint}
                currentLocation={currentLocation || undefined}
                distanceToMeetup={
                  currentLocation && meetupPoint
                    ? calculateDistance(
                        currentLocation.latitude,
                        currentLocation.longitude,
                        meetupPoint.latitude,
                        meetupPoint.longitude
                      )
                    : undefined
                }
              />
            )}

            {/* 集合點控制 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Meet Up Point</h3>
              
              {meetupPoint ? (
                <div>
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 mb-1 font-semibold">
                      📍 Meet up point is set
                    </p>
                    <p className="text-xs text-red-600 mb-2">
                      {meetupPoint.latitude.toFixed(6)}, {meetupPoint.longitude.toFixed(6)}
                    </p>
                    {currentLocation && !previewMode && (
                      <>
                        <p className="text-xs text-red-600">
                          Distance: {calculateDistance(
                            currentLocation.latitude,
                            currentLocation.longitude,
                            meetupPoint.latitude,
                            meetupPoint.longitude
                          ).toFixed(2)} km
                        </p>
                        <p className="text-xs text-red-600">
                          Estimated time: {calculateEstimatedTime(
                            calculateDistance(
                              currentLocation.latitude,
                              currentLocation.longitude,
                              meetupPoint.latitude,
                              meetupPoint.longitude
                            )
                          )}
                        </p>
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={handleReturnToMeetup}
                    className="w-full mb-2 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors font-semibold"
                  >
                    📍 Return to Meet Up Point
                  </button>
                  
                  {currentLocation && !previewMode && (
                    <button
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${meetupPoint.latitude},${meetupPoint.longitude}`;
                        window.open(url, '_blank');
                      }}
                      className="w-full mb-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors font-semibold"
                    >
                      🧭 Navigate to Meet Up Point
                    </button>
                  )}
                  
                  <button
                    onClick={handleClearMeetupPoint}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Clear Meet Up Point
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Right-click on map (desktop) or long-press (mobile) to set meet up point
                  </p>
                  
                  {!previewMode && (
                    <button
                      onClick={() => {
                        if (currentLocation) {
                          setTempMeetupLocation({
                            latitude: currentLocation.latitude,
                            longitude: currentLocation.longitude
                          });
                          setShowMeetupDialog(true);
                        } else {
                          alert('Please start tracking first to get your location');
                        }
                      }}
                      className="w-full mb-3 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors font-semibold"
                    >
                      Set Meetup at My Location
                    </button>
                  )}
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">
                      💡 All members can see the meet up point and their distance to it
                    </p>
                  </div>
                </div>
              )}
            </div>

            {currentLocation && !previewMode && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-2 text-gray-900">Your Location</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Latitude: {currentLocation.latitude.toFixed(6)}</p>
                  <p>Longitude: {currentLocation.longitude.toFixed(6)}</p>
                  {currentLocation.accuracy && (
                    <p>Accuracy: ±{currentLocation.accuracy.toFixed(0)}m</p>
                  )}
                </div>
              </div>
            )}

            {selectedMember && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-blue-900">
                    {selectedMember.device_name}
                  </h3>
                  <button
                    onClick={() => setSelectedMember(null)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ✕
                  </button>
                </div>
                {selectedMember.distance && currentLocation && !previewMode && (
                  <p className="text-sm text-blue-700 mb-2">
                    Distance to you: {selectedMember.distance.toFixed(2)} km
                  </p>
                )}
                {(selectedMember as any).meetupDistance && meetupPoint && (
                  <p className="text-sm text-red-700 mb-2">
                    Distance to meetup: {(selectedMember as any).meetupDistance.toFixed(2)} km
                  </p>
                )}
                {!previewMode && (
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation?.latitude},${currentLocation?.longitude}&destination=${selectedMember.latitude},${selectedMember.longitude}`;
                      window.open(url, '_blank');
                    }}
                    disabled={!currentLocation}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    📍 View Route in Google Maps
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {viewMode === 'map' ? (
              <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '600px' }}>
                <MapView
                  ref={mapViewRef}
                  members={members}
                  currentLocation={!previewMode ? currentLocation || undefined : undefined}
                  meetupPoint={meetupPoint ?? undefined}
                  onMemberClick={handleMemberClick}
                  onMapLongPress={handleMapLongPress}
                />
              </div>
            ) : (
              <MemberList
                members={members}
                currentDeviceId={deviceId}
                onMemberClick={handleMemberClick}
              />
            )}
          </div>
        </div>
      </main>

      {showMeetupDialog && tempMeetupLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Set Meet Up Point?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Set the meet up point at this location?
            </p>
            <div className="text-xs text-gray-500 mb-4 font-mono">
              {tempMeetupLocation.latitude.toFixed(6)}, {tempMeetupLocation.longitude.toFixed(6)}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMeetupDialog(false);
                  setTempMeetupLocation(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSetMeetupPoint(tempMeetupLocation.latitude, tempMeetupLocation.longitude)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Set Meet Up Point
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translate(-50%, -100%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

