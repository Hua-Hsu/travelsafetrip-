// ================================
// Week 6 Task 4: Leader Dashboard
// app/groups/[id]/leader-dashboard/page.tsx
// ================================

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MemberLocation, calculateDistance } from '@/lib/locationUtils';

// 擴展 MemberLocation 類型以包含額外欄位
interface ExtendedMemberLocation extends MemberLocation {
  is_online?: boolean;
  is_sharing_location?: boolean; // 🆕 加入這個欄位
  last_seen?: string | null;
  role?: string;
  preview_mode?: boolean;
  estimated_arrival_time?: string | null;
  meetupDistance?: number;
}

// 計算時間差
function getTimeAgo(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} mins ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

export default function LeaderDashboard() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [deviceId, setDeviceId] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [members, setMembers] = useState<ExtendedMemberLocation[]>([]);
  const [isLeader, setIsLeader] = useState(false);
  const [loading, setLoading] = useState(true);
  const [meetupPoint, setMeetupPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // 統計資料
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    sharing: 0,
    preview: 0,
    offline: 0
  });

  // 獲取 device ID
  useEffect(() => {
    const storedDeviceId = localStorage.getItem('device_id');
    if (storedDeviceId) {
      setDeviceId(storedDeviceId);
    }
  }, []);

  // 檢查是否為領隊
  useEffect(() => {
    if (!groupId || !deviceId) return;

    const checkLeaderStatus = async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('device_id', deviceId)
        .single();

      if (error) {
        console.error('Failed to check leader status:', error);
        return;
      }

      if (data?.role === 'leader') {
        setIsLeader(true);
      } else {
        // 非領隊，導回地圖頁面
        alert('Only leaders can access this page');
        router.push(`/groups/${groupId}/map`);
      }
    };

    checkLeaderStatus();
  }, [groupId, deviceId, router]);

  // 載入群組資訊
  useEffect(() => {
    if (!groupId) return;

    const loadGroup = async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('name, meetup_latitude, meetup_longitude')
        .eq('id', groupId)
        .single();

      if (error) {
        console.error('Failed to load group:', error);
        return;
      }

      setGroupName(data.name);
      
      if (data.meetup_latitude && data.meetup_longitude) {
        setMeetupPoint({
          latitude: data.meetup_latitude,
          longitude: data.meetup_longitude
        });
      }
    };

    loadGroup();
  }, [groupId]);

  // 載入所有成員（包括不分享位置的）
  useEffect(() => {
    if (!groupId || !isLeader) return;

    const loadMembers = async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('device_name', { ascending: true });

      if (error) {
        console.error('Failed to load members:', error);
        return;
      }

      // 計算到集合點的距離
      const membersWithDistance = data.map(member => {
        if (meetupPoint && member.latitude && member.longitude) {
          return {
            ...member,
            meetupDistance: calculateDistance(
              meetupPoint.latitude,
              meetupPoint.longitude,
              member.latitude,
              member.longitude
            )
          };
        }
        return member;
      });

      setMembers(membersWithDistance as ExtendedMemberLocation[]);

      // 計算統計
      const total = data.length;
      const online = data.filter(m => m.is_online).length;
      const sharing = data.filter(m => m.is_sharing_location).length;
      const preview = data.filter(m => m.preview_mode).length;
      const offline = data.filter(m => !m.is_online).length;

      setStats({ total, online, sharing, preview, offline });
      setLoading(false);
    };

    loadMembers();

    // 訂閱成員更新
    const channel = supabase
      .channel(`leader-dashboard-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`
        },
        () => {
          loadMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, isLeader, meetupPoint]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Dashboard...</p>
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
                onClick={() => router.push(`/groups/${groupId}/map`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👑</span>
                  <h1 className="text-xl font-bold text-gray-900">{groupName}</h1>
                </div>
                <p className="text-sm text-gray-500">Leader Dashboard</p>
              </div>
            </div>

            <button
              onClick={() => router.push(`/groups/${groupId}/map`)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Back to Map
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Members</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">{stats.online}</div>
            <div className="text-sm text-green-700">Online Now</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">{stats.sharing}</div>
            <div className="text-sm text-blue-700">Sharing Location</div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-yellow-600">{stats.preview}</div>
            <div className="text-sm text-yellow-700">Preview Mode</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-red-600">{stats.offline}</div>
            <div className="text-sm text-red-700">Offline</div>
          </div>
        </div>

        {/* 成員詳細列表 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">All Members</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sharing</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Seen</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance to Meetup</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    {/* 在線狀態 */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          member.is_online ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                        <span className="text-sm text-gray-600">
                          {member.is_online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </td>

                    {/* 名稱 */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{member.device_name}</div>
                      {member.device_id === deviceId && (
                        <span className="text-xs text-blue-600">(You)</span>
                      )}
                    </td>

                    {/* 角色 */}
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        member.role === 'leader'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {member.role === 'leader' ? '👑 Leader' : 'Member'}
                      </span>
                    </td>

                    {/* 分享狀態 */}
                    <td className="px-6 py-4">
                      {member.preview_mode ? (
                        <span className="text-xs text-yellow-600">👁️ Preview</span>
                      ) : member.is_sharing_location ? (
                        <span className="text-xs text-green-600">✅ Sharing</span>
                      ) : (
                        <span className="text-xs text-red-600">❌ Not Sharing</span>
                      )}
                    </td>

                    {/* 最後上線時間 */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getTimeAgo(member.last_seen || null)}
                    </td>

                    {/* 到集合點距離 */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {member.meetupDistance ? (
                        <span>{member.meetupDistance.toFixed(2)} km</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* ETA */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {member.estimated_arrival_time ? (
                        <span>
                          {new Date(member.estimated_arrival_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 說明 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">📊 Dashboard Guide</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Online:</strong> Member is currently active on the map page</li>
            <li>• <strong>Sharing:</strong> Member is sharing their real-time location</li>
            <li>• <strong>Preview Mode:</strong> Member can see the map but not sharing location</li>
            <li>• <strong>Distance to Meetup:</strong> Shows only if member is sharing location and meetup point is set</li>
            <li>• <strong>ETA:</strong> Estimated arrival time set by the member</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

