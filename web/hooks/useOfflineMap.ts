// hooks/useOfflineMap.ts

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMapTileCache } from '@/lib/mapTileCache';
import { offlineStorage } from '@/lib/offlineStorage';
import { DownloadedArea, DownloadProgress, CachedLocation, CachedMeetupPoint } from '@/types/offline';
import mapboxgl from 'mapbox-gl';

interface UseOfflineMapOptions {
  groupId: string;
  mapboxToken: string;
  map: mapboxgl.Map | null;
}

export function useOfflineMap({ groupId, mapboxToken, map }: UseOfflineMapOptions) {
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [cachedLocations, setCachedLocations] = useState<CachedLocation[]>([]);
  const [cachedMeetupPoint, setCachedMeetupPoint] = useState<CachedMeetupPoint | null>(null);

  /**
   * 檢查是否為離線模式
   */
  useEffect(() => {
    const checkOnlineStatus = () => {
      setIsOfflineMode(!navigator.onLine);
    };

    checkOnlineStatus();
    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);

    return () => {
      window.removeEventListener('online', checkOnlineStatus);
      window.removeEventListener('offline', checkOnlineStatus);
    };
  }, []);

  /**
   * 載入緩存的資料
   */
  useEffect(() => {
    if (isOfflineMode) {
      loadCachedData();
    }
  }, [isOfflineMode, groupId]);

  const loadCachedData = async () => {
    try {
      const locations = await offlineStorage.getCachedLocations();
      const meetupPoint = await offlineStorage.getMeetupPoint(groupId);
      
      setCachedLocations(locations);
      setCachedMeetupPoint(meetupPoint);
    } catch (error) {
      console.error('Failed to load cached data:', error);
    }
  };

  /**
   * 下載離線地圖區域
   */
  const downloadArea = useCallback(async (area: DownloadedArea) => {
    try {
      const cache = getMapTileCache(mapboxToken);
      
      await cache.downloadArea(area, (progress) => {
        setDownloadProgress(progress);
      });

      // 下載完成後清除進度
      setTimeout(() => {
        setDownloadProgress(null);
      }, 3000);

    } catch (error) {
      console.error('Failed to download area:', error);
      setDownloadProgress({
        areaId: area.id,
        totalTiles: 0,
        downloadedTiles: 0,
        percentage: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [mapboxToken]);

  /**
   * 緩存當前的使用者位置
   */
  const cacheUserLocations = useCallback(async (locations: CachedLocation[]) => {
    try {
      await offlineStorage.saveCachedLocations(locations);
      setCachedLocations(locations);
    } catch (error) {
      console.error('Failed to cache user locations:', error);
    }
  }, []);

  /**
   * 緩存集合點
   */
  const cacheMeetupPoint = useCallback(async (meetupPoint: CachedMeetupPoint) => {
    try {
      await offlineStorage.saveMeetupPoint(meetupPoint);
      setCachedMeetupPoint(meetupPoint);
    } catch (error) {
      console.error('Failed to cache meetup point:', error);
    }
  }, []);

  /**
   * 設置離線地圖圖磚攔截器
   */
  useEffect(() => {
    if (!map || !isOfflineMode) return;

    const cache = getMapTileCache(mapboxToken);

    // 攔截圖磚請求，使用緩存的圖磚
    const originalTransformRequest = (map as any)._requestManager._transformRequestFn;

    (map as any)._requestManager.setTransformRequest((url: string, resourceType: string) => {
      if (resourceType === 'Tile' && isOfflineMode) {
        // 在離線模式下，嘗試從緩存載入圖磚
        cache.getCachedTile(url).then(cachedUrl => {
          if (cachedUrl) {
            // 使用緩存的圖磚
            return { url: cachedUrl };
          }
          // 如果沒有緩存，返回原始 URL（會失敗）
          return { url };
        });
      }
      
      // 使用原始的 transform 函數
      return originalTransformRequest ? originalTransformRequest(url, resourceType) : { url };
    });

    return () => {
      // 恢復原始的 transform 函數
      if (originalTransformRequest) {
        (map as any)._requestManager.setTransformRequest(originalTransformRequest);
      }
    };
  }, [map, isOfflineMode, mapboxToken]);

  /**
   * 獲取已下載的區域
   */
  const getDownloadedAreas = useCallback(async (): Promise<DownloadedArea[]> => {
    try {
      const cache = getMapTileCache(mapboxToken);
      return await cache.getDownloadedAreas();
    } catch (error) {
      console.error('Failed to get downloaded areas:', error);
      return [];
    }
  }, [mapboxToken]);

  return {
    isOfflineMode,
    downloadProgress,
    cachedLocations,
    cachedMeetupPoint,
    downloadArea,
    cacheUserLocations,
    cacheMeetupPoint,
    getDownloadedAreas
  };
}

