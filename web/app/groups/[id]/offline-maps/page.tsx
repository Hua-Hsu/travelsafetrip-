// app/groups/[id]/offline-maps/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Trash2, Download, HardDrive, ChevronLeft } from 'lucide-react';
import { getMapTileCache } from '@/lib/mapTileCache';
import { DownloadedArea } from '@/types/offline';
import { offlineStorage } from '@/lib/offlineStorage';

export default function OfflineMapsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [downloadedAreas, setDownloadedAreas] = useState<DownloadedArea[]>([]);
  const [totalStorage, setTotalStorage] = useState<string>('0 MB');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDownloadedAreas();
  }, []);

  const loadDownloadedAreas = async () => {
    try {
      setIsLoading(true);
      const areas = await offlineStorage.getDownloadedAreas();
      setDownloadedAreas(areas);

      // 計算總儲存空間
      const totalBytes = await offlineStorage.getTotalStorageSize();
      setTotalStorage(formatBytes(totalBytes));
    } catch (error) {
      console.error('Failed to load downloaded areas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (areaId: string) => {
    if (!confirm('Are you sure you want to delete this offline map area?')) return;

    try {
      const cache = getMapTileCache(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!);
      await cache.deleteArea(areaId);
      await loadDownloadedAreas();
    } catch (error) {
      console.error('Failed to delete area:', error);
      alert('Delete failed, please try again later');
    }
  };

  const handleViewArea = (area: DownloadedArea) => {
    // 將區域資訊儲存到 localStorage，讓地圖頁面可以讀取
    localStorage.setItem('viewOfflineArea', JSON.stringify(area));
    // 導航到地圖頁面
    router.push(`/groups/${groupId}/map`);
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all offline map data? This action cannot be undone.')) return;

    try {
      await offlineStorage.clearAllData();
      await loadDownloadedAreas();
    } catch (error) {
      console.error('Failed to clear all data:', error);
      alert('Clear failed, please try again later');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/groups/${groupId}/map`)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-black" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-black">Offline Map Management</h1>
              <p className="text-sm text-black">Manage downloaded map areas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 儲存空間資訊 */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <HardDrive className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-black">Storage Used</p>
                <p className="text-2xl font-bold text-black">{totalStorage}</p>
              </div>
            </div>
            {downloadedAreas.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-semibold"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* 已下載的區域列表 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2 text-black">
              <Download className="w-5 h-5" />
              Downloaded Areas
              <span className="text-sm text-gray-500">({downloadedAreas.length})</span>
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-black">
              Loading...
            </div>
          ) : downloadedAreas.length === 0 ? (
            <div className="p-8 text-center text-black">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No offline maps downloaded yet</p>
              <p className="text-sm mt-1">Go to map page to select an area to download</p>
            </div>
          ) : (
            <div className="divide-y">
              {downloadedAreas.map((area) => (
                <div 
                  key={area.id} 
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleViewArea(area)}
                    >
                      <h3 className="font-semibold mb-1 text-black flex items-center gap-2 hover:text-blue-600">
                        <MapPin className="w-4 h-4" />
                        {area.name}
                      </h3>
                      <div className="text-sm text-black space-y-1">
                        <p>
                          <span className="font-medium">Location: </span>
                          {area.center.lat.toFixed(4)}, {area.center.lng.toFixed(4)}
                        </p>
                        <p>
                          <span className="font-medium">Tiles: </span>
                          {area.tileCount} tiles
                        </p>
                        <p>
                          <span className="font-medium">Size: </span>
                          {formatBytes(area.size)}
                        </p>
                        <p>
                          <span className="font-medium">Downloaded: </span>
                          {formatDate(area.downloadedAt)}
                        </p>
                      </div>
                      <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Click to view on map
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(area.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete area"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 使用說明 */}
        <div className="bg-blue-50 rounded-lg p-4 text-sm text-black">
          <p className="font-semibold mb-2">💡 Usage Tips:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Offline maps can be viewed without network connection</li>
            <li>Includes map tiles, meetup points and member locations</li>
            <li>Update regularly to get the latest data</li>
            <li>Delete unused areas to save storage space</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

