// lib/gemini.ts
// Gemini AI 整合 - 用於理解使用者搜尋需求

import { GoogleGenerativeAI } from '@google/generative-ai';

// 初始化 Gemini AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

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
 * 使用 Gemini AI 理解使用者的搜尋需求
 */
export async function parseSearchIntent(
  userInput: string,
  context: GroupContext
): Promise<SearchQuery> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `You are a travel assistant helping a group find nearby places.

User Input: "${userInput}"

Context:
- Group size: ${context.groupSize} people
- Current time: ${context.currentTime.toLocaleString()}
- Location: ${context.currentLocation[1].toFixed(4)}, ${context.currentLocation[0].toFixed(4)}

Please analyze the user's intent and return ONLY a JSON object (no markdown, no explanation) with this structure:
{
  "category": "restaurant" | "cafe" | "gas_station" | "convenience" | "tourist_spot" | "hospital" | "rest_area",
  "keywords": ["keyword1", "keyword2"],
  "maxDistance": number (3-6 miles based on urgency),
  "preferences": ["open-now", "group-friendly", "highly-rated"],
  "urgency": "low" | "medium" | "high"
}

Category guidelines:
- "restaurant": mentions food, meal, lunch, dinner, eat, hungry
- "cafe": mentions coffee, tea, snack, break, relax
- "gas_station": mentions gas, fuel, refuel
- "convenience": mentions store, shop, buy, supplies
- "tourist_spot": mentions sightseeing, attraction, landmark, visit
- "hospital": mentions medical, emergency, doctor, pharmacy
- "rest_area": mentions rest, bathroom, restroom, break

Preferences guidelines:
- Always include "open-now" unless user says "later"
- Include "group-friendly" for groups > 4 people
- Include "highly-rated" by default

Urgency guidelines:
- "high": emergency words (urgent, now, quickly, emergency)
- "medium": meal times, gas, restroom
- "low": sightseeing, relaxing

Distance guidelines:
- high urgency: 10 miles max
- medium urgency: 30 miles max
- low urgency: 50 miles max`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // 移除可能的 markdown 標記
    let jsonText = text;
    if (text.startsWith('```json')) {
      jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (text.startsWith('```')) {
      jsonText = text.replace(/```\n?/g, '').trim();
    }

    const parsed = JSON.parse(jsonText);

    // 驗證並返回
    return {
      category: parsed.category || 'restaurant',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      maxDistance: parsed.maxDistance || 5,
      preferences: Array.isArray(parsed.preferences) ? parsed.preferences : ['open-now'],
      urgency: parsed.urgency || 'medium'
    };
  } catch (error) {
    console.error('Gemini AI parsing error:', error);
    
    // 備用：簡單關鍵字匹配
    return fallbackParser(userInput, context);
  }
}

/**
 * 備用解析器（當 AI 失敗時）
 */
function fallbackParser(userInput: string, context: GroupContext): SearchQuery {
  const input = userInput.toLowerCase();
  
  // 類別匹配
  let category: SearchQuery['category'] = 'restaurant';
  if (input.includes('coffee') || input.includes('cafe')) {
    category = 'cafe';
  } else if (input.includes('gas') || input.includes('fuel')) {
    category = 'gas_station';
  } else if (input.includes('store') || input.includes('shop')) {
    category = 'convenience';
  } else if (input.includes('sight') || input.includes('attraction')) {
    category = 'tourist_spot';
  } else if (input.includes('hospital') || input.includes('medical')) {
    category = 'hospital';
  } else if (input.includes('rest') || input.includes('bathroom')) {
    category = 'rest_area';
  }

  // 緊急度判斷
  let urgency: SearchQuery['urgency'] = 'medium';
  if (input.includes('urgent') || input.includes('emergency') || input.includes('now')) {
    urgency = 'high';
  } else if (input.includes('later') || input.includes('explore')) {
    urgency = 'low';
  }

  // 距離設定
  const maxDistance = urgency === 'high' ? 10 : urgency === 'medium' ? 30 : 50;

  return {
    category,
    keywords: input.split(' ').filter(word => word.length > 3),
    maxDistance,
    preferences: ['open-now', context.groupSize > 4 ? 'group-friendly' : 'highly-rated'],
    urgency
  };
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

