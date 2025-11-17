// hooks/useAISearch.ts
// AI 搜尋邏輯 Hook

import { useState, useCallback } from 'react';
import { parseSearchIntent, generateSearchTitle, SearchQuery, GroupContext } from '@/lib/gemini';
import { searchNearbyPlaces, MapboxPlace } from '@/lib/mapboxSearch';

export interface SearchState {
  isLoading: boolean;
  results: MapboxPlace[];
  query: SearchQuery | null;
  error: string | null;
  searchTitle: string | null;
}

export function useAISearch(
  userLocation: [number, number],
  groupSize: number
) {
  // 直接從環境變數讀取
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: false,
    results: [],
    query: null,
    error: null,
    searchTitle: null
  });

  /**
   * 執行 AI 搜尋
   */
  const performSearch = useCallback(async (userInput: string) => {
    if (!userInput.trim()) {
      setSearchState(prev => ({
        ...prev,
        error: 'Please enter a search query'
      }));
      return;
    }

    setSearchState({
      isLoading: true,
      results: [],
      query: null,
      error: null,
      searchTitle: null
    });

    try {
      // 1. 使用 Gemini AI 理解需求
      const context: GroupContext = {
        groupSize,
        currentTime: new Date(),
        currentLocation: userLocation
      };

      const query = await parseSearchIntent(userInput, context);
      const title = await generateSearchTitle(query);

      // 2. 使用 Mapbox 搜尋地點
      const places = await searchNearbyPlaces(query, userLocation, mapboxToken);

      if (places.length === 0) {
        setSearchState({
          isLoading: false,
          results: [],
          query,
          error: 'No places found matching your criteria. Try a different search.',
          searchTitle: title
        });
        return;
      }

      // 3. 更新結果
      setSearchState({
        isLoading: false,
        results: places,
        query,
        error: null,
        searchTitle: title
      });

    } catch (error) {
      console.error('Search error:', error);
      setSearchState({
        isLoading: false,
        results: [],
        query: null,
        error: error instanceof Error ? error.message : 'Search failed. Please try again.',
        searchTitle: null
      });
    }
  }, [mapboxToken, userLocation, groupSize]);

  /**
   * 清除搜尋結果
   */
  const clearSearch = useCallback(() => {
    setSearchState({
      isLoading: false,
      results: [],
      query: null,
      error: null,
      searchTitle: null
    });
  }, []);

  return {
    ...searchState,
    performSearch,
    clearSearch
  };
}

