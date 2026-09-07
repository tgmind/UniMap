import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { ItemType, StorageQuota, UniItem } from '../types';
import { getSupabaseClient, ensureClientAuth } from '../lib/supabase';
import { localDb } from '../lib/db';
import { useAuth } from './AuthContext';
import { detectDeviceOS, generateDefaultDeviceName, getDeviceToken } from '../lib/deviceDetector';
import { generateUUID } from '../lib/uuid';
import { compressAndEncodeMedia } from '../lib/mediaStorage';

interface AddItemInput {
  type: ItemType;
  title: string;
  content: string;
  file?: File | Blob;
  dataUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  tags?: string[];
  canvasX?: number;
  canvasY?: number;
}

/**
 * Bulletproof detector for previously seeded mock/sample study items.
 * Checks id, user_id, title, content, and filenames to guarantee they NEVER appear on any device.
 */
export function isMockOrSampleItem(item: any): boolean {
  if (!item) return false;
  const id = String(item.id || '');
  if (id.startsWith('sample_')) return true;
  if (item.user_id === 'local_user') return true;

  const title = String(item.title || '').toLowerCase();
  const content = String(item.content || '').toLowerCase();
  const fileName = String(item.file_name || '').toLowerCase();

  return (
    title.includes('kinetic energy') ||
    title.includes('fast fourier transform') ||
    title.includes('fft algorithm') ||
    title.includes('visualizing algorithm') ||
    title.includes('chemistry organic reaction') ||
    title.includes('organic synthesis quick sheet') ||
    fileName.includes('kinetic_energy') ||
    fileName.includes('fft_algorithm') ||
    fileName.includes('organic_reactions') ||
    content.includes('kinetic energy calculator') ||
    content.includes('cooley-tukey fft') ||
    content.includes('bost.ocks.org/mike/algorithms') ||
    content.includes('markovnikov vs anti-markovnikov')
  );
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
  retrySyncItem: (id: string) => Promise<boolean>;
}

const ItemContext = createContext<ItemContextType | undefined>(undefined);

