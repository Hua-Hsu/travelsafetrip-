// ================================
// Week 4: 位置相關工具函數
// lib/locationUtils.ts
// ================================

import * as turf from '@turf/turf';

/**
 * 獲取用戶當前位置
 */
export const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('瀏覽器不支援地理定位'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

/**
 * 持續追蹤用戶位置
 */
export const watchPosition = (
  onSuccess: (position: GeolocationPosition) => void,
  onError: (error: GeolocationPositionError) => void
): number => {
  if (!navigator.geolocation) {
    onError({
      code: 0,
      message: '瀏覽器不支援地理定位',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3
    } as GeolocationPositionError);
    return -1;
  }

  return navigator.geolocation.watchPosition(
    onSuccess,
    onError,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    }
  );
};

/**
 * 停止追蹤位置
 */
export const clearWatch = (watchId: number): void => {
  if (watchId !== -1) {
    navigator.geolocation.clearWatch(watchId);
  }
};

/**
 * 計算兩點之間的距離（使用 Turf.js）
 * @returns 距離（公里）
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const from = turf.point([lon1, lat1]);
  const to = turf.point([lon2, lat2]);
  return turf.distance(from, to, { units: 'kilometers' });
};

/**
 * 格式化距離顯示
 */
export const formatDistance = (distanceInKm: number): string => {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)}m`;
  }
  return `${distanceInKm.toFixed(2)}km`;
};

/**
 * 檢查位置權限狀態
 */
export const checkLocationPermission = async (): Promise<PermissionState> => {
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return result.state;
  } catch (error) {
    console.error('無法檢查位置權限:', error);
    return 'prompt';
  }
};

/**
 * 計算地圖的邊界框（包含所有成員）
 */
export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export const calculateBounds = (
  locations: Array<{ latitude: number; longitude: number }>
): Bounds | null => {
  if (locations.length === 0) return null;

  const bounds: Bounds = {
    minLat: locations[0].latitude,
    maxLat: locations[0].latitude,
    minLng: locations[0].longitude,
    maxLng: locations[0].longitude
  };

  locations.forEach(loc => {
    bounds.minLat = Math.min(bounds.minLat, loc.latitude);
    bounds.maxLat = Math.max(bounds.maxLat, loc.latitude);
    bounds.minLng = Math.min(bounds.minLng, loc.longitude);
    bounds.maxLng = Math.max(bounds.maxLng, loc.longitude);
  });

  return bounds;
};

/**
 * 位置數據類型
 */
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

/**
 * 成員位置類型
 */
export interface MemberLocation {
  id: string;
  device_id: string;
  device_name: string;
  latitude: number;
  longitude: number;
  location_updated_at: string;
  distance?: number; // 與當前用戶的距離
}

/**
 * 驗證座標是否有效
 */
export const isValidCoordinate = (lat: number, lng: number): boolean => {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

/**
 * 獲取位置更新的時間差（人類可讀格式）
 */
export const getLocationAge = (timestamp: string): string => {
  const now = new Date();
  const updated = new Date(timestamp);
  const diffMs = now.getTime() - updated.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return '剛剛';
  if (diffMins < 60) return `${diffMins}分鐘前`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}小時前`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}天前`;
};

