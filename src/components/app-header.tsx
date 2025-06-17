"use client";

import { useTheme } from "@/contexts/theme-context";
import { Sun, Moon, Palette } from "lucide-react"; // Assuming Palette icon for app logo
import { Button } from "./ui/button"; // Assuming you might want a theme toggle button

export function AppHeader() {
  // Example: If you want to add a dark/light mode toggle or display theme name
  // const { theme, setTheme } = useTheme();
  // For now, just a static header.

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-40 transition-colors duration-300">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <Palette className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-bold text-primary tracking-tight">
            App Everyone
          </h1>
        </div>
        {/* Placeholder for future actions like theme toggle or user menu */}
        {/* <Button variant="ghost" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button> */}
      </div>
    </header>
  );
}
