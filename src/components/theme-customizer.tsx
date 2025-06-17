"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme, type Theme } from '@/contexts/theme-context';
import { AVAILABLE_FONTS, DEFAULT_THEME } from '@/lib/theme-utils';
import { Palette, RotateCcw } from 'lucide-react';
import React, { useState, useEffect } from 'react';

export function ThemeCustomizer() {
  const { theme, setTheme, resetTheme } = useTheme();
  const [currentSettings, setCurrentSettings] = useState<Theme>(theme);

  useEffect(() => {
    setCurrentSettings(theme);
  }, [theme]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleFontChange = (fontName: string) => {
    setCurrentSettings(prev => ({ ...prev, font: fontName }));
  };

  const handleApplyChanges = () => {
    setTheme(currentSettings);
  };

  const handleResetToDefault = () => {
    resetTheme(); // This will also update currentSettings via useEffect
  };
  
  const colorInputContainerClass = "flex items-center gap-2";
  const colorInputClass = "h-8 w-16 p-0 border-none rounded-md cursor-pointer";


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Palette className="h-6 w-6 text-primary" />
          Customize Theme
        </CardTitle>
        <CardDescription>
          Adjust colors and fonts to your liking. Changes are previewed in real-time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Primary Color</Label>
          <div className={colorInputContainerClass}>
            <Input
              type="color"
              id="primaryColor"
              name="primary"
              value={currentSettings.primary}
              onChange={handleInputChange}
              className={colorInputClass}
              aria-label="Primary color picker"
            />
            <Input
              type="text"
              name="primary"
              value={currentSettings.primary}
              onChange={handleInputChange}
              className="h-8 flex-grow"
              aria-label="Primary color hex value"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="backgroundColor">Background Color</Label>
          <div className={colorInputContainerClass}>
            <Input
              type="color"
              id="backgroundColor"
              name="background"
              value={currentSettings.background}
              onChange={handleInputChange}
              className={colorInputClass}
              aria-label="Background color picker"
            />
            <Input
              type="text"
              name="background"
              value={currentSettings.background}
              onChange={handleInputChange}
              className="h-8 flex-grow"
              aria-label="Background color hex value"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="accentColor">Accent Color</Label>
           <div className={colorInputContainerClass}>
            <Input
              type="color"
              id="accentColor"
              name="accent"
              value={currentSettings.accent}
              onChange={handleInputChange}
              className={colorInputClass}
              aria-label="Accent color picker"
            />
            <Input
              type="text"
              name="accent"
              value={currentSettings.accent}
              onChange={handleInputChange}
              className="h-8 flex-grow"
              aria-label="Accent color hex value"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fontFamily">Font Family</Label>
          <Select value={currentSettings.font} onValueChange={handleFontChange}>
            <SelectTrigger id="fontFamily" aria-label="Select font family">
              <SelectValue placeholder="Select font" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_FONTS.map((font) => (
                <SelectItem key={font.name} value={font.name} style={{ fontFamily: font.family }}>
                  {font.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2">
        <Button onClick={handleApplyChanges} className="w-full sm:w-auto">
            Apply Changes
        </Button>
        <Button variant="outline" onClick={handleResetToDefault} className="w-full sm:w-auto">
          <RotateCcw className="mr-2 h-4 w-4" /> Reset to Default
        </Button>
      </CardFooter>
    </Card>
  );
}
