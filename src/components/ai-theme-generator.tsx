"use client";

import { personalizeTheme } from '@/ai/flows/personalize-theme';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Wand2, Check, AlertTriangle } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useTheme } from '@/contexts/theme-context';
import { Skeleton } from './ui/skeleton';

export function AIThemeGenerator() {
  const { toast } = useToast();
  const { setAiSuggestedTheme, applyAiSuggestion, aiSuggestedTheme: currentAiSuggestion } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [userPreferences, setUserPreferences] = useState('');
  const [usagePatterns, setUsagePatterns] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userPreferences.trim()) {
        toast({ title: "Input Required", description: "Please describe your theme preferences.", variant: "destructive"});
        return;
    }
    startTransition(async () => {
      try {
        const suggestion = await personalizeTheme({
          userPreferences,
          usagePatterns: usagePatterns || "General app usage, focus on readability and modern look.", // Default if empty
        });
        setAiSuggestedTheme(suggestion);
        toast({
          title: suggestion.isThemeAcceptable ? "AI Theme Suggested!" : "AI Suggestion (Needs Review)",
          description: suggestion.isThemeAcceptable ? `Theme "${suggestion.themeName}" is ready.` : `Theme "${suggestion.themeName}" suggested. AI recommends review.`,
        });
      } catch (error) {
        console.error("AI Theme Generation Error:", error);
        toast({
          title: "AI Error",
          description: "Could not generate theme. Please try again.",
          variant: "destructive",
        });
        setAiSuggestedTheme(null);
      }
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Wand2 className="h-6 w-6 text-primary" />
          AI Theme Generator
        </CardTitle>
        <CardDescription>
          Let AI craft a theme based on your preferences. Describe what you like!
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userPreferences">Your Preferences</Label>
            <Textarea
              id="userPreferences"
              placeholder="e.g., 'minimalist, dark mode, love blue and green', 'vibrant and playful with rounded corners'"
              value={userPreferences}
              onChange={(e) => setUserPreferences(e.target.value)}
              rows={3}
              aria-required="true"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="usagePatterns">How You Use The App (Optional)</Label>
            <Input
              id="usagePatterns"
              placeholder="e.g., 'mostly at night', 'for quick tasks'"
              value={usagePatterns}
              onChange={(e) => setUsagePatterns(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4">
          <Button type="submit" disabled={isPending || !userPreferences.trim()} className="w-full">
            {isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" /> Generate with AI
              </>
            )}
          </Button>
          
          {isPending && !currentAiSuggestion && (
            <div className="space-y-2 mt-4 p-4 border border-dashed rounded-lg">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-8 w-full mt-2" />
            </div>
          )}

          {currentAiSuggestion && !isPending && (
            <Card className="bg-card/80 mt-4 p-4 transition-all duration-300 ease-in-out">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-lg font-headline">{currentAiSuggestion.themeName}</CardTitle>
                {!currentAiSuggestion.isThemeAcceptable && (
                     <CardDescription className="text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" /> AI recommends reviewing this theme.
                     </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-0 space-y-1 text-sm">
                <p><strong>Primary:</strong> <span style={{ color: currentAiSuggestion.primaryColor }}>{currentAiSuggestion.primaryColor}</span></p>
                <p><strong>Background:</strong> <span style={{ color: currentAiSuggestion.backgroundColor }}>{currentAiSuggestion.backgroundColor}</span></p>
                <p><strong>Accent:</strong> <span style={{ color: currentAiSuggestion.accentColor }}>{currentAiSuggestion.accentColor}</span></p>
                <p><strong>Font:</strong> {currentAiSuggestion.font}</p>
              </CardContent>
              <CardFooter className="p-0 pt-3">
                <Button onClick={applyAiSuggestion} size="sm" className="w-full">
                  <Check className="mr-2 h-4 w-4" /> Apply AI Suggestion
                </Button>
              </CardFooter>
            </Card>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
