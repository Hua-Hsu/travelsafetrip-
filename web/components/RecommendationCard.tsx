// components/RecommendationCard.tsx
// 推薦地點卡片組件

'use client';

import { MapPin, Navigation, Phone, Star, Clock, TrendingUp } from 'lucide-react';
import { MapboxPlace, formatDistance, formatRating, getCategoryDisplayName } from '@/lib/mapboxSearch';

interface RecommendationCardProps {
  place: MapboxPlace;
  onNavigate: (coordinates: [number, number]) => void;
  onFlyTo: (coordinates: [number, number]) => void;
  rank: number;
}

export default function RecommendationCard({
  place,
  onNavigate,
  onFlyTo,
  rank
}: RecommendationCardProps) {
  const safetyColor = 
    place.safetyScore >= 8 ? 'text-green-600' :
    place.safetyScore >= 7 ? 'text-yellow-600' :
    'text-orange-600';

  const safetyBg = 
    place.safetyScore >= 8 ? 'bg-green-50' :
    place.safetyScore >= 7 ? 'bg-yellow-50' :
    'bg-orange-50';

  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 cursor-pointer border-2 border-transparent hover:border-blue-300"
      onClick={() => onFlyTo(place.coordinates)}
    >
      {/* 排名標籤 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
            #{rank}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">{place.name}</h3>
            <p className="text-sm text-gray-600">{getCategoryDisplayName(place.category)}</p>
          </div>
        </div>

        {/* 安全評分 */}
        <div className={`px-2 py-1 rounded-full ${safetyBg} flex items-center gap-1`}>
          <TrendingUp className={`w-4 h-4 ${safetyColor}`} />
          <span className={`text-sm font-bold ${safetyColor}`}>
            {place.safetyScore.toFixed(1)}
          </span>
        </div>
      </div>

      {/* 地址 */}
      <div className="flex items-start gap-2 mb-3">
        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-gray-600 line-clamp-2">{place.address}</p>
      </div>

      {/* 資訊列 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* 距離 */}
        <div className="flex items-center gap-1.5 text-sm">
          <Navigation className="w-4 h-4 text-blue-600" />
          <span className="text-gray-700 font-medium">{formatDistance(place.distance)}</span>
        </div>

        {/* 評分 */}
        {place.rating && (
          <div className="flex items-center gap-1.5 text-sm">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-gray-700 font-medium">{place.rating.toFixed(1)}</span>
          </div>
        )}

        {/* 營業狀態 */}
        {place.isOpen !== undefined && (
          <div className="flex items-center gap-1.5 text-sm col-span-2">
            <Clock className="w-4 h-4 text-green-600" />
            <span className={place.isOpen ? 'text-green-600 font-medium' : 'text-red-600'}>
              {place.isOpen ? 'Open now' : 'Closed'}
            </span>
          </div>
        )}

        {/* 電話 */}
        {place.phone && (
          <div className="flex items-center gap-1.5 text-sm col-span-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <a 
              href={`tel:${place.phone}`}
              className="text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {place.phone}
            </a>
          </div>
        )}
      </div>

      {/* 安全評分說明 */}
      <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
        <div className="font-medium mb-1">Why this is recommended:</div>
        <ul className="space-y-0.5 list-disc list-inside">
          {place.distance <= 3 && <li>Very close distance</li>}
          {place.rating && place.rating >= 4.5 && <li>Highly rated</li>}
          {place.isOpen && <li>Currently open</li>}
          {place.safetyScore >= 8 && <li>Excellent for groups</li>}
        </ul>
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFlyTo(place.coordinates);
          }}
          className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
        >
          Show on Map
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(place.coordinates);
          }}
          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
        >
          <Navigation className="w-4 h-4" />
          Navigate
        </button>
      </div>
    </div>
  );
}
