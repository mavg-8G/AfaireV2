"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Star, Bell } from "lucide-react";
import Image from 'next/image';

export function ThemePreview() {
  return (
    <Card className="shadow-xl overflow-hidden h-full">
      <CardHeader className="bg-muted/30">
        <CardTitle className="font-headline">Theme Preview</CardTitle>
        <CardDescription>See your customizations in action on various components.</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        <section className="space-y-4">
          <h3 className="text-lg font-semibold font-headline">Buttons</h3>
          <div className="flex flex-wrap gap-4 items-center">
            <Button>Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="link">Link Button</Button>
            <Button variant="destructive">Destructive</Button>
            <Button size="icon" aria-label="Favorite">
              <Star className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold font-headline">Cards & Inputs</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Sample Card</CardTitle>
                <CardDescription>This is a card description.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Card content goes here. It can be text, images, or other elements.</p>
                <div className="mt-4" data-ai-hint="abstract pattern">
                   <Image src="https://placehold.co/300x150.png" alt="Placeholder" width={300} height={150} className="rounded-md" />
                </div>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <div>
                <Label htmlFor="preview-name">Name</Label>
                <Input type="text" id="preview-name" placeholder="Enter your name" />
              </div>
              <div>
                <Label htmlFor="preview-email">Email</Label>
                <Input type="email" id="preview-email" placeholder="you@example.com" />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch id="notifications-preview" aria-label="Toggle notifications"/>
                <Label htmlFor="notifications-preview">Enable Notifications</Label>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold font-headline">Tabs</h3>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-1">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="p-4 border rounded-md mt-2 bg-card">
              <p>This is the overview tab content. It shows a summary of important information.</p>
            </TabsContent>
            <TabsContent value="analytics" className="p-4 border rounded-md mt-2 bg-card">
              <p>Analytics tab content with charts and data visualizations would go here.</p>
               <div className="mt-4" data-ai-hint="charts graph">
                <Image src="https://placehold.co/400x200.png" alt="Chart Placeholder" width={400} height={200} className="rounded-md" />
              </div>
            </TabsContent>
            <TabsContent value="reports" className="p-4 border rounded-md mt-2 bg-card">
              <p>Reports tab provides detailed reports and downloadable documents.</p>
            </TabsContent>
             <TabsContent value="notifications" className="p-4 border rounded-md mt-2 bg-card">
              <p>Notifications tab shows recent alerts and updates.</p>
            </TabsContent>
          </Tabs>
        </section>
        
        <section className="space-y-2">
            <h3 className="text-lg font-semibold font-headline">Typography</h3>
            <h1 className="text-4xl font-bold font-headline">Headline 1</h1>
            <h2 className="text-3xl font-semibold font-headline">Headline 2</h2>
            <h3 className="text-2xl font-medium font-headline">Headline 3</h3>
            <p className="text-base">This is a paragraph of body text using the selected font. It demonstrates how regular text will appear with the current theme settings. We can include <strong>bold text</strong> and <em>italic text</em> as well.</p>
            <p className="text-sm text-muted-foreground">This is a muted text, often used for secondary information or captions.</p>
        </section>

      </CardContent>
    </Card>
  );
}
