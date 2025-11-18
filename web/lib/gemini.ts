// lib/gemini.ts
// 簡化版 - 不使用 Gemini AI，直接用關鍵字匹配

// 搜尋查詢結構
export interface SearchQuery {
  category: 'restaurant' | 'cafe' | 'gas_station' | 'convenience' | 'tourist_spot' | 'hospital' | 'rest_area';
  keywords: string[];
  maxDistance: number; // in miles
  preferences: string[];
  urgency: 'low' | 'medium' | 'high';
}

// 群組上下文
export interface GroupContext {
  groupSize: number;
  currentTime: Date;
  currentLocation: [number, number]; // [lng, lat]
  previousSearches?: string[];
}

/**
 * 簡單的關鍵字解析器（不使用 AI）
 */
export async function parseSearchIntent(
  userInput: string,
  context: GroupContext
): Promise<SearchQuery> {
  console.log('🔍 Parsing search (Simple mode):', userInput);
  
  const input = userInput.toLowerCase();
  
  // 類別匹配
  let category: SearchQuery['category'] = 'restaurant';
  let urgency: SearchQuery['urgency'] = 'medium';
  let keywords: string[] = [];
  
  // 餐廳相關
  if (input.includes('restaurant') || input.includes('food') || input.includes('eat') || 
      input.includes('lunch') || input.includes('dinner') || input.includes('breakfast')) {
    category = 'restaurant';
    keywords = ['restaurant', 'food'];
    urgency = 'medium';
  }
  // 咖啡廳
  else if (input.includes('coffee') || input.includes('cafe') || input.includes('tea')) {
    category = 'cafe';
    keywords = ['cafe', 'coffee'];
    urgency = 'low';
  }
  // 加油站
  else if (input.includes('gas') || input.includes('fuel') || input.includes('petrol')) {
    category = 'gas_station';
    keywords = ['gas', 'fuel'];
    urgency = input.includes('urgent') || input.includes('need') ? 'high' : 'medium';
  }
  // 便利商店
  else if (input.includes('store') || input.includes('shop') || input.includes('convenience')) {
    category = 'convenience';
    keywords = ['store', 'shop'];
    urgency = 'medium';
  }
  // 景點
  else if (input.includes('tourist') || input.includes('attraction') || input.includes('sight') || 
           input.includes('visit') || input.includes('landmark')) {
    category = 'tourist_spot';
    keywords = ['tourist', 'attraction'];
    urgency = 'low';
  }
  // 醫院
  else if (input.includes('hospital') || input.includes('medical') || input.includes('doctor') || 
           input.includes('clinic')) {
    category = 'hospital';
    keywords = ['hospital', 'medical'];
    urgency = 'high';
  }
  // 休息區
  else if (input.includes('rest') || input.includes('bathroom') || input.includes('restroom')) {
    category = 'rest_area';
    keywords = ['rest', 'area'];
    urgency = input.includes('urgent') || input.includes('need') ? 'high' : 'medium';
  }

  // 檢查緊急程度關鍵字
  if (input.includes('urgent') || input.includes('emergency') || input.includes('now') || 
      input.includes('quickly') || input.includes('asap')) {
    urgency = 'high';
  } else if (input.includes('later') || input.includes('explore') || input.includes('leisure')) {
    urgency = 'low';
  }

  // 距離設定
  const maxDistance = urgency === 'high' ? 10 : urgency === 'medium' ? 30 : 50;

  // 偏好設定
  const preferences: string[] = ['open-now'];
  if (context.groupSize > 4) {
    preferences.push('group-friendly');
  } else {
    preferences.push('highly-rated');
  }

  const result: SearchQuery = {
    category,
    keywords,
    maxDistance,
    preferences,
    urgency
  };

  console.log('✅ Parsed query (Simple mode):', result);
  
  return result;
}

/**
 * 生成友善的搜尋結果標題
 */
export async function generateSearchTitle(query: SearchQuery): Promise<string> {
  const categoryNames = {
    restaurant: 'restaurants',
    cafe: 'cafes',
    gas_station: 'gas stations',
    convenience: 'convenience stores',
    tourist_spot: 'tourist attractions',
    hospital: 'medical facilities',
    rest_area: 'rest areas'
  };

  return `Finding ${categoryNames[query.category]} within ${query.maxDistance} miles...`;
}

