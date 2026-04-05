'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useTheme } from 'next-themes';
import {
  Store,
  Clock,
  Moon,
  Sun,
  Shield,
  Smartphone,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsScreen() {
  const { theme, setTheme } = useTheme();
  const [standardHours, setStandardHours] = React.useState('9');

  const handleHoursChange = (value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 1 || num > 24) return;
    setStandardHours(value);
    localStorage.setItem('standardHours', value);
    toast.success(`Standard working hours set to ${value}h`);
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('standardHours');
    if (saved) setStandardHours(saved);
  }, []);

  return (
    <div className="space-y-4 p-4 pb-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage app preferences</p>
      </div>

      {/* Shop Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4" />
            Shop Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Raj Mobile Cover</p>
              <p className="text-sm text-muted-foreground">Kukshi, Madhya Pradesh</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Working Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Standard Hours per Day</Label>
              <p className="text-xs text-muted-foreground">Hours after which overtime applies</p>
            </div>
            <Input
              type="number"
              value={standardHours}
              onChange={(e) => handleHoursChange(e.target.value)}
              className="w-20 h-10 text-center rounded-xl"
              min="1"
              max="24"
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="h-4 w-4" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-primary" />
              ) : (
                <Sun className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <Label className="text-sm font-medium">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">
                  {theme === 'dark' ? 'Dark theme active' : 'Light theme active'}
                </p>
              </div>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">App Name</span>
              <span className="font-medium">Raj Mobile Cover - Attendance</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Features</span>
              <span className="font-medium">Attendance, Salary, Reports</span>
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">
              All data is stored locally on this device
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
