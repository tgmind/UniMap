import React, { createContext, useContext, useEffect, useState } from 'react';
import { ItemType, StorageQuota, UniItem } from '../types';
import { getSupabaseClient } from '../lib/supabase';
import { localDb } from '../lib/db';
import { useAuth } from './AuthContext';
import { detectDeviceOS, generateDefaultDeviceName } from '../lib/deviceDetector';

interface AddItemInput {
  type: ItemType;
  title: string;
  content: string;
  file?: File | Blob;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  tags?: string[];
  canvasX?: number;
  canvasY?: number;
}

interface ItemContextType {
  items: UniItem[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedType: ItemType | 'all';
  setSelectedType: (type: ItemType | 'all') => void;
  selectedDevice: string | 'all';
  setSelectedDevice: (dev: string | 'all') => void;
  storageQuota: StorageQuota;
  addItem: (input: AddItemInput) => Promise<UniItem>;
  deleteItem: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  updateCanvasPosition: (id: string, x: number, y: number) => Promise<void>;
  refreshItems: () => Promise<void>;
}

const ItemContext = createContext<ItemContextType | undefined>(undefined);

export const ItemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isGuestMode } = useAuth();
  const [items, setItems] = useState<UniItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ItemType | 'all'>('all');
  const [selectedDevice, setSelectedDevice] = useState<string | 'all'>('all');

  // Load items from local IndexedDB first (0ms instantaneous display)
  useEffect(() => {
    const loadLocal = async () => {
      try {
        const localItems = await localDb.items.orderBy('created_at').reverse().toArray();
        if (localItems.length > 0) {
          setItems(localItems);
        } else {
          // Provide initial sample study data for exam preparation if empty
          const sampleData = getInitialSampleItems();
          setItems(sampleData);
          await localDb.items.bulkPut(sampleData);
        }
      } catch (err) {
        console.error('Error loading local items:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadLocal();
  }, []);

  // Realtime Supabase Sync & online fetch
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || isGuestMode || !user) return;

    // Fetch latest online items
    const fetchOnline = async () => {
      try {
        const { data, error } = await client
          .from('items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setItems(data);
          await localDb.items.clear();
          await localDb.items.bulkPut(data);
        }
      } catch (err) {
        console.error('Failed to sync online items:', err);
      }
    };

    fetchOnline();

    // Subscribe to real-time changes
    const channel = client
      .channel('public:items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as UniItem;
            setItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)]);
            await localDb.items.put(newItem);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as UniItem;
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            await localDb.items.put(updated);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setItems((prev) => prev.filter((i) => i.id !== deletedId));
            await localDb.items.delete(deletedId);
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user, isGuestMode]);

  // Storage Quota Calculation
  const storageQuota: StorageQuota = React.useMemo(() => {
    let totalBytes = 0;
    let dbBytes = 0;
    const byType = { media: 0, html: 0, text: 0, code: 0, link: 0 };

    for (const item of items) {
      const fileSize = item.file_size || (item.content ? new Blob([item.content]).size : 0);
      totalBytes += fileSize;

      if (item.type === 'media') byType.media += fileSize;
      else if (item.type === 'html') byType.html += fileSize;
      else if (item.type === 'text') byType.text += fileSize;
      else if (item.type === 'code') byType.code += fileSize;
      else if (item.type === 'link') byType.link += fileSize;

      // Estimate DB overhead per row (~500 bytes)
      dbBytes += (item.content?.length || 0) + 500;
    }

    return {
      totalBytes,
      maxBytes: 1000 * 1024 * 1024, // 1,000 MB (1 GB)
      dbBytes,
      maxDbBytes: 500 * 1024 * 1024, // 500 MB
      itemsCount: items.length,
      byType,
    };
  }, [items]);

  const addItem = async (input: AddItemInput): Promise<UniItem> => {
    const client = getSupabaseClient();
    const currentDevice = localStorage.getItem('unimap_custom_device_name') || generateDefaultDeviceName();
    const os = detectDeviceOS();
    const itemId = crypto.randomUUID();

    let uploadedUrl = '';
    let finalFileSize = input.fileSize || (input.file ? input.file.size : new Blob([input.content]).size);

    // If there's a file and Supabase is configured, upload to storage bucket 'user-media'
    if (input.file && client && !isGuestMode && user) {
      try {
        const ext = input.fileName ? input.fileName.split('.').pop() : (input.type === 'html' ? 'html' : 'webp');
        const storagePath = `${user.id}/${itemId}.${ext}`;

        const { data: uploadData, error: uploadErr } = await client.storage
          .from('user-media')
          .upload(storagePath, input.file, {
            contentType: input.mimeType || 'application/octet-stream',
            upsert: true,
          });

        if (!uploadErr && uploadData) {
          const { data: publicUrlData } = client.storage
            .from('user-media')
            .getPublicUrl(storagePath);
          uploadedUrl = publicUrlData.publicUrl;
        } else {
          console.warn('Storage upload error, using local fallback:', uploadErr);
          uploadedUrl = URL.createObjectURL(input.file);
        }
      } catch (err) {
        console.error('File upload exception:', err);
        uploadedUrl = URL.createObjectURL(input.file);
      }
    } else if (input.file) {
      uploadedUrl = URL.createObjectURL(input.file);
    }

    const newItem: UniItem = {
      id: itemId,
      user_id: user?.id || 'local_user',
      device_name: currentDevice,
      device_os: os,
      type: input.type,
      title: input.title || (input.fileName ? input.fileName : `${input.type.toUpperCase()} Note`),
      content: input.content,
      file_url: uploadedUrl || undefined,
      file_name: input.fileName,
      file_size: finalFileSize,
      mime_type: input.mimeType,
      metadata: {
        tags: input.tags || ['Study'],
      },
      canvas_x: input.canvasX ?? (Math.random() * 400 - 200),
      canvas_y: input.canvasY ?? (Math.random() * 300 - 150),
      is_pinned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 0ms Optimistic Local Update
    setItems((prev) => [newItem, ...prev]);
    await localDb.items.put(newItem);

    // Sync to Supabase Online if connected
    if (client && !isGuestMode && user) {
      try {
        const { error } = await client.from('items').insert({
          id: newItem.id,
          user_id: user.id,
          device_name: newItem.device_name,
          device_os: newItem.device_os,
          type: newItem.type,
          title: newItem.title,
          content: newItem.content,
          file_url: newItem.file_url,
          file_name: newItem.file_name,
          file_size: newItem.file_size,
          mime_type: newItem.mime_type,
          metadata: newItem.metadata,
          canvas_x: newItem.canvas_x,
          canvas_y: newItem.canvas_y,
          is_pinned: newItem.is_pinned,
          created_at: newItem.created_at,
          updated_at: newItem.updated_at,
        });
        if (error) {
          console.warn('Online sync failed, stored locally:', error.message);
        }
      } catch (err) {
        console.error('Supabase insert error:', err);
      }
    }

    return newItem;
  };

  const deleteItem = async (id: string) => {
    const itemToDelete = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    await localDb.items.delete(id);

    const client = getSupabaseClient();
    if (client && !isGuestMode && user) {
      try {
        await client.from('items').delete().eq('id', id);

        // Delete from storage if URL exists
        if (itemToDelete?.file_name && user) {
          const ext = itemToDelete.file_name.split('.').pop();
          await client.storage.from('user-media').remove([`${user.id}/${id}.${ext}`]);
        }
      } catch (err) {
        console.error('Failed to delete item online:', err);
      }
    }
  };

  const togglePin = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    const updated = { ...target, is_pinned: !target.is_pinned, updated_at: new Date().toISOString() };
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    await localDb.items.put(updated);

    const client = getSupabaseClient();
    if (client && !isGuestMode && user) {
      await client.from('items').update({ is_pinned: updated.is_pinned }).eq('id', id);
    }
  };

  const updateCanvasPosition = async (id: string, x: number, y: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, canvas_x: x, canvas_y: y } : i))
    );
    const target = items.find((i) => i.id === id);
    if (target) {
      await localDb.items.put({ ...target, canvas_x: x, canvas_y: y });
    }
  };

  const refreshItems = async () => {
    const local = await localDb.items.orderBy('created_at').reverse().toArray();
    setItems(local);
  };

  return (
    <ItemContext.Provider
      value={{
        items,
        isLoading,
        searchQuery,
        setSearchQuery,
        selectedType,
        setSelectedType,
        selectedDevice,
        setSelectedDevice,
        storageQuota,
        addItem,
        deleteItem,
        togglePin,
        updateCanvasPosition,
        refreshItems,
      }}
    >
      {children}
    </ItemContext.Provider>
  );
};

