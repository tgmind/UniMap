import { UniItem } from '../types';

/**
 * Launches an HTML file or snippet directly in the browser with full native script and CSS execution
 */
export function runHtmlInBrowser(content: string, title = 'UniMap HTML Document') {
  try {
    let fullHtml = content.trim();
    // If it's a snippet without doctype, wrap it nicely
    if (!fullHtml.toLowerCase().includes('<!doctype html>') && !fullHtml.toLowerCase().includes('<html')) {
      fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 2rem; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
    }

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if (!win) {
      alert('Popup was blocked by the browser. Please allow popups for UniMap to run HTML documents in new tabs.');
    }
  } catch (err) {
    console.error('Failed to run HTML in browser:', err);
  }
}

/**
 * 1-Click universal file downloader for any UniItem
 */
export async function downloadItem(item: UniItem) {
  try {
    if (item.file_url) {
      // If it's a remote URL (e.g. Supabase storage or blob)
      const response = await fetch(item.file_url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = item.file_name || `${item.title || 'unimap_file'}.${item.type === 'html' ? 'html' : 'bin'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      return;
    }

    // Text, Code, or HTML stored as string content
    let mime = 'text/plain;charset=utf-8';
    let extension = 'txt';

    if (item.type === 'html') {
      mime = 'text/html;charset=utf-8';
      extension = 'html';
    } else if (item.type === 'code') {
      extension = item.metadata?.language || 'txt';
    } else if (item.type === 'link') {
      mime = 'text/uri-list';
      extension = 'url';
    }

    const filename = item.file_name || `${(item.title || 'unimap_item').replace(/[^a-z0-9_-]/gi, '_')}.${extension}`;
    const blob = new Blob([item.content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download item:', err);
  }
}
