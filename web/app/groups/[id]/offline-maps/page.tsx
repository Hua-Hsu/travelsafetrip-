// app/groups/[id]/map/page.tsx (修改版，整合離線功能)

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Download, Menu, Wifi, WifiOff } from 'lucide-react';

// 組件導入
import { ConnectionStatus } from '@/components/Ui/ConnectionStatus';
import { AreaSelector } from '@/components/map/AreaSelector';
import { DownloadProgress } from '@/components/map/DownloadProgress';

// Hooks 導入
import { useOfflineMap } from '@/hooks/useOfflineMap';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

// Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

export default function MapPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  // 地圖相關
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // UI 狀態
  const [showAreaSelector, setShowAreaSelector] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // 離線地圖功能
  const {
    isOfflineMode,
    downloadProgress,
    cachedLocations,
    cachedMeetupPoint,
    downloadArea,
    cacheUserLocations,
    cacheMeetupPoint
  } = useOfflineMap({
    groupId,
    mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!,
    map: map.current
  });

  // 網路狀態
  const { isOnline } = useNetworkStatus();

  /**
   * 初始化地圖
   */
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [121.5654, 25.0330], // 台北
      zoom: 13
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  /**
   * 在離線模式下顯示緩存的位置
   */
  useEffect(() => {
    if (!map.current || !mapLoaded || !isOfflineMode) return;

    // 清除現有的標記
    document.querySelectorAll('.cached-marker').forEach(el => el.remove());

    // 顯示緩存的成員位置
    cachedLocations.forEach(location => {
      const el = document.createElement('div');
      el.className = 'cached-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.backgroundColor = '#f59e0b';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';

      new mapboxgl.Marker(el)
        .setLngLat([location.longitude, location.latitude])
        .setPopup(
          new mapboxgl.Popup().setHTML(`
            <div>
              <strong>${location.userName}</strong>
              <p class="text-xs text-gray-500">最後位置（離線）</p>
            </div>
          `)
        )
        .addTo(map.current!);
    });

    // 顯示緩存的集合點
    if (cachedMeetupPoint) {
      const el = document.createElement('div');
      el.className = 'cached-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.backgroundColor = '#ef4444';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';

      new mapboxgl.Marker(el)
        .setLngLat([cachedMeetupPoint.longitude, cachedMeetupPoint.latitude])
        .setPopup(
          new mapboxgl.Popup().setHTML(`
            <div>
              <strong>集合點</strong>
              <p class="text-xs text-gray-500">${cachedMeetupPoint.name}</p>
            </div>
          `)
        )
        .addTo(map.current!);
    }
  }, [mapLoaded, isOfflineMode, cachedLocations, cachedMeetupPoint]);

  return (
    <div className="relative w-full h-screen">
      {/* 連線狀態指示器 */}
      <ConnectionStatus />

      {/* 地圖容器 */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* 離線模式提示 */}
      {isOfflineMode && (
        <div className="absolute top-20 left-4 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <WifiOff className="w-5 h-5" />
          <span className="font-semibold">離線模式</span>
        </div>
      )}

      {/* 工具列 */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {/* 下載離線地圖按鈕 */}
        {!isOfflineMode && (
          <button
            onClick={() => setShowAreaSelector(true)}
            className="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50"
            title="下載離線地圖"
          >
            <Download className="w-6 h-6" />
          </button>
        )}

        {/* 選單按鈕 */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50"
          title="選單"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* 選單 */}
      {showMenu && (
        <div className="absolute top-20 right-4 bg-white rounded-lg shadow-lg p-2 w-48">
          <button
            onClick={() => router.push(`/groups/${groupId}/offline-maps`)}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            管理離線地圖
          </button>
          <button
            onClick={() => router.push(`/groups/${groupId}/chat`)}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded"
          >
            返回聊天室
          </button>
        </div>
      )}

      {/* 區域選擇器 */}
      {showAreaSelector && map.current && (
        <AreaSelector
          map={map.current}
          mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!}
          onDownloadStart={(area) => {
            setShowAreaSelector(false);
            downloadArea(area);
          }}
          onCancel={() => setShowAreaSelector(false)}
        />
      )}

      {/* 下載進度 */}
      {downloadProgress && (
        <DownloadProgress
          progress={downloadProgress}
          onClose={() => {
            // 只在完成或失敗時允許關閉
            if (downloadProgress.status === 'completed' || downloadProgress.status === 'failed') {
              // downloadProgress 會自動清除
            }
          }}
        />
      )}

      {/* 在線/離線指示器 */}
      <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">在線</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium">離線</span>
          </>
        )}
      </div>
    </div>
  );
}

