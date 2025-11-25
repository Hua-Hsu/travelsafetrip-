// components/map/AreaSelector.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { Square, Download, X } from 'lucide-react';
import { DownloadedArea } from '@/types/offline';
import { getMapTileCache } from '@/lib/mapTileCache';

interface AreaSelectorProps {
  map: mapboxgl.Map;
  mapboxToken: string;
  onDownloadStart: (area: DownloadedArea) => void;
  onCancel: () => void;
}

export function AreaSelector({ map, mapboxToken, onDownloadStart, onCancel }: AreaSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [bounds, setBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  const [areaName, setAreaName] = useState('');
  const [estimatedSize, setEstimatedSize] = useState<{
    tileCount: number;
    estimatedSize: string;
  } | null>(null);

  const rectangleRef = useRef<mapboxgl.Marker | null>(null);
  const startPoint = useRef<{ lng: number; lat: number } | null>(null);

  useEffect(() => {
    if (!isSelecting) return;

    const canvas = map.getCanvas();
    canvas.style.cursor = 'crosshair';

    let rectangle: HTMLDivElement | null = null;

    const onMouseDown = (e: mapboxgl.MapMouseEvent) => {
      startPoint.current = e.lngLat;

      // 建立矩形 div
      rectangle = document.createElement('div');
      rectangle.style.position = 'absolute';
      rectangle.style.border = '2px solid #3b82f6';
      rectangle.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      rectangle.style.pointerEvents = 'none';
      canvas.parentElement?.appendChild(rectangle);

      map.on('mousemove', onMouseMove);
      map.once('mouseup', onMouseUp);
    };

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (!startPoint.current || !rectangle) return;

      const startPixel = map.project(startPoint.current);
      const endPixel = map.project(e.lngLat);

      const minX = Math.min(startPixel.x, endPixel.x);
      const maxX = Math.max(startPixel.x, endPixel.x);
      const minY = Math.min(startPixel.y, endPixel.y);
      const maxY = Math.max(startPixel.y, endPixel.y);

      rectangle.style.left = `${minX}px`;
      rectangle.style.top = `${minY}px`;
      rectangle.style.width = `${maxX - minX}px`;
      rectangle.style.height = `${maxY - minY}px`;
    };

    const onMouseUp = (e: mapboxgl.MapMouseEvent) => {
      if (!startPoint.current) return;

      map.off('mousemove', onMouseMove);
      canvas.style.cursor = '';

      // 計算邊界
      const north = Math.max(startPoint.current.lat, e.lngLat.lat);
      const south = Math.min(startPoint.current.lat, e.lngLat.lat);
      const east = Math.max(startPoint.current.lng, e.lngLat.lng);
      const west = Math.min(startPoint.current.lng, e.lngLat.lng);

      setBounds({ north, south, east, west });

      // 估算下載大小
      const cache = getMapTileCache(mapboxToken);
      const zoom = Math.round(map.getZoom());
      const estimate = cache.estimateDownloadSize({ north, south, east, west }, zoom);
      setEstimatedSize(estimate);

      // 移除矩形
      if (rectangle && rectangle.parentElement) {
        rectangle.parentElement.removeChild(rectangle);
      }

      setIsSelecting(false);
    };

    map.on('mousedown', onMouseDown);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      canvas.style.cursor = '';
      if (rectangle && rectangle.parentElement) {
        rectangle.parentElement.removeChild(rectangle);
      }
    };
  }, [isSelecting, map, mapboxToken]);

  const handleStartSelection = () => {
    setIsSelecting(true);
    setBounds(null);
    setEstimatedSize(null);
  };

  const handleDownload = () => {
    if (!bounds) return;

    const area: DownloadedArea = {
      id: Date.now().toString(),
      name: areaName || '未命名區域',
      bounds,
      center: {
        lat: (bounds.north + bounds.south) / 2,
        lng: (bounds.east + bounds.west) / 2
      },
      zoom: Math.round(map.getZoom()),
      downloadedAt: new Date().toISOString(),
      size: 0,
      tileCount: 0
    };

    onDownloadStart(area);
  };

  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Square className="w-5 h-5" />
          下載離線地圖
        </h3>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {!bounds ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            在地圖上拖曳選擇要下載的區域
          </p>
          <button
            onClick={handleStartSelection}
            disabled={isSelecting}
            className={`
              w-full px-4 py-2 rounded-lg font-semibold
              ${isSelecting
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
            `}
          >
            {isSelecting ? '請在地圖上選擇區域...' : '開始選擇'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">區域名稱</label>
            <input
              type="text"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              placeholder="例如：台北市中心"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {estimatedSize && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">預估下載大小：</p>
              <p>圖磚數量：{estimatedSize.tileCount} 個</p>
              <p>檔案大小：約 {estimatedSize.estimatedSize}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                setBounds(null);
                setEstimatedSize(null);
                setAreaName('');
              }}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              重選
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              下載
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

