// lib/overpassSearch.ts
// 使用 OpenStreetMap Overpass API 搜尋附近地點
// 完全免費、不需要 API Key

import { SearchQuery } from './gemini';

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
  safetyScore: number;
  description?: string;
}

// OSM 類別映射
const OSM_CATEGORY_MAPPING: Record<string, string> = {
  restaurant: 'amenity~"restaurant|fast_food|cafe"',
  cafe: 'amenity~"cafe|coffee_shop"',
  gas_station: 'amenity="fuel"',
  convenience: 'shop~"convenience|supermarket"',
  tourist_spot: 'tourism~"attraction|museum|viewpoint"',
  hospital: 'amenity~"hospital|clinic|pharmacy"',
  rest_area: 'highway="rest_area"'
};

/**
 * 使用 Overpass API 搜尋附近地點
 */
export async function searchNearbyPlaces(
  query: SearchQuery,
  userLocation: [number, number], // [lng, lat]
  mapboxToken: string // 這個參數保留但不使用，為了兼容性
): Promise<MapboxPlace[]> {
  try {
    const [lng, lat] = userLocation;
    
    console.log('🔍 Overpass Search Parameters:', {
      query,
      userLocation: { lng, lat }
    });

    // 將英里轉換為公尺（Overpass 使用公尺）
    const radiusMeters = Math.round(query.maxDistance * 1609.34);
    
    // 取得 OSM 查詢
    const osmQuery = OSM_CATEGORY_MAPPING[query.category] || 'amenity~"restaurant|cafe"';
    
    // 建立 Overpass QL 查詢
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node[${osmQuery}](around:${radiusMeters},${lat},${lng});
        way[${osmQuery}](around:${radiusMeters},${lat},${lng});
      );
      out body;
      >;
      out skel qt;
    `;

    console.log('📡 Overpass Query:', overpassQuery);

    // 呼叫 Overpass API
    const url = 'https://overpass-api.de/api/interpreter';
    const response = await fetch(url, {
      method: 'POST',
      body: overpassQuery,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 Overpass response:', data);
    console.log('📍 Found elements:', data.elements?.length || 0);

    if (!data.elements || data.elements.length === 0) {
      console.warn('⚠️ No elements found');
      return [];
    }

    // 轉換結果
    const places: MapboxPlace[] = data.elements
      .filter((element: any) => element.type === 'node' && element.tags?.name)
      .map((element: any, index: number) => {
        const placeLat = element.lat;
        const placeLng = element.lon;
        const distance = calculateDistance(lat, lng, placeLat, placeLng);

        const tags = element.tags || {};
        
        console.log(`📍 Place ${index + 1}:`, {
          name: tags.name,
          distance: distance.toFixed(2) + ' miles',
          coordinates: [placeLng, placeLat]
        });

        return {
          id: `osm-${element.id}`,
          name: tags.name || 'Unknown',
          address: buildAddress(tags),
          coordinates: [placeLng, placeLat],
          distance,
          category: query.category,
          phone: tags.phone || tags['contact:phone'],
          rating: undefined, // OSM 沒有評分
          isOpen: estimateOpenStatus(tags),
          safetyScore: 0,
          description: tags.description || tags.cuisine || ''
        };
      })
      .filter((place: MapboxPlace) => {
        const withinRange = place.distance <= query.maxDistance;
        console.log(`✓ ${place.name}: ${place.distance.toFixed(2)}mi ${withinRange ? '✅ PASS' : '❌ TOO FAR'}`);
        return withinRange;
      });

    console.log(`✅ Filtered to ${places.length} places within ${query.maxDistance} miles`);

    // 計算安全評分
    const scoredPlaces = places.map(place => ({
      ...place,
      safetyScore: calculateSafetyScore(place, query)
    }));

    // 按安全評分排序
    scoredPlaces.sort((a, b) => b.safetyScore - a.safetyScore);

    console.log('🏆 Top 3 places:', scoredPlaces.slice(0, 3).map(p => ({
      name: p.name,
      distance: p.distance.toFixed(2) + 'mi',
      safetyScore: p.safetyScore.toFixed(1)
    })));

    // 返回至少 3 個結果
    const result = scoredPlaces.length >= 3 ? scoredPlaces.slice(0, 10) : scoredPlaces;
    
    console.log(`📊 Returning ${result.length} results`);
    return result;

  } catch (error) {
    console.error('💥 Overpass search error:', error);
    return [];
  }
}

/**
 * 建立地址字串
 */
function buildAddress(tags: any): string {
  const parts = [];
  
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
  
  return parts.length > 0 ? parts.join(', ') : 'Address not available';
}

/**
 * 估計營業狀態
 */
function estimateOpenStatus(tags: any): boolean {
  // OSM 的營業時間格式複雜，這裡簡化處理
  if (tags.opening_hours) {
    // 簡單假設：如果有營業時間資訊就可能開放
    return true;
  }
  return true; // 預設開放
}

/**
 * 計算距離（英里）
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
 * 計算安全評分（0-10）
 */
function calculateSafetyScore(place: MapboxPlace, query: SearchQuery): number {
  let score = 0;

  // 1. 距離評分（0-4 分）
  const distanceRatio = place.distance / query.maxDistance;
  if (distanceRatio <= 0.3) {
    score += 4;
  } else if (distanceRatio <= 0.6) {
    score += 3;
  } else {
    score += 2;
  }

  // 2. 有名稱（+2 分）
  if (place.name && place.name !== 'Unknown') {
    score += 2;
  }

  // 3. 有地址（+2 分）
  if (place.address && !place.address.includes('not available')) {
    score += 2;
  }

  // 4. 有電話（+2 分）
  if (place.phone) {
    score += 2;
  }

  return Math.min(score, 10);
}

// 導出工具函數（保持與 Mapbox 版本兼容）
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return 'Less than 0.1 mi';
  } else if (miles < 1) {
    return `${miles.toFixed(1)} mi`;
  } else {
    return `${miles.toFixed(1)} mi`;
  }
}

export function formatRating(rating?: number): string {
  if (!rating) return 'No rating';
  return `⭐ ${rating.toFixed(1)}`;
}

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

