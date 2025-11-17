// components/AISearchBar.tsx
// AI 搜尋介面組件

'use client';

import { useState, KeyboardEvent } from 'react';
import { Loader2, Search, X, Sparkles } from 'lucide-react';

interface AISearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isLoading: boolean;
  hasResults: boolean;
}

export default function AISearchBar({
  onSearch,
  onClear,
  isLoading,
  hasResults
}: AISearchBarProps) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSearch(input.trim());
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleClear = () => {
    setInput('');
    onClear();
  };

  // 預設建議
  const suggestions = [
    'Find a restaurant for lunch',
    'Need gas station nearby',
    'Looking for coffee shop',
    'Find tourist attractions',
    'Need a rest area'
  ];

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-4 space-y-3">
      {/* 搜尋框 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask AI: 'Find a restaurant', 'Need gas', etc..."
            disabled={isLoading}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-900 placeholder-gray-400"
          />
        </div>

        {hasResults ? (
          <button
            onClick={handleClear}
            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
          >
            <X className="w-5 h-5" />
            Clear
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Search className="w-5 h-5" />
            Search
          </button>
        )}
      </div>

      {/* AI 提示 */}
      {!hasResults && !isLoading && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-purple-500" />
            AI-powered search understands natural language
          </p>
          
          {/* 快速建議 */}
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setInput(suggestion);
                  onSearch(suggestion);
                }}
                className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
