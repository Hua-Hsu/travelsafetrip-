// lib/mapboxSearch.ts
// Mapbox 搜尋引擎 - 用於搜尋附近地點

import { SearchQuery } from './gemini';

// Mapbox 地點結果
export interface MapboxPlace {
  id: string;
  name: string;
  address: string;
  coordinates: [number, number]; // [lng, lat]
  distance: number; // in miles
  category: string;
  phone?: string;
  rating?: number;
  isOpen?: boolean;
  safetyScore: number; // 0-10
  description?: string;
}

// Mapbox 類別映射
const CATEGORY_MAPPING = {
  restaurant: 'restaurant,food,eating',
  cafe: 'cafe,coffee',
  gas_station: 'gas,fuel',
  convenience: 'convenience,store,shop',
  tourist_spot: 'tourist_attraction,landmark,museum',
  hospital: 'hospital,clinic,pharmacy',
  rest_area: 'rest_area,restroom'
};

/**
 * 使用 Mapbox Search API 搜尋地點
 */
export async function searchNearbyPlaces(
  query: SearchQuery,
  userLocation: [number, number], // [lng, lat]
  mapboxToken: string
): Promise<MapboxPlace[]> {
  try {
    const [lng, lat] = userLocation;
    const categories = CATEGORY_MAPPING[query.category];
    const keywords = query.keywords.join(' ');
    
    // Mapbox Geocoding API 搜尋
    const searchQuery = keywords || query.category.replace('_', ' ');
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json`;
    
    const params = new URLSearchParams({
      access_token: mapboxToken,
      proximity: `${lng},${lat}`,
      types: 'poi',
      limit: '20',
      language: 'en'
    });

    const response = await fetch(`${url}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();
    
    // 轉換結果
    const places: MapboxPlace[] = data.features
      .map((feature: any) => {
        const [placeLng, placeLat] = feature.center;
        const distance = calculateDistance(lat, lng, placeLat, placeLng);
        
        // 從 Mapbox 數據提取資訊
        const properties = feature.properties || {};
        const context = feature.context || [];
        
        return {
          id: feature.id,
          name: feature.text || feature.place_name,
          address: extractAddress(feature),
          coordinates: [placeLng, placeLat],
          distance,
          category: properties.category || query.category,
          phone: properties.tel || properties.phone,
          rating: generateRating(feature), // 模擬評分
          isOpen: estimateOpenStatus(query),
          safetyScore: 0, // 將在下一步計算
          description: properties.description || ''
        };
      })
      .filter((place: MapboxPlace) => {
        // 距離過濾
        return place.distance <= query.maxDistance;
      });

    // 計算安全評分
    const scoredPlaces = places.map(place => ({
      ...place,
      safetyScore: calculateSafetyScore(place, query)
    }));

    // 按安全評分排序
    scoredPlaces.sort((a, b) => b.safetyScore - a.safetyScore);

    // 只返回評分 >= 7 的地點，至少 3 個
    const filteredPlaces = scoredPlaces.filter(p => p.safetyScore >= 7);
    
    return filteredPlaces.length >= 3 ? filteredPlaces.slice(0, 10) : scoredPlaces.slice(0, 3);
    
  } catch (error) {
    console.error('Mapbox search error:', error);
    return [];
  }
}

/**
 * 計算兩點之間的距離（英里）
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // 地球半徑（英里）
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 提取地址
 */
function extractAddress(feature: any): string {
  if (feature.place_name) {
    // 移除地點名稱，只保留地址
    const parts = feature.place_name.split(',');
    return parts.slice(1).join(',').trim();
  }
  return '';
}

/**
 * 生成評分（模擬）
 * 實際應用中可以整合真實評分 API
 */
function generateRating(feature: any): number {
  // 使用 Mapbox 的相關性分數作為基礎
  const relevance = feature.relevance || 0.5;
  
  // 生成 3.5 - 5.0 之間的評分
  return Math.round((3.5 + relevance * 1.5) * 10) / 10;
}

/**
 * 估計營業狀態
 */
function estimateOpenStatus(query: SearchQuery): boolean {
  // 如果使用者偏好要求 "open-now"，假設搜尋結果都是開放的
  // 實際應用中應該使用 Google Places API 或其他服務
  return query.preferences.includes('open-now');
}

/**
 * 計算安全評分（0-10）
 */
function calculateSafetyScore(place: MapboxPlace, query: SearchQuery): number {
  let score = 0;

  // 1. 距離評分（0-3 分）
  const distanceRatio = place.distance / query.maxDistance;
  if (distanceRatio <= 0.5) {
    score += 3; // 很近
  } else if (distanceRatio <= 0.75) {
    score += 2; // 中等距離
  } else {
    score += 1; // 較遠
  }

  // 2. 評分評分（0-3 分）
  if (place.rating) {
    if (place.rating >= 4.5) {
      score += 3;
    } else if (place.rating >= 4.0) {
      score += 2;
    } else if (place.rating >= 3.5) {
      score += 1;
    }
  } else {
    score += 1.5; // 無評分時給予中等分數
  }

  // 3. 營業狀態（0-2 分）
  if (place.isOpen) {
    score += 2;
  }

  // 4. 團體友善度（0-2 分）
  // 餐廳和景點更適合團體
  if (['restaurant', 'cafe', 'tourist_spot'].includes(query.category)) {
    score += 2;
  } else {
    score += 1;
  }

  return Math.min(score, 10);
}

/**
 * 格式化距離顯示
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return 'Less than 0.1 mi';
  } else if (miles < 1) {
    return `${miles.toFixed(1)} mi`;
  } else {
    return `${miles.toFixed(1)} mi`;
  }
}

/**
 * 格式化評分顯示
 */
export function formatRating(rating?: number): string {
  if (!rating) return 'No rating';
  return `⭐ ${rating.toFixed(1)}`;
}

/**
 * 獲取類別的友善名稱
 */
export function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    restaurant: 'Restaurant',
    cafe: 'Cafe',
    gas_station: 'Gas Station',
    convenience: 'Convenience Store',
    tourist_spot: 'Tourist Attraction',
    hospital: 'Medical Facility',
    rest_area: 'Rest Area'
  };
  return names[category] || category;
}

