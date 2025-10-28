// ================================
// Week 4: 群組地圖頁面 + Meet Up Point
// app/groups/[id]/map/page.tsx
// ================================

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MapView from '@/components/MapView';
import LocationTracker from '@/components/LocationTracker';
import MemberList from '@/components/MemberList';
import {
  MemberLocation,
  LocationData,
  calculateDistance
} from '@/lib/locationUtils';

export default function GroupMapPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [deviceId, setDeviceId] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [members, setMembers] = useState<MemberLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<MemberLocation | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

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

  // 獲取或創建 device ID
  useEffect(() => {
    const storedDeviceId = localStorage.getItem('device_id');
    if (storedDeviceId) {
      setDeviceId(storedDeviceId);
    } else {
      const newDeviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', newDeviceId);
      setDeviceId(newDeviceId);
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
      
      // 載入集合點（如果有的話）
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

    // 載入當前成員位置
    const loadMembers = async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) {
        console.error('Failed to load member locations:', error);
        return;
      }

      updateMembersWithDistance(data as MemberLocation[]);
    };

    loadMembers();

    // 訂閱即時位置更新
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

  // 當當前位置改變時，重新計算距離
  useEffect(() => {
    if (currentLocation) {
      updateMembersWithDistance(members);
    }
  }, [currentLocation, meetupPoint]);

  // 更新成員列表並計算距離
  const updateMembersWithDistance = (memberData: MemberLocation[]) => {
    const updatedMembers = memberData.map(member => {
      const distances: any = {};
      
      // 計算與當前用戶的距離
      if (currentLocation) {
        distances.distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          member.latitude,
          member.longitude
        );
      }

      // 計算與集合點的距離
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

  // 處理位置更新
  const handleLocationUpdate = (location: LocationData) => {
    setCurrentLocation(location);
  };

  // 處理成員點擊
  const handleMemberClick = (member: MemberLocation) => {
    setSelectedMember(member);
    setViewMode('map');
  };

  // 設定集合點
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

  // 清除集合點
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

  // 處理地圖長按
  const handleMapLongPress = (latitude: number, longitude: number) => {
    setTempMeetupLocation({ latitude, longitude });
    setShowMeetupDialog(true);
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
      {/* 頂部導航 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/groups/${groupId}`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold">{groupName}</h1>
                <p className="text-sm text-gray-500">Group Map</p>
              </div>
            </div>

            {/* 視圖切換 */}
            <div className="flex gap-2">
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

      {/* 主要內容 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：位置追蹤控制 */}
          <div className="lg:col-span-1 space-y-6">
            <LocationTracker
              groupId={groupId}
              deviceId={deviceId}
              onLocationUpdate={handleLocationUpdate}
            />

            {/* 集合點控制 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-3">Meet Up Point</h3>
              
              {meetupPoint ? (
                <div>
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 mb-1">
                      📍 Meet up point is set
                    </p>
                    <p className="text-xs text-red-600">
                      {meetupPoint.latitude.toFixed(6)}, {meetupPoint.longitude.toFixed(6)}
                    </p>
                    {currentLocation && (
                      <p className="text-xs text-red-600 mt-1">
                        Your distance: {calculateDistance(
                          currentLocation.latitude,
                          currentLocation.longitude,
                          meetupPoint.latitude,
                          meetupPoint.longitude
                        ).toFixed(2)} km
                      </p>
                    )}
                  </div>
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
                  
                  {/* 測試按鈕 */}
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
                    🧪 Test: Set Meetup at My Location
                  </button>
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">
                      💡 Tip: All members can see the meet up point and their distance to it
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 當前位置資訊 */}
            {currentLocation && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-2">Your Location</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Latitude: {currentLocation.latitude.toFixed(6)}</p>
                  <p>Longitude: {currentLocation.longitude.toFixed(6)}</p>
                  {currentLocation.accuracy && (
                    <p>Accuracy: ±{currentLocation.accuracy.toFixed(0)}m</p>
                  )}
                </div>
              </div>
            )}

            {/* 選中的成員資訊 */}
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
                {selectedMember.distance && (
                  <p className="text-sm text-blue-700 mb-2">
                    Distance to you: {selectedMember.distance.toFixed(2)} km
                  </p>
                )}
                {(selectedMember as any).meetupDistance && meetupPoint && (
                  <p className="text-sm text-red-700 mb-2">
                    Distance to meetup: {(selectedMember as any).meetupDistance.toFixed(2)} km
                  </p>
                )}
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
              </div>
            )}
          </div>

          {/* 右側：地圖或列表視圖 */}
          <div className="lg:col-span-2">
            {viewMode === 'map' ? (
              <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '600px' }}>
                <MapView
                  members={members}
                  currentLocation={currentLocation || undefined}
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

        {/* 使用說明 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 How to Use</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. Click "Start Tracking" to enable location sharing</li>
            <li>2. Allow browser to access your location</li>
            <li>3. Your location will be automatically updated every 10 seconds</li>
            <li>4. Right-click on map (or use test button) to set a meet up point</li>
            <li>5. Click on member markers on the map to view details</li>
            <li>6. Click "View Route in Google Maps" to plan navigation</li>
          </ul>
        </div>
      </main>

      {/* 集合點確認對話框 */}
      {showMeetupDialog && tempMeetupLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-3">Set Meet Up Point?</h3>
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
    </div>
  );
}
