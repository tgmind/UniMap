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
 * Convert a Base64 Data URL directly to a native Blob without network calls
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
    const binary = atob(parts[1] || '');
    const length = binary.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch (e) {
    console.warn('Failed to parse data URL into Blob directly:', e);
    // Fallback minimal blob
    return new Blob([dataUrl], { type: 'text/plain' });
  }
}

/**
 * Triggers native browser download for a Blob
 */
export function triggerBlobDownload(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }, 150);
}

/**
 * Helper to infer proper media file extension from URL or MIME type
 */
export function inferMediaExtension(url: string, mime?: string, defaultExt = 'webp'): string {
  if (mime) {
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('png')) return 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('gif')) return 'gif';
    if (mime.includes('svg')) return 'svg';
    if (mime.includes('html')) return 'html';
    if (mime.includes('pdf')) return 'pdf';
  }

  if (url.startsWith('data:image/')) {
    const match = url.match(/^data:image\/([a-zA-Z0-9+]+);/);
    if (match) {
      const sub = match[1].toLowerCase();
      if (sub.includes('jpeg') || sub.includes('jpg')) return 'jpg';
      if (sub.includes('png')) return 'png';
      if (sub.includes('webp')) return 'webp';
      if (sub.includes('gif')) return 'gif';
      if (sub.includes('svg')) return 'svg';
    }
  }

  // Extract from URL path if it looks like a filename
  const cleanPath = url.split('?')[0].split('#')[0];
  const lastSegment = cleanPath.split('/').pop() || '';
  const matchExt = lastSegment.match(/\.([a-zA-Z0-9]{2,5})$/);
  if (matchExt) {
    return matchExt[1].toLowerCase();
  }

  return defaultExt;
}

/**
 * Direct downloader for any media URL (data URL, blob, or remote CDN)
 */
export async function downloadMediaUrl(url: string, suggestedFilename?: string, mimeType?: string): Promise<boolean> {
  try {
    const ext = inferMediaExtension(url, mimeType, 'webp');
    let finalName = suggestedFilename ? suggestedFilename.trim() : `unimap_media_${Date.now()}`;
    if (!finalName.toLowerCase().endsWith(`.${ext}`)) {
      // If it doesn't have an extension, append the inferred one
      if (!/\.[a-zA-Z0-9]{2,5}$/.test(finalName)) {
        finalName = `${finalName}.${ext}`;
      }
    }
    // Clean filename for OS file systems
    finalName = finalName.replace(/[/\\?%*:|"<>]/g, '_');

    // 1. If it's a base64 Data URL, convert directly to Blob and download
    if (url.startsWith('data:')) {
      const blob = dataUrlToBlob(url);
      triggerBlobDownload(blob, finalName);
      return true;
    }

    // 2. If it's already a blob URL
    if (url.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }

    // 3. Remote URL: attempt fetch to get Blob so browser forces download instead of opening in tab
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        triggerBlobDownload(blob, finalName);
        return true;
      }
    } catch (fetchErr) {
      console.warn('Direct fetch for media download failed (possibly CORS), using direct link click:', fetchErr);
    }

    // Fallback: direct anchor link with download attribute
    const a = document.createElement('a');
    a.href = url;
    a.download = finalName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.error('Failed to download media URL:', err);
    return false;
  }
}

/**
 * 1-Click universal file downloader for any UniItem (Media, HTML, Code, Notes)
 */
export async function downloadItem(item: UniItem): Promise<boolean> {
  try {
    // 1. Standalone HTML Item
    if (item.type === 'html') {
      let rawHtml = item.content || '';
      // If it has file_url and empty content, attempt to fetch
      if (!rawHtml && item.file_url) {
        return await downloadMediaUrl(item.file_url, item.file_name || item.title || 'unimap_app.html', 'text/html');
      }

      // If snippet without doctype, wrap with proper template
      if (!rawHtml.toLowerCase().includes('<!doctype html>') && !rawHtml.toLowerCase().includes('<html')) {
        rawHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${item.title || 'UniMap HTML App'}</title>
</head>
<body>
${rawHtml}
</body>
</html>`;
      }

      let filename = item.file_name || item.title || 'unimap_page';
      filename = filename.replace(/[/\\?%*:|"<>]/g, '_').trim();
      if (!filename.toLowerCase().endsWith('.html')) {
        filename = `${filename}.html`;
      }

      const blob = new Blob([rawHtml], { type: 'text/html;charset=utf-8' });
      triggerBlobDownload(blob, filename);
      return true;
    }

    // 2. Media Asset with file_url
    if (item.file_url) {
      const ext = inferMediaExtension(item.file_url, item.mime_type, item.type === 'media' ? 'webp' : 'bin');
      let filename = item.file_name || item.title || `unimap_media_${Date.now()}`;
      filename = filename.replace(/[/\\?%*:|"<>]/g, '_').trim();
      if (!/\.[a-zA-Z0-9]{2,5}$/.test(filename)) {
        filename = `${filename}.${ext}`;
      }
      return await downloadMediaUrl(item.file_url, filename, item.mime_type);
    }

    // 3. Text, Code, or Link stored as string content
    let mime = 'text/plain;charset=utf-8';
    let extension = 'txt';

    if (item.type === 'code') {
      extension = item.metadata?.language || 'txt';
    } else if (item.type === 'link') {
      mime = 'text/uri-list';
      extension = 'url';
    }

    let filename = item.file_name || item.title || 'unimap_note';
    filename = filename.replace(/[/\\?%*:|"<>]/g, '_').trim();
    if (!filename.toLowerCase().endsWith(`.${extension}`)) {
      filename = `${filename}.${extension}`;
    }

    const blob = new Blob([item.content || ''], { type: mime });
    triggerBlobDownload(blob, filename);
    return true;
  } catch (err) {
    console.error('Failed to download item:', err);
    return false;
  }
}
