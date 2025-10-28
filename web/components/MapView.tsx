// ================================
// Week 4: 地圖顯示組件
// components/MapView.tsx
// ================================

'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MemberLocation, calculateBounds } from '@/lib/locationUtils';

interface MapViewProps {
  members: MemberLocation[];
  currentLocation?: { latitude: number; longitude: number };
  onMemberClick?: (member: MemberLocation) => void;
}

export default function MapView({ members, currentLocation, onMemberClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  // 初始化地圖
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // 設置 Mapbox access token
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

    // 創建地圖實例
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: currentLocation 
        ? [currentLocation.longitude, currentLocation.latitude]
        : [121.5654, 25.0330], // 預設：台北
      zoom: 13,
      attributionControl: false
    });

    // 添加縮放和旋轉控制
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // 添加定位控制
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );

    // 地圖載入完成
    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // 清理函數
    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current.clear();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // 更新當前用戶位置標記
  useEffect(() => {
    if (!map.current || !mapLoaded || !currentLocation) return;

    const markerId = 'current-user';
    let marker = markers.current.get(markerId);

    if (!marker) {
      // 創建當前用戶的標記（藍色）
      const el = document.createElement('div');
      el.className = 'current-user-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#3b82f6';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      marker = new mapboxgl.Marker(el)
        .setLngLat([currentLocation.longitude, currentLocation.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML('<strong>你的位置</strong>')
        )
        .addTo(map.current);

      markers.current.set(markerId, marker);
    } else {
      // 更新位置
      marker.setLngLat([currentLocation.longitude, currentLocation.latitude]);
    }

    // 如果這是第一次設置位置，將地圖中心移到這裡
    if (markers.current.size === 1) {
      map.current.flyTo({
        center: [currentLocation.longitude, currentLocation.latitude],
        zoom: 13
      });
    }
  }, [currentLocation, mapLoaded]);

  // 更新其他成員的標記
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // 移除不再存在的標記
    const currentMemberIds = new Set(members.map(m => m.id));
    markers.current.forEach((marker, id) => {
      if (id !== 'current-user' && !currentMemberIds.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    });

    // 更新或創建成員標記
    members.forEach(member => {
      let marker = markers.current.get(member.id);

      if (!marker) {
        // 創建新標記（紅色）
        const el = document.createElement('div');
        el.className = 'member-marker';
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#ef4444';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';

        // 點擊事件
        el.addEventListener('click', () => {
          onMemberClick?.(member);
        });

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <strong>${member.device_name}</strong>
            ${member.distance ? `<br/><small>距離: ${member.distance.toFixed(2)}km</small>` : ''}
          </div>
        `);

        marker = new mapboxgl.Marker(el)
          .setLngLat([member.longitude, member.latitude])
          .setPopup(popup)
          .addTo(map.current!);

        markers.current.set(member.id, marker);
      } else {
        // 更新現有標記
        marker.setLngLat([member.longitude, member.latitude]);
        
        // 更新 popup 內容
        const popup = marker.getPopup();
        if (popup) {
          popup.setHTML(`
            <div style="padding: 8px;">
              <strong>${member.device_name}</strong>
              ${member.distance ? `<br/><small>距離: ${member.distance.toFixed(2)}km</small>` : ''}
            </div>
          `);
        }
      }
    });

    // 調整地圖視野以包含所有標記
    if (members.length > 0 || currentLocation) {
      const allLocations = [
        ...members.map(m => ({ latitude: m.latitude, longitude: m.longitude })),
        ...(currentLocation ? [currentLocation] : [])
      ];

      const bounds = calculateBounds(allLocations);
      if (bounds && map.current) {
        map.current.fitBounds(
          [
            [bounds.minLng, bounds.minLat],
            [bounds.maxLng, bounds.maxLat]
          ],
          {
            padding: 50,
            maxZoom: 15
          }
        );
      }
    }
  }, [members, mapLoaded, onMemberClick]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">載入地圖中...</p>
          </div>
        </div>
      )}

      {/* 圖例 */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
          <span className="text-sm">你的位置</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white"></div>
          <span className="text-sm">其他成員</span>
        </div>
      </div>
    </div>
  );
}

