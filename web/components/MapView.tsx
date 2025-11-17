// ================================
// Week 4-5-6-7: 地圖顯示組件 - 完整整合版
// components/MapView.tsx
// ================================

'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MemberLocation, calculateBounds } from '@/lib/locationUtils';
import { MapboxPlace } from '@/lib/mapboxSearch'; // 🆕 Week 7

interface MapViewProps {
  members: MemberLocation[];
  currentLocation?: { latitude: number; longitude: number };
  meetupPoint?: { latitude: number; longitude: number };
  searchResults?: MapboxPlace[]; // 🆕 Week 7
  onMemberClick?: (member: MemberLocation) => void;
  onMapLongPress?: (latitude: number, longitude: number) => void;
}

// 定義可以從外部調用的方法
export interface MapViewRef {
  flyToLocation: (latitude: number, longitude: number, zoom?: number) => void;
}

const MapView = forwardRef<MapViewRef, MapViewProps>(({ 
  members, 
  currentLocation, 
  meetupPoint,
  searchResults = [], // 🆕 Week 7
  onMemberClick,
  onMapLongPress 
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const meetupMarker = useRef<mapboxgl.Marker | null>(null);
  const searchMarkersRef = useRef<mapboxgl.Marker[]>([]); // 🆕 Week 7
  const [mapLoaded, setMapLoaded] = useState(false);

  // 暴露方法給父組件
  useImperativeHandle(ref, () => ({
    flyToLocation: (latitude: number, longitude: number, zoom: number = 15) => {
      if (map.current) {
        map.current.flyTo({
          center: [longitude, latitude],
          zoom: zoom,
          duration: 1500, // 1.5 秒的飛行動畫
          essential: true
        });
      }
    }
  }));

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

    // 處理集合點設定（電腦端：右鍵點擊，手機端：長按）
    let longPressTimer: any = null;
    let pressStartTime = 0;
    let startPos = { x: 0, y: 0 };

    // 電腦端：右鍵點擊設定集合點
    map.current.on('contextmenu', (e) => {
      e.preventDefault();
      console.log('Right click detected:', e.lngLat);
      if (onMapLongPress) {
        onMapLongPress(e.lngLat.lat, e.lngLat.lng);
      }
    });

    // 手機端：長按設定集合點
    map.current.on('touchstart', (e: any) => {
      if (e.originalEvent.touches.length === 1) {
        pressStartTime = Date.now();
        const touch = e.originalEvent.touches[0];
        startPos = { x: touch.clientX, y: touch.clientY };
        
        const point = map.current!.unproject([touch.clientX, touch.clientY]);
        
        if (longPressTimer) clearTimeout(longPressTimer);
        
        longPressTimer = setTimeout(() => {
          console.log('Long press detected:', point);
          if (onMapLongPress) {
            onMapLongPress(point.lat, point.lng);
          }
        }, 800);
      }
    });

    map.current.on('touchend', () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    });

    map.current.on('touchmove', (e: any) => {
      if (e.originalEvent.touches.length === 1) {
        const touch = e.originalEvent.touches[0];
        const moved = Math.abs(touch.clientX - startPos.x) > 10 || 
                      Math.abs(touch.clientY - startPos.y) > 10;
        if (moved && longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }
    });

    // 清理函數
    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current.clear();
      if (meetupMarker.current) {
        meetupMarker.current.remove();
      }
      searchMarkersRef.current.forEach(marker => marker.remove()); // 🆕 Week 7
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // 更新集合點標記
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (meetupPoint) {
      if (!meetupMarker.current) {
        // 創建集合點標記（紅色大 PIN）
        const el = document.createElement('div');
        el.className = 'meetup-marker';
        el.innerHTML = `
          <div style="
            width: 40px;
            height: 40px;
            background-color: #ef4444;
            border: 4px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <span style="
              transform: rotate(45deg);
              font-size: 20px;
            ">📍</span>
          </div>
        `;

        meetupMarker.current = new mapboxgl.Marker(el)
          .setLngLat([meetupPoint.longitude, meetupPoint.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML('<strong>Meet Up Point</strong>')
          )
          .addTo(map.current);
      } else {
        // 更新位置
        meetupMarker.current.setLngLat([meetupPoint.longitude, meetupPoint.latitude]);
      }
    } else {
      // 移除集合點標記
      if (meetupMarker.current) {
        meetupMarker.current.remove();
        meetupMarker.current = null;
      }
    }
  }, [meetupPoint, mapLoaded]);

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
            .setHTML('<strong>Your Location</strong>')
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

        const meetupDistance = (member as any).meetupDistance;
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <strong>${member.device_name}</strong>
            ${member.distance ? `<br/><small>Distance to you: ${member.distance.toFixed(2)}km</small>` : ''}
            ${meetupDistance ? `<br/><small style="color: #ef4444;">Distance to meetup: ${meetupDistance.toFixed(2)}km</small>` : ''}
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
        const meetupDistance = (member as any).meetupDistance;
        if (popup) {
          popup.setHTML(`
            <div style="padding: 8px;">
              <strong>${member.device_name}</strong>
              ${member.distance ? `<br/><small>Distance to you: ${member.distance.toFixed(2)}km</small>` : ''}
              ${meetupDistance ? `<br/><small style="color: #ef4444;">Distance to meetup: ${meetupDistance.toFixed(2)}km</small>` : ''}
            </div>
          `);
        }
      }
    });

    // 🆕 調整地圖視野（當沒有搜尋結果時）
    if (searchResults.length === 0 && (members.length > 0 || currentLocation || meetupPoint)) {
      const allLocations = [
        ...members.map(m => ({ latitude: m.latitude, longitude: m.longitude })),
        ...(currentLocation ? [currentLocation] : []),
        ...(meetupPoint ? [meetupPoint] : [])
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
  }, [members, mapLoaded, onMemberClick, meetupPoint, searchResults.length]);

  // 🆕 Week 7: 更新搜尋結果標記
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // 清除舊的搜尋標記
    searchMarkersRef.current.forEach(marker => marker.remove());
    searchMarkersRef.current = [];

    // 如果沒有搜尋結果，直接返回
    if (searchResults.length === 0) return;

    // 顯示新的搜尋結果標記
    searchResults.forEach((place, index) => {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%);
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16px;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
          cursor: pointer;
          transition: transform 0.2s;
        ">
          ${index + 1}
        </div>
      `;

      // Hover 效果
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat(place.coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25, maxWidth: '300px' }).setHTML(`
            <div style="padding: 12px;">
              <div style="font-weight: bold; font-size: 16px; margin-bottom: 6px; color: #111;">${place.name}</div>
              <div style="font-size: 13px; color: #666; margin-bottom: 8px;">${place.address}</div>
              <div style="font-size: 12px; display: flex; flex-wrap: gap: 8px; align-items: center; color: #333;">
                ${place.rating ? `<span>⭐ ${place.rating.toFixed(1)}</span>` : ''}
                <span>📍 ${place.distance.toFixed(1)} mi</span>
                <span style="
                  background: ${place.safetyScore >= 8 ? '#10B981' : place.safetyScore >= 7 ? '#F59E0B' : '#EF4444'};
                  color: white;
                  padding: 2px 8px;
                  border-radius: 12px;
                  font-weight: bold;
                ">
                  🎯 ${place.safetyScore.toFixed(1)}/10
                </span>
              </div>
              ${place.isOpen !== undefined ? `
                <div style="margin-top: 6px; font-size: 12px; color: ${place.isOpen ? '#10B981' : '#EF4444'}; font-weight: 500;">
                  ${place.isOpen ? '✅ Open now' : '🔴 Closed'}
                </div>
              ` : ''}
            </div>
          `)
        )
        .addTo(map.current!);

      searchMarkersRef.current.push(marker);
    });

    // 調整地圖視角以包含所有搜尋結果
    if (searchResults.length > 0 && currentLocation) {
      const bounds = new mapboxgl.LngLatBounds();
      
      // 加入當前位置
      bounds.extend([currentLocation.longitude, currentLocation.latitude]);
      
      // 加入所有搜尋結果
      searchResults.forEach(place => {
        bounds.extend(place.coordinates);
      });

      map.current.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        maxZoom: 14,
        duration: 1500
      });
    }
  }, [searchResults, currentLocation, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* 圖例 */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
          <span className="text-sm">Your Location</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white"></div>
          <span className="text-sm">Other Members</span>
        </div>
        {meetupPoint && (
          <div className="flex items-center gap-2 mb-2">
            <div className="text-lg">📍</div>
            <span className="text-sm">Meet Up Point</span>
          </div>
        )}
        {/* 🆕 Week 7: 搜尋結果圖例 */}
        {searchResults.length > 0 && (
          <div className="flex items-center gap-2">
            <div style={{
              width: '20px',
              height: '20px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'white',
              fontWeight: 'bold',
              border: '2px solid white'
            }}>1</div>
            <span className="text-sm">Search Results</span>
          </div>
        )}
      </div>
    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView;

