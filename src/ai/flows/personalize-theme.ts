'use server';

/**
 * @fileOverview AI-powered theme personalization flow.
 *
 * - personalizeTheme - A function that suggests personalized themes based on user preferences and usage patterns.
 * - PersonalizeThemeInput - The input type for the personalizeTheme function.
 * - PersonalizeThemeOutput - The return type for the personalizeTheme function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizeThemeInputSchema = z.object({
  userPreferences: z
    .string()
    .describe(
      'A description of the user preferences for themes, including preferred colors, styles, and example themes they like.'
    ),
  usagePatterns: z
    .string()
    .describe(
      'A description of the user usage patterns within the app, including features used most often and time of day of usage.'
    ),
});
export type PersonalizeThemeInput = z.infer<typeof PersonalizeThemeInputSchema>;

const PersonalizeThemeOutputSchema = z.object({
  themeName: z.string().describe('The name of the suggested theme.'),
  primaryColor: z.string().describe('The suggested primary color for the theme (hex code).'),
  backgroundColor: z
    .string()
    .describe('The suggested background color for the theme (hex code).'),
  accentColor: z.string().describe('The suggested accent color for the theme (hex code).'),
  font: z.string().describe('The suggested font for the theme.'),
  isThemeAcceptable: z.boolean().describe('Whether or not the theme is acceptable.'),
});
export type PersonalizeThemeOutput = z.infer<typeof PersonalizeThemeOutputSchema>;

export async function personalizeTheme(input: PersonalizeThemeInput): Promise<PersonalizeThemeOutput> {
  return personalizeThemeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizeThemePrompt',
  input: {schema: PersonalizeThemeInputSchema},
  output: {schema: PersonalizeThemeOutputSchema},
  prompt: `You are an AI theme personalization expert.  A user will provide their theme preferences and usage patterns, and you will suggest a theme that suits their style. You will decide whether to apply those changes.

User Preferences: {{{userPreferences}}}
Usage Patterns: {{{usagePatterns}}}

Respond with a JSON object:
`,
});

const personalizeThemeFlow = ai.defineFlow(
  {
    name: 'personalizeThemeFlow',
    inputSchema: PersonalizeThemeInputSchema,
    outputSchema: PersonalizeThemeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