export const useItems = () => {
  const context = useContext(ItemContext);
  if (!context) {
    throw new Error('useItems must be used within an ItemProvider');
  }
  return context;
};

// High quality starter study items for instant out-of-the-box demo
function getInitialSampleItems(): UniItem[] {
  return [
    {
      id: 'sample_html_1',
      user_id: 'local_user',
      device_name: 'Linux ThinkPad',
      device_os: 'linux',
      type: 'html',
      title: 'Interactive Physics Formula Calculator',
      content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; background: #0b0f19; color: #f8fafc; }
    .card { background: #131b2e; padding: 20px; border-radius: 12px; border: 1px solid #1e293b; max-width: 420px; }
    h2 { color: #38bdf8; margin-top: 0; }
    input { width: 100%; padding: 8px; margin: 8px 0 16px; background: #0b0f19; border: 1px solid #334155; color: #fff; border-radius: 6px; }
    button { background: #0284c7; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: bold; }
    button:hover { background: #0369a1; }
    #result { margin-top: 16px; font-weight: bold; font-size: 1.2rem; color: #4ade80; }
  </style>
</head>
<body>
  <div class="card">
    <h2>⚡ Kinetic Energy Calculator</h2>
    <label>Mass m (kg):</label>
    <input type="number" id="mass" value="10">
    <label>Velocity v (m/s):</label>
    <input type="number" id="vel" value="25">
    <button onclick="calc()">Compute K.E.</button>
    <div id="result">Result: 3125 Joules</div>
  </div>
  <script>
    function calc() {
      const m = parseFloat(document.getElementById('mass').value) || 0;
      const v = parseFloat(document.getElementById('vel').value) || 0;
      const ke = 0.5 * m * v * v;
      document.getElementById('result').innerText = 'Result: ' + ke.toLocaleString() + ' Joules';
    }
  </script>
</body>
</html>`,
      file_name: 'kinetic_energy_calculator.html',
      file_size: 1420,
      mime_type: 'text/html',
      metadata: { tags: ['Physics', 'Exam Prep'] },
      canvas_x: -180,
      canvas_y: -90,
      is_pinned: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'sample_code_1',
      user_id: 'local_user',
      device_name: 'Windows Desktop',
      device_os: 'windows',
      type: 'code',
      title: 'Fast Fourier Transform (FFT) Algorithm in Python',
      content: `import numpy as np

def fast_fourier_transform(x):
    """A recursive implementation of the 1D Cooley-Tukey FFT"""
    x = np.asarray(x, dtype=float)
    N = x.shape[0]
    if N % 2 > 0:
        raise ValueError("Size of x must be a power of 2")
    elif N <= 32:  # Base case for small N
        return np.dot(np.exp(-2j * np.pi * np.arange(N)[:, None] * np.arange(N) / N), x)
    else:
        X_even = fast_fourier_transform(x[::2])
        X_odd = fast_fourier_transform(x[1::2])
        factor = np.exp(-2j * np.pi * np.arange(N) / N)
        return np.concatenate([X_even + factor[:N // 2] * X_odd,
                               X_even + factor[N // 2:] * X_odd])`,
      file_name: 'fft_algorithm.py',
      file_size: 860,
      mime_type: 'text/x-python',
      metadata: { tags: ['Algorithms', 'Maths'], language: 'python' },
      canvas_x: 160,
      canvas_y: -70,
      is_pinned: true,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'sample_link_1',
      user_id: 'local_user',
      device_name: 'Android Mobile',
      device_os: 'android',
      type: 'link',
      title: 'Visualizing Algorithms — Mike Bostock',
      content: 'https://bost.ocks.org/mike/algorithms/',
      file_size: 340,
      metadata: {
        tags: ['Reference', 'Computer Science'],
        urlPreview: {
          title: 'Visualizing Algorithms',
          description: 'A study of algorithmic design with interactive visual representations.',
        },
      },
      canvas_x: -120,
      canvas_y: 140,
      is_pinned: false,
      created_at: new Date(Date.now() - 18000000).toISOString(),
      updated_at: new Date(Date.now() - 18000000).toISOString(),
    },
    {
      id: 'sample_text_1',
      user_id: 'local_user',
      device_name: 'iPad Pro',
      device_os: 'ios',
      type: 'text',
      title: 'Chemistry Organic Reactions Summary',
      content: `# Organic Synthesis Quick Sheet

### 1. Markovnikov vs Anti-Markovnikov
- **Hydrohalogenation ($$HX$$)**: Halogen adds to the most substituted carbon.
- **Hydroboration-Oxidation ($$BH_3 / H_2O_2, OH^-$$)**: Anti-Markovnikov syn-addition of $$H$$ and $$OH$$.

### 2. Oxidation States
- Primary Alcohol $\\rightarrow$ Aldehyde (PCC) $\\rightarrow$ Carboxylic Acid ($$KMnO_4$$)
- Secondary Alcohol $\\rightarrow$ Ketone (Chromic Acid / Jones Reagent)`,
      file_name: 'organic_reactions.md',
      file_size: 610,
      metadata: { tags: ['Chemistry', 'Cheat Sheet'] },
      canvas_x: 180,
      canvas_y: 130,
      is_pinned: false,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}
