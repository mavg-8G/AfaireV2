import type { Theme } from '@/contexts/theme-context';

export const DEFAULT_THEME: Theme = {
  name: 'Default',
  primary: '#9F50E3', // Vivid Purple
  background: '#EEE7F7', // Light Lavender
  accent: '#50E3D6', // Electric Blue
  font: 'PT Sans',
};

export const AVAILABLE_FONTS = [
  { name: 'PT Sans', family: "'PT Sans', sans-serif" },
  { name: 'Inter', family: "'Inter', sans-serif" },
  { name: 'Roboto', family: "'Roboto', sans-serif" },
  { name: 'Open Sans', family: "'Open Sans', sans-serif" },
  { name: 'Lato', family: "'Lato', sans-serif" },
  { name: 'Montserrat', family: "'Montserrat', sans-serif" },
];

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return null;
  }

  let r = parseInt(result[1], 16);
  let g = parseInt(result[2], 16);
  let b = parseInt(result[3], 16);

  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0; // Default to 0 if achromatic
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function applyThemeToCssVariables(theme: Theme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  const primaryHsl = hexToHsl(theme.primary);
  const backgroundHsl = hexToHsl(theme.background);
  const accentHsl = hexToHsl(theme.accent);

  if (primaryHsl) {
    root.style.setProperty('--primary', `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
    // Assuming primary-foreground is light for dark primary, dark for light primary
    root.style.setProperty('--primary-foreground', primaryHsl.l > 50 ? '0 0% 10%' : '0 0% 98%');
  }
  if (backgroundHsl) {
    root.style.setProperty('--background', `${backgroundHsl.h} ${backgroundHsl.s}% ${backgroundHsl.l}%`);
    // Assuming foreground is dark for light background, light for dark background
    root.style.setProperty('--foreground', backgroundHsl.l > 50 ? '0 0% 10%' : '0 0% 98%');
    root.style.setProperty('--card', backgroundHsl.l > 50 ? '0 0% 100%' : `${backgroundHsl.h} ${backgroundHsl.s}% ${Math.max(0, backgroundHsl.l - 5)}%`); // Slightly darker/lighter card
    root.style.setProperty('--card-foreground', backgroundHsl.l > 50 ? '0 0% 10%' : '0 0% 98%');
  }
  if (accentHsl) {
    root.style.setProperty('--accent', `${accentHsl.h} ${accentHsl.s}% ${accentHsl.l}%`);
    root.style.setProperty('--accent-foreground', accentHsl.l > 50 ? '0 0% 10%' : '0 0% 98%');
    root.style.setProperty('--ring', `${accentHsl.h} ${accentHsl.s}% ${accentHsl.l}%`);
  }
  
  const selectedFont = AVAILABLE_FONTS.find(f => f.name === theme.font) || AVAILABLE_FONTS[0];
  root.style.setProperty('--font-body', selectedFont.family);
  document.body.style.fontFamily = `var(--font-body)`;

  // Add new font link to head if not already present
  const fontLinkHref = `https://fonts.googleapis.com/css2?family=${selectedFont.name.replace(/ /g, '+')}:wght@400;700&display=swap`;
  if (!document.querySelector(`link[href="${fontLinkHref}"]`)) {
    const link = document.createElement('link');
    link.href = fontLinkHref;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
}
