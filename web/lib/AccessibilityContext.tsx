// ================================
// Week 5: 無障礙模式 Context
// lib/AccessibilityContext.tsx
// ================================

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilityContextType {
  isAccessibilityMode: boolean;
  toggleAccessibilityMode: () => void;
  fontSize: 'normal' | 'large';
  setFontSize: (size: 'normal' | 'large') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [isAccessibilityMode, setIsAccessibilityMode] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');

  // 從 localStorage 載入設定
  useEffect(() => {
    const savedMode = localStorage.getItem('accessibility_mode');
    const savedFontSize = localStorage.getItem('font_size');
    
    if (savedMode === 'true') {
      setIsAccessibilityMode(true);
    }
    
    if (savedFontSize === 'large') {
      setFontSize('large');
    }
  }, []);

  // 切換無障礙模式
  const toggleAccessibilityMode = () => {
    const newMode = !isAccessibilityMode;
    setIsAccessibilityMode(newMode);
    localStorage.setItem('accessibility_mode', String(newMode));
    
    // 自動切換到大字體
    if (newMode) {
      setFontSize('large');
      localStorage.setItem('font_size', 'large');
    }
  };

  // 應用全局樣式
  useEffect(() => {
    if (isAccessibilityMode) {
      document.documentElement.classList.add('accessibility-mode');
    } else {
      document.documentElement.classList.remove('accessibility-mode');
    }

    if (fontSize === 'large') {
      document.documentElement.classList.add('large-font');
    } else {
      document.documentElement.classList.remove('large-font');
    }
  }, [isAccessibilityMode, fontSize]);

  return (
    <AccessibilityContext.Provider
      value={{
        isAccessibilityMode,
        toggleAccessibilityMode,
        fontSize,
        setFontSize: (size) => {
          setFontSize(size);
          localStorage.setItem('font_size', size);
        }
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

