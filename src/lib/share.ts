'use client';

import html2canvas from 'html2canvas';
import { toast } from 'sonner';

export async function captureElementAsImage(elementId: string): Promise<string | null> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error('Report element not found');
      return null;
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
    });

    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl;
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    toast.error('Screenshot capture failed');
    return null;
  }
}

export async function downloadImage(dataUrl: string, filename: string) {
  try {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
    toast.success('Image downloaded!');
  } catch (error) {
    console.error('Download failed:', error);
    toast.error('Download failed');
  }
}

export async function shareImage(dataUrl: string, title: string) {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], `${title}.png`, { type: 'image/png' });

    // Check if Web Share API is available
    if (navigator.share && navigator.canShare) {
      const shareData = {
        title: title,
        text: `${title} - Raj Mobile Cover Kukshi`,
        files: [file],
      };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success('Report shared successfully!');
        return;
      }
    }

    // Fallback: try sharing without file (URL-based)
    if (navigator.share) {
      await navigator.share({
        title: title,
        text: `${title} - Raj Mobile Cover Kukshi`,
      });
      toast.success('Shared!');
      return;
    }

    // Final fallback: just download
    await downloadImage(dataUrl, `${title}.png`);
  } catch (error: unknown) {
    // User cancelled sharing is not an error
    if (error instanceof Error && error.name === 'AbortError') return;
    console.error('Share failed:', error);
    // Fallback to download
    await downloadImage(dataUrl, `${title}.png`);
  }
}

export async function captureAndShare(elementId: string, title: string) {
  const dataUrl = await captureElementAsImage(elementId);
  if (dataUrl) {
    await shareImage(dataUrl, title);
  }
}

export async function captureAndDownload(elementId: string, title: string) {
  const dataUrl = await captureElementAsImage(elementId);
  if (dataUrl) {
    await downloadImage(dataUrl, `${title}.png`);
  }
}
