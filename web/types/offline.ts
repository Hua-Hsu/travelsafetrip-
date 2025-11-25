// types/offline.ts

export interface DownloadedArea {
  id: string;
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
  downloadedAt: string;
  size: number; // in bytes
  tileCount: number;
}

export interface CachedLocation {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  userName: string;
}

export interface CachedMeetupPoint {
  groupId: string;
  latitude: number;
  longitude: number;
  name: string;
  timestamp: string;
}

export interface MapTile {
  url: string;
  blob: Blob;
  timestamp: string;
}

export interface OfflineStorage {
  areas: DownloadedArea[];
  tiles: Map<string, MapTile>;
  userLocations: CachedLocation[];
  meetupPoint: CachedMeetupPoint | null;
  lastSync: string;
}

export interface DownloadProgress {
  areaId: string;
  totalTiles: number;
  downloadedTiles: number;
  percentage: number;
  status: 'preparing' | 'downloading' | 'completed' | 'failed';
  error?: string;
}

export interface NetworkStatus {
  isOnline: boolean;
  isReconnecting: boolean;
  lastConnected: string | null;
  reconnectAttempts: number;
}

