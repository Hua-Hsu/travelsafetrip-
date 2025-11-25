// lib/mapTileCache.ts

import { offlineStorage } from './offlineStorage';
import { DownloadedArea, DownloadProgress } from '@/types/offline';

interface TileBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export class MapTileCache {
  private mapboxToken: string;
  private styleUrl: string = 'mapbox://styles/mapbox/streets-v12';

  constructor(mapboxToken: string) {
    this.mapboxToken = mapboxToken;
  }

  /**
   * 計算地理座標對應的圖磚座標
   */
  private latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lon + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
    return { x, y };
  }

  /**
   * 計算需要下載的圖磚範圍
   */
  private calculateTileBounds(bounds: DownloadedArea['bounds'], zoom: number): TileBounds {
    const topLeft = this.latLonToTile(bounds.north, bounds.west, zoom);
    const bottomRight = this.latLonToTile(bounds.south, bounds.east, zoom);

    return {
      minX: Math.min(topLeft.x, bottomRight.x),
      maxX: Math.max(topLeft.x, bottomRight.x),
      minY: Math.min(topLeft.y, bottomRight.y),
      maxY: Math.max(topLeft.y, bottomRight.y)
    };
  }

  /**
   * 生成圖磚 URL
   */
  private getTileUrl(x: number, y: number, zoom: number): string {
    // Mapbox raster tile URL
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/${zoom}/${x}/${y}?access_token=${this.mapboxToken}`;
  }

  /**
   * 下載單個圖磚
   */
  private async downloadTile(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download tile: ${response.statusText}`);
    }
    return await response.blob();
  }

  /**
   * 下載指定區域的所有圖磚
   */
  async downloadArea(
    area: DownloadedArea,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    try {
      // 計算需要下載的圖磚
      const tileBounds = this.calculateTileBounds(area.bounds, area.zoom);
      const tiles: Array<{ x: number; y: number; url: string }> = [];

      for (let x = tileBounds.minX; x <= tileBounds.maxX; x++) {
        for (let y = tileBounds.minY; y <= tileBounds.maxY; y++) {
          const url = this.getTileUrl(x, y, area.zoom);
          tiles.push({ x, y, url });
        }
      }

      const totalTiles = tiles.length;
      let downloadedTiles = 0;

      // 報告準備狀態
      onProgress?.({
        areaId: area.id,
        totalTiles,
        downloadedTiles: 0,
        percentage: 0,
        status: 'preparing'
      });

      // 下載圖磚（分批處理避免過多並發請求）
      const batchSize = 10;
      for (let i = 0; i < tiles.length; i += batchSize) {
        const batch = tiles.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (tile) => {
            try {
              const blob = await this.downloadTile(tile.url);
              await offlineStorage.saveMapTile(tile.url, blob);
              downloadedTiles++;

              // 報告進度
              onProgress?.({
                areaId: area.id,
                totalTiles,
                downloadedTiles,
                percentage: Math.round((downloadedTiles / totalTiles) * 100),
                status: 'downloading'
              });
            } catch (error) {
              console.error(`Failed to download tile ${tile.url}:`, error);
              // 繼續下載其他圖磚
            }
          })
        );
      }

      // 計算總大小
      const storageSize = await offlineStorage.getTotalStorageSize();

      // 保存區域資訊
      const areaToSave: DownloadedArea = {
        ...area,
        tileCount: downloadedTiles,
        size: storageSize,
        downloadedAt: new Date().toISOString()
      };

      await offlineStorage.saveDownloadedArea(areaToSave);

      // 報告完成
      onProgress?.({
        areaId: area.id,
        totalTiles,
        downloadedTiles,
        percentage: 100,
        status: 'completed'
      });

    } catch (error) {
      console.error('Error downloading area:', error);
      onProgress?.({
        areaId: area.id,
        totalTiles: 0,
        downloadedTiles: 0,
        percentage: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 獲取緩存的圖磚
   */
  async getCachedTile(url: string): Promise<string | null> {
    const tile = await offlineStorage.getMapTile(url);
    if (tile) {
      return URL.createObjectURL(tile.blob);
    }
    return null;
  }

  /**
   * 檢查圖磚是否已緩存
   */
  async isTileCached(url: string): Promise<boolean> {
    const tile = await offlineStorage.getMapTile(url);
    return tile !== null;
  }

  /**
   * 刪除指定區域的圖磚
   */
  async deleteArea(areaId: string): Promise<void> {
    await offlineStorage.deleteDownloadedArea(areaId);
    // Note: 實際應該只刪除屬於該區域的圖磚
    // 為簡化，這裡可以選擇不刪除圖磚（因為其他區域可能也需要）
  }

  /**
   * 獲取所有已下載的區域
   */
  async getDownloadedAreas(): Promise<DownloadedArea[]> {
    return await offlineStorage.getDownloadedAreas();
  }

  /**
   * 估算下載大小
   */
  estimateDownloadSize(bounds: DownloadedArea['bounds'], zoom: number): {
    tileCount: number;
    estimatedSize: string;
  } {
    const tileBounds = this.calculateTileBounds(bounds, zoom);
    const tileCount = 
      (tileBounds.maxX - tileBounds.minX + 1) * 
      (tileBounds.maxY - tileBounds.minY + 1);
    
    // 假設每個圖磚約 50KB
    const avgTileSize = 50 * 1024;
    const totalBytes = tileCount * avgTileSize;
    
    // 格式化大小
    const estimatedSize = this.formatBytes(totalBytes);

    return { tileCount, estimatedSize };
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}

// 建立單例
let mapTileCacheInstance: MapTileCache | null = null;

export function getMapTileCache(mapboxToken?: string): MapTileCache {
  if (!mapTileCacheInstance) {
    if (!mapboxToken) {
      throw new Error('Mapbox token is required to initialize MapTileCache');
    }
    mapTileCacheInstance = new MapTileCache(mapboxToken);
  }
  return mapTileCacheInstance;
}

