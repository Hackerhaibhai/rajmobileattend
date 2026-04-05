'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Share2, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { captureAndShare, captureAndDownload } from '@/lib/share';
import { toast } from 'sonner';

interface ShareButtonsProps {
  elementId: string;
  title: string;
}

export default function ShareButtons({ elementId, title }: ShareButtonsProps) {
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      await captureAndShare(elementId, title);
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await captureAndDownload(elementId, title);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="lg"
          className="h-12 px-5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Share2 className="h-5 w-5" />
          Share Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleShare} disabled={sharing}>
          {sharing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4 mr-2" />
          )}
          <div>
            <p className="font-medium">Share / Send</p>
            <p className="text-xs text-muted-foreground">WhatsApp, Telegram, etc.</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload} disabled={downloading}>
          {downloading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          <div>
            <p className="font-medium">Download Image</p>
            <p className="text-xs text-muted-foreground">Save as PNG screenshot</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