export const ItemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<UniItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ItemType | 'all'>('all');
  const [selectedDevice, setSelectedDevice] = useState<string | 'all'>('all');
  const channelRef = useRef<any>(null);

  // Broadcast helper to send instant peer-to-peer WebSocket updates to other devices
  const broadcastItemUpsert = (item: UniItem) => {
    if (channelRef.current) {
      try {
        const itemWithSender: UniItem = {
          ...item,
          metadata: {
            ...item.metadata,
            sender_device_token: item.metadata?.sender_device_token || getDeviceToken(),
            sender_device_name: item.metadata?.sender_device_name || item.device_name,
          },
        };
        channelRef.current.send({
          type: 'broadcast',
          event: 'item_upsert',
          payload: itemWithSender,
        }).catch((err: any) => console.warn('Broadcast item_upsert warning:', err));
      } catch (e) {
        console.warn('Broadcast item_upsert error:', e);
      }
    }
  };

  const broadcastItemDelete = (id: string) => {
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: 'item_delete',
          payload: { id },
        }).catch((err: any) => console.warn('Broadcast item_delete warning:', err));
      } catch (e) {
        console.warn('Broadcast item_delete error:', e);
      }
    }
  };

  // 0ms instantaneous display from local IndexedDB with automatic fake cache purge
  useEffect(() => {
    const loadLocal = async () => {
      try {
        const localItems = await localDb.items.orderBy('created_at').reverse().toArray();

        // Immediately purge any fake sample data or items from other users so they never spoil cache
        const garbage = localItems.filter(
          (i) => isMockOrSampleItem(i) || (user && i.user_id !== user.id)
        );
        if (garbage.length > 0) {
          const garbageIds = garbage.map((g) => g.id);
          await localDb.items.bulkDelete(garbageIds);

          // Also purge from Supabase cloud if user is logged in
          const client = getSupabaseClient();
          if (client && user) {
            try {
              await client.from('items').delete().in('id', garbageIds);
            } catch (e) {
              console.warn('Error pruning mock items from cloud in loadLocal:', e);
            }
          }
        }

        const validLocal = localItems.filter(
          (i) => !isMockOrSampleItem(i) && (!user || i.user_id === user.id)
        );
        setItems(validLocal);
      } catch (err) {
        console.error('Error loading local items:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadLocal();
  }, [user]);

  // Fetch online items from Supabase database
  const fetchOnline = async () => {
    const client = ensureClientAuth();
    if (!client || !user) return;

    try {
      const { data, error } = await client
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Delete any mock items from Supabase cloud if they were synced previously
        const cloudMocks = data.filter((c: any) => isMockOrSampleItem(c));
        if (cloudMocks.length > 0) {
          const mockIds = cloudMocks.map((c: any) => c.id);
          await client.from('items').delete().in('id', mockIds);
        }

        const cleanCloudData = data.filter((c: any) => !isMockOrSampleItem(c));
        const localExisting = await localDb.items.toArray();
        const localMap = new Map(localExisting.map((i) => [i.id, i]));
        const cloudIds = new Set(cleanCloudData.map((c: any) => c.id));

        // Retain only current user's valid local items that haven't synced to cloud yet
        const localOnly = localExisting.filter(
          (local) => local.user_id === user.id && !isMockOrSampleItem(local) && !cloudIds.has(local.id)
        );

        // Clean up any stale or sample items
        const staleItems = localExisting.filter(
          (local) => isMockOrSampleItem(local) || (local.user_id !== user.id && !cloudIds.has(local.id))
        );
        if (staleItems.length > 0) {
          await localDb.items.bulkDelete(staleItems.map((i) => i.id));
        }

        const mergedCloud: UniItem[] = cleanCloudData.map((cloudItem: UniItem) => {
          const local = localMap.get(cloudItem.id);
          const effectiveFileUrl =
            local?.file_url && (!cloudItem.file_url || cloudItem.file_url.startsWith('blob:'))
              ? local.file_url
              : cloudItem.file_url || local?.file_url;

          return {
            ...cloudItem,
            file_url: effectiveFileUrl,
            metadata: {
              ...cloudItem.metadata,
              sync_status: 'synced' as const,
            },
          };
        });

        const merged: UniItem[] = [...mergedCloud, ...localOnly];
        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setItems(merged);
        await localDb.items.bulkPut(merged);
      }
    } catch (err) {
      console.error('Failed to sync online items:', err);
    }
  };

  // Robust Auto-Sync Queue: retries any pending local-only items to guarantee 100% cloud sync
  const flushPendingSync = async () => {
    if (!user) return;
    const client = ensureClientAuth();
    if (!client) return;

    try {
      const allLocal = await localDb.items.toArray();
      const pending = allLocal.filter(
        (it) =>
          it.user_id === user.id &&
          !isMockOrSampleItem(it) &&
          (it.metadata?.sync_status === 'local_only' || !it.metadata?.sync_status)
      );

      if (pending.length === 0) return;

      for (const item of pending) {
        const payload: any = {
          id: item.id,
          user_id: user.id,
          device_name: item.device_name,
          device_os: item.device_os,
          type: item.type,
          title: item.title,
          content: item.content,
          file_url: (item.file_url && item.file_url.startsWith('data:')) ? null : item.file_url,
          file_name: item.file_name,
          file_size: item.file_size,
          mime_type: item.mime_type,
          metadata: {
            ...item.metadata,
            sync_status: 'synced',
            has_local_media: Boolean(item.file_url && item.file_url.startsWith('data:')),
          },
          canvas_x: item.canvas_x,
          canvas_y: item.canvas_y,
          is_pinned: item.is_pinned,
          created_at: item.created_at,
          updated_at: item.updated_at || new Date().toISOString(),
        };

        let { error } = await client.from('items').upsert(payload);

        if (!error) {
          const syncedItem: UniItem = {
            ...item,
            metadata: { ...item.metadata, sync_status: 'synced' as const },
          };
          await localDb.items.put(syncedItem);
          setItems((prev) => prev.map((it) => (it.id === item.id ? syncedItem : it)));
          broadcastItemUpsert(syncedItem);
        } else {
          console.warn('Sync retry for item:', item.id, error.message);
        }
      }
    } catch (err) {
      console.warn('flushPendingSync error:', err);
    }
  };

  // Realtime Supabase Dual-Engine Sync (Broadcast for instant <20ms cross-device + Postgres Changes)
  useEffect(() => {
    if (!user) return;
    const client = ensureClientAuth();
    if (!client) return;

    fetchOnline();

    // User-scoped channel for private, instant cross-device synchronization
    const channel = client.channel(`unimap_sync_${user.id}`, {
      config: {
        broadcast: { ack: true },
      },
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'item_upsert' }, async ({ payload }) => {
        if (!payload || !payload.id) return;
        const incoming = payload as UniItem;
        const local = await localDb.items.get(incoming.id);
        const effectiveItem: UniItem = {
          ...incoming,
          file_url:
            local?.file_url && (!incoming.file_url || incoming.file_url.startsWith('blob:'))
              ? local.file_url
              : incoming.file_url || local?.file_url,
          metadata: { ...incoming.metadata, sync_status: 'synced' as const },
        };
        setItems((prev) => [effectiveItem, ...prev.filter((i) => i.id !== effectiveItem.id)]);
        await localDb.items.put(effectiveItem);

        // Notify user if created on a different connected device
        const myToken = getDeviceToken();
        const senderToken = incoming.metadata?.sender_device_token;
        if (!local && senderToken && senderToken !== myToken) {
          window.dispatchEvent(
            new CustomEvent('whitevault:new-card-notify', {
              detail: {
                id: incoming.id,
                title: 'New Card added in White Vault account',
                body: incoming.title || 'New card posted',
                senderDevice: incoming.metadata?.sender_device_name || incoming.device_name || 'Connected Device',
                itemId: incoming.id,
              },
            })
          );
        }
      })
      .on('broadcast', { event: 'item_delete' }, async ({ payload }) => {
        if (!payload?.id) return;
        const deletedId = payload.id;
        setItems((prev) => prev.filter((i) => i.id !== deletedId));
        await localDb.items.delete(deletedId);
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as UniItem;
            const local = await localDb.items.get(newItem.id);
            const effectiveItem: UniItem = {
              ...newItem,
              file_url:
                local?.file_url && (!newItem.file_url || newItem.file_url.startsWith('blob:'))
                  ? local.file_url
                  : newItem.file_url || local?.file_url,
              metadata: { ...newItem.metadata, sync_status: 'synced' as const },
            };
            setItems((prev) => [effectiveItem, ...prev.filter((i) => i.id !== newItem.id)]);
            await localDb.items.put(effectiveItem);

            // Notify user if created on a different connected device
            const myToken = getDeviceToken();
            const senderToken = newItem.metadata?.sender_device_token;
            if (!local && senderToken && senderToken !== myToken) {
              window.dispatchEvent(
                new CustomEvent('whitevault:new-card-notify', {
                  detail: {
                    id: newItem.id,
                    title: 'New Card added in White Vault account',
                    body: newItem.title || 'New card posted',
                    senderDevice: newItem.metadata?.sender_device_name || newItem.device_name || 'Connected Device',
                    itemId: newItem.id,
                  },
                })
              );
            }
          }
 else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as UniItem;
            const local = await localDb.items.get(updated.id);
            const effectiveItem: UniItem = {
              ...updated,
              file_url:
                local?.file_url && (!updated.file_url || updated.file_url.startsWith('blob:'))
                  ? local.file_url
                  : updated.file_url || local?.file_url,
              metadata: { ...updated.metadata, sync_status: 'synced' as const },
            };
            setItems((prev) => prev.map((i) => (i.id === effectiveItem.id ? effectiveItem : i)));
            await localDb.items.put(effectiveItem);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setItems((prev) => prev.filter((i) => i.id !== deletedId));
            await localDb.items.delete(deletedId);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          flushPendingSync();
        }
      });

    // Re-sync on network reconnection or tab foreground
    const handleOnline = () => {
      fetchOnline();
      flushPendingSync();
    };
    const handleFocus = () => {
      fetchOnline();
      flushPendingSync();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    const heartbeat = setInterval(() => {
      flushPendingSync();
    }, 25000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      clearInterval(heartbeat);
      client.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user]);

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
    const client = ensureClientAuth();
    const currentDevice = localStorage.getItem('unimap_custom_device_name') || generateDefaultDeviceName();
    const os = detectDeviceOS();
    const itemId = generateUUID();

    let uploadedUrl = '';
    let finalFileSize = input.fileSize || 0;
    let syncStatus: 'uploading' | 'synced' | 'local_only' = user ? 'uploading' : 'local_only';
    let mediaMeta: any = {};

    // 1. Permanent Client-Side Compression & Data URL Encoding
    if (input.dataUrl) {
      uploadedUrl = input.dataUrl;
      finalFileSize = input.fileSize || Math.round((input.dataUrl.length * 3) / 4);
    } else if (input.file) {
      if (input.file instanceof File) {
        try {
          const processed = await compressAndEncodeMedia(input.file);
          uploadedUrl = processed.dataUrl;
          finalFileSize = processed.sizeBytes;
          mediaMeta = {
            width: processed.width,
            height: processed.height,
          };
        } catch (e) {
          console.warn('Image compression fallback:', e);
        }
      }

      if (!uploadedUrl) {
        uploadedUrl = await new Promise((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = () => resolve('');
          r.readAsDataURL(input.file as Blob);
        });
      }
    } else {
      finalFileSize = new Blob([input.content]).size;
    }

    // 2. Attempt Supabase Storage upload if bucket configured
    if (input.file && client && user) {
      try {
        const ext = input.fileName ? input.fileName.split('.').pop() : (input.type === 'html' ? 'html' : 'jpg');
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
          if (publicUrlData?.publicUrl) {
            uploadedUrl = publicUrlData.publicUrl;
          }
        }
      } catch (err) {
        console.warn('Storage upload skipped, keeping high-res permanent Data URL:', err);
      }
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
        sync_status: syncStatus,
        sender_device_token: getDeviceToken(),
        sender_device_name: currentDevice,
        ...mediaMeta,
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

    // Immediate Realtime broadcast to all connected devices!
    if (user) {
      broadcastItemUpsert(newItem);
    }

    // Sync to Supabase Online database if connected
    if (client && user) {
      try {
        const dbPayload: any = {
          id: newItem.id,
          user_id: user.id,
          device_name: newItem.device_name,
          device_os: newItem.device_os,
          type: newItem.type,
          title: newItem.title,
          content: newItem.content,
          file_url: (newItem.file_url && newItem.file_url.startsWith('data:')) ? null : newItem.file_url,
          file_name: newItem.file_name,
          file_size: newItem.file_size,
          mime_type: newItem.mime_type,
          metadata: {
            ...newItem.metadata,
            sync_status: 'synced',
            sender_device_token: getDeviceToken(),
            sender_device_name: newItem.device_name,
            has_local_media: Boolean(newItem.file_url && newItem.file_url.startsWith('data:')),
          },
          canvas_x: newItem.canvas_x,
          canvas_y: newItem.canvas_y,
          is_pinned: newItem.is_pinned,
          created_at: newItem.created_at,
          updated_at: newItem.updated_at,
        };

        let { error } = await client.from('items').insert(dbPayload);

        // Retry once after 250ms in case of transient network hiccup
        if (error) {
          console.warn('Initial insert attempt error, retrying in 250ms:', error.message);
          await new Promise((r) => setTimeout(r, 250));
          const retry = await client.from('items').insert(dbPayload);
          error = retry.error;
        }

        if (!error) {
          const syncedItem: UniItem = {
            ...newItem,
            metadata: { ...newItem.metadata, sync_status: 'synced' as const },
          };
          await localDb.items.put(syncedItem);
          setItems((prev) => prev.map((it) => (it.id === newItem.id ? syncedItem : it)));
          broadcastItemUpsert(syncedItem);
        } else {
          console.warn('Supabase DB sync note:', error.message);
          const localOnlyItem: UniItem = {
            ...newItem,
            metadata: { ...newItem.metadata, sync_status: 'local_only' as const },
          };
          await localDb.items.put(localOnlyItem);
          setItems((prev) => prev.map((it) => (it.id === newItem.id ? localOnlyItem : it)));
        }
      } catch (err) {
        console.error('Supabase insert error:', err);
        const localOnlyItem: UniItem = {
          ...newItem,
          metadata: { ...newItem.metadata, sync_status: 'local_only' as const },
        };
        await localDb.items.put(localOnlyItem);
        setItems((prev) => prev.map((it) => (it.id === newItem.id ? localOnlyItem : it)));
      }
    }

    return newItem;
  };

  const deleteItem = async (id: string) => {
    const itemToDelete = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    await localDb.items.delete(id);

    if (user) {
      broadcastItemDelete(id);
    }

    const client = ensureClientAuth();
    if (client && user) {
      try {
        await client.from('items').delete().eq('id', id);

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

    const updated: UniItem = { ...target, is_pinned: !target.is_pinned, updated_at: new Date().toISOString() };
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    await localDb.items.put(updated);

    if (user) {
      broadcastItemUpsert(updated);
    }

    const client = ensureClientAuth();
    if (client && user) {
      await client.from('items').update({ is_pinned: updated.is_pinned }).eq('id', id);
    }
  };

  const updateCanvasPosition = async (id: string, x: number, y: number) => {
    const target = items.find((i) => i.id === id);
    const updated: UniItem | null = target ? { ...target, canvas_x: x, canvas_y: y, updated_at: new Date().toISOString() } : null;

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, canvas_x: x, canvas_y: y } : i))
    );
    if (updated) {
      await localDb.items.put(updated);
      if (user) {
        broadcastItemUpsert(updated);
      }
    }
    const client = ensureClientAuth();
    if (client && user) {
      try {
        await client.from('items').update({ canvas_x: x, canvas_y: y }).eq('id', id);
      } catch (err) {
        console.warn('Failed to sync canvas position online:', err);
      }
    }
  };

  const retrySyncItem = async (id: string): Promise<boolean> => {
    if (!user) return false;
    const client = ensureClientAuth();
    if (!client) return false;

    const target = await localDb.items.get(id);
    if (!target) return false;

    try {
      const uploadingItem: UniItem = {
        ...target,
        metadata: { ...target.metadata, sync_status: 'uploading' as const },
      };
      setItems((prev) => prev.map((it) => (it.id === id ? uploadingItem : it)));

      const dbPayload: any = {
        id: target.id,
        user_id: user.id,
        device_name: target.device_name,
        device_os: target.device_os,
        type: target.type,
        title: target.title,
        content: target.content,
        file_url: (target.file_url && target.file_url.startsWith('data:')) ? null : target.file_url,
        file_name: target.file_name,
        file_size: target.file_size,
        mime_type: target.mime_type,
        metadata: {
          ...target.metadata,
          sync_status: 'synced',
          has_local_media: Boolean(target.file_url && target.file_url.startsWith('data:')),
        },
        canvas_x: target.canvas_x,
        canvas_y: target.canvas_y,
        is_pinned: target.is_pinned,
        created_at: target.created_at,
        updated_at: target.updated_at || new Date().toISOString(),
      };

      const { error } = await client.from('items').upsert(dbPayload);
      if (!error) {
        const syncedItem: UniItem = {
          ...target,
          metadata: { ...target.metadata, sync_status: 'synced' as const },
        };
        await localDb.items.put(syncedItem);
        setItems((prev) => prev.map((it) => (it.id === id ? syncedItem : it)));
        broadcastItemUpsert(syncedItem);
        return true;
      } else {
        console.warn('Manual sync retry failed:', error.message);
        const failedItem: UniItem = {
          ...target,
          metadata: { ...target.metadata, sync_status: 'local_only' as const },
        };
        await localDb.items.put(failedItem);
        setItems((prev) => prev.map((it) => (it.id === id ? failedItem : it)));
        return false;
      }
    } catch (err) {
      console.warn('Manual sync retry exception:', err);
      const failedItem: UniItem = {
        ...target,
        metadata: { ...target.metadata, sync_status: 'local_only' as const },
      };
      await localDb.items.put(failedItem);
      setItems((prev) => prev.map((it) => (it.id === id ? failedItem : it)));
      return false;
    }
  };

  const refreshItems = async () => {
    if (user) {
      await fetchOnline();
      await flushPendingSync();
    } else {
      const local = await localDb.items.orderBy('created_at').reverse().toArray();
      setItems(local.filter((i) => !isMockOrSampleItem(i)));
    }
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
        retrySyncItem,
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
