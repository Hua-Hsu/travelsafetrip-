// lib/offlineStorage.ts

import { DownloadedArea, CachedLocation, CachedMeetupPoint, MapTile } from '@/types/offline';

const DB_NAME = 'TravelSafeTripOffline';
const DB_VERSION = 1;

// Store names
const STORES = {
  AREAS: 'downloadedAreas',
  TILES: 'mapTiles',
  LOCATIONS: 'cachedLocations',
  MEETUP: 'meetupPoints',
  METADATA: 'metadata'
};

class OfflineStorageManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains(STORES.AREAS)) {
          db.createObjectStore(STORES.AREAS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.TILES)) {
          db.createObjectStore(STORES.TILES, { keyPath: 'url' });
        }

        if (!db.objectStoreNames.contains(STORES.LOCATIONS)) {
          const locStore = db.createObjectStore(STORES.LOCATIONS, { keyPath: 'userId' });
          locStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.MEETUP)) {
          db.createObjectStore(STORES.MEETUP, { keyPath: 'groupId' });
        }

        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }
      };
    });
  }

  // ============ Downloaded Areas ============

  async saveDownloadedArea(area: DownloadedArea): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.AREAS], 'readwrite');
      const store = transaction.objectStore(STORES.AREAS);
      const request = store.put(area);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDownloadedAreas(): Promise<DownloadedArea[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.AREAS], 'readonly');
      const store = transaction.objectStore(STORES.AREAS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDownloadedArea(areaId: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.AREAS], 'readwrite');
      const store = transaction.objectStore(STORES.AREAS);
      const request = store.delete(areaId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============ Map Tiles ============

  async saveMapTile(url: string, blob: Blob): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.TILES], 'readwrite');
      const store = transaction.objectStore(STORES.TILES);
      const tile: MapTile = {
        url,
        blob,
        timestamp: new Date().toISOString()
      };
      const request = store.put(tile);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMapTile(url: string): Promise<MapTile | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.TILES], 'readonly');
      const store = transaction.objectStore(STORES.TILES);
      const request = store.get(url);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteMapTilesForArea(areaId: string): Promise<void> {
    // This would require storing areaId with each tile
    // For now, we'll delete all tiles older than a certain date
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.TILES], 'readwrite');
      const store = transaction.objectStore(STORES.TILES);
      const request = store.clear(); // For simplicity, clear all tiles

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getTotalStorageSize(): Promise<number> {
    if (!this.db) await this.init();
    
    // Get approximate storage size
    if ('estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    
    return 0;
  }

  // ============ Cached Locations ============

  async saveCachedLocations(locations: CachedLocation[]): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.LOCATIONS], 'readwrite');
      const store = transaction.objectStore(STORES.LOCATIONS);

      // Clear old data first
      store.clear();

      // Add new locations
      locations.forEach(loc => store.put(loc));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getCachedLocations(): Promise<CachedLocation[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.LOCATIONS], 'readonly');
      const store = transaction.objectStore(STORES.LOCATIONS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ Meetup Point ============

  async saveMeetupPoint(meetupPoint: CachedMeetupPoint): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MEETUP], 'readwrite');
      const store = transaction.objectStore(STORES.MEETUP);
      const request = store.put(meetupPoint);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMeetupPoint(groupId: string): Promise<CachedMeetupPoint | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MEETUP], 'readonly');
      const store = transaction.objectStore(STORES.MEETUP);
      const request = store.get(groupId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ Metadata ============

  async setLastSync(timestamp: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.METADATA], 'readwrite');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.put({ key: 'lastSync', value: timestamp });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLastSync(): Promise<string | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.METADATA], 'readonly');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.get('lastSync');

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ Clear All Data ============

  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();
    
    const storeNames = Object.values(STORES);
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeNames, 'readwrite');
      
      storeNames.forEach(storeName => {
        transaction.objectStore(storeName).clear();
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageManager();

