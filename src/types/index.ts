export type ThemeMode = 'slate' | 'meta' | 'apple' | 'light';

export type ItemType = 'text' | 'link' | 'media' | 'html' | 'code';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export type DeviceOS = 'windows' | 'linux' | 'android' | 'ios' | 'macos' | 'other';

export interface UniItem {
  id: string;
  user_id: string;
  device_id?: string;
  device_name: string;
  device_os: DeviceOS;
  type: ItemType;
  title: string;
  content: string; // Markdown, raw code, URL, or HTML body
  file_url?: string; // Direct URL for media or HTML download/open
  file_name?: string; // e.g. "revision_notes.html", "whiteboard_eq.webp"
  file_size?: number; // In bytes
  mime_type?: string; // e.g. "text/html", "image/webp"
  metadata?: {
    tags?: string[];
    language?: string;
    urlPreview?: {
      title?: string;
      description?: string;
      image?: string;
      favicon?: string;
    };
    width?: number;
    height?: number;
    color?: string;
  };
  canvas_x: number;
  canvas_y: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConnectedDevice {
  id: string;
  user_id: string;
  device_token: string;
  device_name: string;
  device_type: DeviceType;
  os: DeviceOS;
  browser: string;
  last_active_at: string;
  is_revoked: boolean;
  is_current?: boolean;
  is_online?: boolean;
}

export interface StorageQuota {
  totalBytes: number;
  maxBytes: number; // 1,000,000,000 bytes (1 GB free Supabase)
  dbBytes: number;
  maxDbBytes: number; // 500,000,000 bytes (500 MB free Supabase)
  itemsCount: number;
  byType: {
    media: number;
    html: number;
    text: number;
    code: number;
    link: number;
  };
}

export type ViewMode = 'canvas' | 'bento' | 'timeline';

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  preferred_theme?: ThemeMode;
  storage_bytes_used?: number;
}
