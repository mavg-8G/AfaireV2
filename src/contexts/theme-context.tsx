"use client";

import type { PersonalizeThemeOutput } from '@/ai/flows/personalize-theme';
import { DEFAULT_THEME, applyThemeToCssVariables } from '@/lib/theme-utils';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface Theme {
  name: string;
  primary: string;
  background: string;
  accent: string;
  font: string;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resetTheme: () => void;
  aiSuggestedTheme: PersonalizeThemeOutput | null;
  setAiSuggestedTheme: Dispatch<SetStateAction<PersonalizeThemeOutput | null>>;
  applyAiSuggestion: () => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'app-everyone-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [aiSuggestedTheme, setAiSuggestedTheme] = useState<PersonalizeThemeOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const storedTheme = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedTheme) {
      try {
        const parsedTheme = JSON.parse(storedTheme);
        // Validate parsedTheme structure if necessary
        setThemeState(parsedTheme);
        applyThemeToCssVariables(parsedTheme);
      } catch (error) {
        console.error("Failed to parse stored theme:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
        applyThemeToCssVariables(DEFAULT_THEME);
      }
    } else {
      applyThemeToCssVariables(DEFAULT_THEME);
    }
    setIsLoading(false);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyThemeToCssVariables(newTheme);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newTheme));
  };

  const resetTheme = () => {
    setTheme(DEFAULT_THEME);
    setAiSuggestedTheme(null);
  };

  const applyAiSuggestion = () => {
    if (aiSuggestedTheme) {
      const newTheme: Theme = {
        name: aiSuggestedTheme.themeName || 'AI Suggested Theme',
        primary: aiSuggestedTheme.primaryColor,
        background: aiSuggestedTheme.backgroundColor,
        accent: aiSuggestedTheme.accentColor,
        font: aiSuggestedTheme.font,
      };
      setTheme(newTheme);
    }
  };
  
  // This effect ensures that the CSS variables are updated on initial load IF the theme is not from localStorage
  // and also when theme state changes through other means (like programmatic updates not going through setTheme directly).
  useEffect(() => {
    if (!isLoading) { // Only apply after initial load/hydration
        applyThemeToCssVariables(theme);
    }
  }, [theme, isLoading]);


  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resetTheme,
        aiSuggestedTheme,
        setAiSuggestedTheme,
        applyAiSuggestion,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
