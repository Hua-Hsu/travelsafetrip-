// ================================
// Week 6 Task 2: Member List with Last Update Time
// components/MemberList.tsx
// ================================

'use client';

import React from 'react';
import { MemberLocation } from '@/lib/locationUtils';

interface MemberListProps {
  members: MemberLocation[];
  currentDeviceId: string;
  onMemberClick: (member: MemberLocation) => void;
}

// 計算時間差（多久以前）
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

// 根據更新時間決定狀態顏色
function getStatusColor(timestamp: string | null): string {
  if (!timestamp) return 'bg-gray-400';
  
  const now = new Date();
  const past = new Date(timestamp);
  const diffMins = Math.floor((now.getTime() - past.getTime()) / 60000);
  
  if (diffMins < 2) return 'bg-green-500'; // 2 分鐘內：綠色
  if (diffMins < 10) return 'bg-yellow-500'; // 10 分鐘內：黃色
  return 'bg-red-500'; // 超過 10 分鐘：紅色
}

export default function MemberList({
  members,
  currentDeviceId,
  onMemberClick
}: MemberListProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">
        Group Members ({members.length})
      </h3>

      {members.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">No active members</p>
          <p className="text-sm">Members will appear when they start sharing location</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => {
            const isCurrentUser = member.device_id === currentDeviceId;
            const timeAgo = getTimeAgo(member.location_updated_at || null);
            const statusColor = getStatusColor(member.location_updated_at || null);
            
            return (
              <div
                key={member.id}
                onClick={() => !isCurrentUser && onMemberClick(member)}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${isCurrentUser
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:border-blue-300 cursor-pointer hover:shadow-md'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {/* 狀態指示器 */}
                      <div className={`w-3 h-3 rounded-full ${statusColor}`}></div>
                      
                      {/* 成員名稱 */}
                      <h4 className={`font-semibold ${
                        isCurrentUser ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {member.device_name}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                            You
                          </span>
                        )}
                      </h4>
                    </div>

                    {/* 位置資訊 */}
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        📍 {member.latitude.toFixed(4)}, {member.longitude.toFixed(4)}
                      </p>
                      
                      {/* 🆕 上次更新時間 */}
                      <p className="flex items-center gap-1">
                        <span className="text-gray-500">⏱️ Last updated:</span>
                        <span className="font-medium">{timeAgo}</span>
                      </p>

                      {/* 距離資訊 */}
                      {member.distance && !isCurrentUser && (
                        <p>
                          <span className="text-gray-500">Distance to you:</span>{' '}
                          <span className="font-semibold text-blue-600">
                            {member.distance.toFixed(2)} km
                          </span>
                        </p>
                      )}

                      {(member as any).meetupDistance && (
                        <p>
                          <span className="text-gray-500">Distance to meetup:</span>{' '}
                          <span className="font-semibold text-red-600">
                            {(member as any).meetupDistance.toFixed(2)} km
                          </span>
                        </p>
                      )}

                      {/* 🆕 預計抵達時間 */}
                      {(member as any).estimated_arrival_time && (
                        <p className="flex items-center gap-1">
                          <span className="text-gray-500">⏰ ETA:</span>
                          <span className="font-semibold text-purple-600">
                            {new Date((member as any).estimated_arrival_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 查看詳情按鈕 */}
                  {!isCurrentUser && (
                    <button
                      className="ml-2 text-blue-600 hover:text-blue-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMemberClick(member);
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 狀態圖例 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-600 font-semibold mb-2">Status:</p>
        <div className="flex gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Active (&lt;2m)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span>Recent (&lt;10m)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>Inactive (&gt;10m)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

