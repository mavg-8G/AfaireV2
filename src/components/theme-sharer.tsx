"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts/theme-context';
import { useToast } from '@/hooks/use-toast';
import { Share2, Copy } from 'lucide-react';

export function ThemeSharer() {
  const { theme } = useTheme();
  const { toast } = useToast();

  const handleCopyToClipboard = () => {
    const themeString = `Theme Name: ${theme.name}\nPrimary: ${theme.primary}\nBackground: ${theme.background}\nAccent: ${theme.accent}\nFont: ${theme.font}`;
    navigator.clipboard.writeText(themeString)
      .then(() => {
        toast({
          title: "Theme Copied!",
          description: "Theme settings copied to clipboard.",
        });
      })
      .catch(err => {
        console.error("Failed to copy theme: ", err);
        toast({
          title: "Copy Failed",
          description: "Could not copy theme to clipboard.",
          variant: "destructive",
        });
      });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Share2 className="h-6 w-6 text-primary" />
          Share Your Theme
        </CardTitle>
        <CardDescription>
          Copy your current theme settings to share with others.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleCopyToClipboard} className="w-full">
          <Copy className="mr-2 h-4 w-4" /> Copy Theme to Clipboard
        </Button>
      </CardContent>
    </Card>
  );
}
