// ================================
// Week 4: 群組地圖頁面
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
        .select('name')
        .eq('id', groupId)
        .single();

      if (error) {
        console.error('Failed to load group:', error);
        router.push('/groups');
        return;
      }

      setGroupName(data.name);
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
          loadMembers(); // 重新載入所有成員
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, deviceId]);

  // 當當前位置改變時，重新計算距離
  useEffect(() => {
    if (currentLocation) {
      updateMembersWithDistance(members);
    }
  }, [currentLocation]);

  // 更新成員列表並計算距離
  const updateMembersWithDistance = (memberData: MemberLocation[]) => {
    const updatedMembers = memberData.map(member => {
      if (currentLocation) {
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          member.latitude,
          member.longitude
        );
        return { ...member, distance };
      }
      return member;
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
                    Distance: {selectedMember.distance.toFixed(2)} km
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
                  onMemberClick={handleMemberClick}
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
            <li>4. Click on member markers on the map to view details</li>
            <li>5. Click "View Route in Google Maps" to plan navigation</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

