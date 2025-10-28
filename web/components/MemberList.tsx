// ================================
// Week 4: 成員位置列表組件
// components/MemberList.tsx
// ================================

'use client';

import React from 'react';
import { MemberLocation, formatDistance, getLocationAge } from '@/lib/locationUtils';

interface MemberListProps {
  members: MemberLocation[];
  currentDeviceId: string;
  onMemberClick?: (member: MemberLocation) => void;
}

export default function MemberList({ members, currentDeviceId, onMemberClick }: MemberListProps) {
  // 排序：最近的成員在前
  const sortedMembers = [...members].sort((a, b) => {
    if (!a.distance && !b.distance) return 0;
    if (!a.distance) return 1;
    if (!b.distance) return -1;
    return a.distance - b.distance;
  });

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Group Member Locations</h3>
        <p className="text-sm text-gray-500 mt-1">
          {members.length} member{members.length !== 1 ? 's' : ''} sharing location
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {sortedMembers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p>No members are sharing their location</p>
            <p className="text-sm mt-1">Start tracking to let others see your location</p>
          </div>
        ) : (
          sortedMembers.map((member) => (
            <div
              key={member.id}
              onClick={() => onMemberClick?.(member)}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">
                      {member.device_name}
                    </h4>
                    {member.device_id === currentDeviceId && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-1 space-y-1">
                    {member.distance !== undefined && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                        <span>Distance: {formatDistance(member.distance)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>Updated: {getLocationAge(member.location_updated_at)}</span>
                    </div>
                  </div>
                </div>

                {/* 距離標籤（右側） */}
                {member.distance !== undefined && (
                  <div className="ml-3">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        member.distance < 0.5
                          ? 'bg-green-100 text-green-700'
                          : member.distance < 2
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {formatDistance(member.distance)}
                    </div>
                  </div>
                )}
              </div>

              {/* 座標資訊（摺疊） */}
              <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                  Show coordinates
                </summary>
                <div className="mt-1 text-xs text-gray-500 font-mono">
                  {member.latitude.toFixed(6)}, {member.longitude.toFixed(6)}
                </div>
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

