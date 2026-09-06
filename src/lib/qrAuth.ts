import { getSupabaseClient } from './supabase';
import { generateUUID } from './uuid';

export interface QrLoginPayload {
  app: 'unimap';
  v: number;
  type: 'qr_login';
  sid: string;
  code?: string;
  createdAt: number;
  clientInfo?: {
    browser?: string;
    os?: string;
  };
}

export interface QrAuthorizedPayload {
  access_token: string;
  refresh_token: string;
  user?: any;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  deviceName?: string;
}

export type TransferableSession = {
  access_token: string;
  refresh_token: string;
  user?: any;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
};

export interface QrScannedPayload {
  deviceName?: string;
}

/**
 * Generates a unique QR session ID.
 */
export function generateQrSessionId(): string {
  return `qr_auth_${generateUUID().replace(/-/g, '').slice(0, 16)}_${Date.now()}`;
}

/**
 * Generates a friendly 6-digit pairing code as a fallback.
 */
export function generatePairingCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Creates the standardized QR code JSON string payload.
 */
export function createQrAuthPayload(
  sessionId: string,
  code: string,
  clientInfo?: { browser?: string; os?: string }
): string {
  const payload: QrLoginPayload = {
    app: 'unimap',
    v: 1,
    type: 'qr_login',
    sid: sessionId,
    code,
    createdAt: Date.now(),
    clientInfo,
  };
  return JSON.stringify(payload);
}

/**
 * Parses and validates an incoming QR text payload.
 */
export function parseQrAuthPayload(text: string): QrLoginPayload | null {
  try {
    const data = JSON.parse(text);
    if (data && data.app === 'unimap' && data.type === 'qr_login' && typeof data.sid === 'string') {
      return data as QrLoginPayload;
    }
  } catch {
    // Not valid JSON or not a unimap login payload
  }
  return null;
}

/**
 * Laptop/Web Client: Subscribes to the broadcast channel for the session ID and the 6-digit pair code.
 * Listens for:
 *  - 'scanned': Mobile has detected the QR code
 *  - 'authorized': Mobile has approved and transmitted the auth session
 */
export function subscribeToQrAuthSession(
  sessionId: string,
  code: string | undefined,
  callbacks: {
    onScanned: (data: QrScannedPayload) => void;
    onAuthorized: (data: QrAuthorizedPayload) => void;
    onError?: (error: any) => void;
  }
): () => void {
  const client = getSupabaseClient();
  if (!client) {
    callbacks.onError?.(new Error('Supabase client not available'));
    return () => {};
  }

  const channels: any[] = [];

  // Channel 1: Unique QR Session Channel
  const sessionChannelName = `qr_auth_${sessionId}`;
  const sessionChannel = client.channel(sessionChannelName, {
    config: { broadcast: { ack: true } },
  });

  sessionChannel
    .on('broadcast', { event: 'scanned' }, (msg: { payload: QrScannedPayload }) => {
      callbacks.onScanned(msg.payload || {});
    })
    .on('broadcast', { event: 'authorized' }, (msg: { payload: QrAuthorizedPayload }) => {
      callbacks.onAuthorized(msg.payload || ({} as any));
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        callbacks.onError?.(new Error(`Failed to subscribe to QR session channel`));
      }
    });

  channels.push(sessionChannel);

  // Channel 2: 6-Digit Pair Code Channel (Fallback)
  if (code && code.length >= 6) {
    const pairChannelName = `qr_pair_${code.trim()}`;
    const pairChannel = client.channel(pairChannelName, {
      config: { broadcast: { ack: true } },
    });

    pairChannel
      .on('broadcast', { event: 'scanned' }, (msg: { payload: QrScannedPayload }) => {
        callbacks.onScanned(msg.payload || {});
      })
      .on('broadcast', { event: 'authorized' }, (msg: { payload: QrAuthorizedPayload }) => {
        callbacks.onAuthorized(msg.payload || ({} as any));
      })
      .subscribe();

    channels.push(pairChannel);
  }

  return () => {
    channels.forEach((ch) => {
      try {
        client.removeChannel(ch);
      } catch (e) {
        console.warn('Error removing channel:', e);
      }
    });
  };
}

/**
 * Mobile Client: Notifies the laptop that its QR code was scanned.
 */
export async function notifyQrScanned(sessionId: string, deviceName: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const channelName = `qr_auth_${sessionId}`;
  const channel = client.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  return new Promise((resolve) => {
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.send({
            type: 'broadcast',
            event: 'scanned',
            payload: { deviceName },
          });
          resolve(true);
        } catch (err) {
          console.warn('Failed to send QR scanned broadcast:', err);
          resolve(false);
        } finally {
          client.removeChannel(channel);
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        resolve(false);
      }
    });
  });
}

/**
 * Mobile Client: Approves the login session and transmits session tokens to the laptop via sessionId.
 */
export async function authorizeQrSession(
  sessionId: string,
  session: TransferableSession,
  deviceName: string
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const channelName = `qr_auth_${sessionId}`;
  const channel = client.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  return new Promise((resolve) => {
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          const res = await channel.send({
            type: 'broadcast',
            event: 'authorized',
            payload: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              user: session.user,
              expires_at: session.expires_at,
              expires_in: session.expires_in,
              token_type: session.token_type,
              deviceName,
            },
          });
          resolve(res === 'ok');
        } catch (err) {
          console.error('Failed to authorize QR session:', err);
          resolve(false);
        } finally {
          setTimeout(() => {
            client.removeChannel(channel);
          }, 1500);
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        resolve(false);
      }
    });
  });
}

/**
 * Mobile Client: Approves the login session and transmits session tokens using the 6-digit pairing code.
 */
export async function authorizeWithPairCode(
  code: string,
  session: TransferableSession,
  deviceName: string
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const cleanCode = code.replace(/\D/g, '').trim();
  const channelName = `qr_pair_${cleanCode}`;
  const channel = client.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  return new Promise((resolve) => {
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          const res = await channel.send({
            type: 'broadcast',
            event: 'authorized',
            payload: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              user: session.user,
              expires_at: session.expires_at,
              expires_in: session.expires_in,
              token_type: session.token_type,
              deviceName,
            },
          });
          resolve(res === 'ok');
        } catch (err) {
          console.error('Failed to authorize pair code:', err);
          resolve(false);
        } finally {
          setTimeout(() => {
            client.removeChannel(channel);
          }, 1500);
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        resolve(false);
      }
    });
  });
}

/**
 * Generates a unique, human-friendly pairing key (e.g. UNI-749201).
 */
export function generateUniquePairingKey(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `UNI-${digits}`;
}

/**
 * Normalizes user-typed pairing keys (e.g. '849201', 'uni-849201', 'UNI 849201' -> 'UNI-849201').
 */
export function normalizePairingKey(input: string): string {
  const stripped = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (stripped.startsWith('UNI')) {
    return `UNI-${stripped.slice(3)}`;
  }
  if (/^\d{6}$/.test(stripped)) {
    return `UNI-${stripped}`;
  }
  return stripped;
}

/**
 * Logged-In Device: Listens for another device requesting to connect using this pairing key.
 * When a request arrives, automatically broadcasts authorization credentials to link the new device.
 */
export function listenForPairingKeyClaims(
  pairingKey: string,
  session: TransferableSession,
  deviceName: string,
  onClaimed?: (remoteDeviceName: string) => void
): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const cleanKey = normalizePairingKey(pairingKey);
  const channelName = `unimap_link_${cleanKey}`;
  const channel = client.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  channel
    .on('broadcast', { event: 'request_auth' }, async ({ payload }) => {
      try {
        await channel.send({
          type: 'broadcast',
          event: 'authorized',
          payload: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            user: session.user,
            expires_at: session.expires_at,
            expires_in: session.expires_in,
            token_type: session.token_type,
            deviceName,
          },
        });
        onClaimed?.(payload?.deviceName || 'New Device');
      } catch (err) {
        console.error('Failed to respond to pairing key request:', err);
      }
    })
    .subscribe();

  return () => {
    try {
      client.removeChannel(channel);
    } catch (e) {
      console.warn('Error removing pairing key channel:', e);
    }
  };
}

/**
 * New/Unauthenticated Device: Connects using a generated pairing key, sends request_auth,
 * and awaits session tokens from the logged-in device.
 */
export async function claimPairingKey(
  pairingKey: string,
  deviceName: string,
  callbacks: {
    onAuthorized: (data: QrAuthorizedPayload) => void;
    onError: (error: Error) => void;
  }
): Promise<() => void> {
  const client = getSupabaseClient();
  if (!client) {
    callbacks.onError(new Error('Backend client unavailable'));
    return () => {};
  }

  const cleanKey = normalizePairingKey(pairingKey);
  const channelName = `unimap_link_${cleanKey}`;
  const channel = client.channel(channelName, {
    config: { broadcast: { ack: true } },
  });

  let hasAuthorized = false;

  channel
    .on('broadcast', { event: 'authorized' }, ({ payload }) => {
      hasAuthorized = true;
      callbacks.onAuthorized(payload);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.send({
            type: 'broadcast',
            event: 'request_auth',
            payload: { deviceName },
          });

          // Timeout check if no response after 15 seconds
          setTimeout(() => {
            if (!hasAuthorized) {
              callbacks.onError(new Error('No response from logged-in device. Please ensure the pairing key is still active on your other device.'));
            }
          }, 15000);
        } catch (err: any) {
          callbacks.onError(err);
        }
      } else if (status === 'CHANNEL_ERROR') {
        callbacks.onError(new Error('Connection error. Please try again.'));
      }
    });

  return () => {
    try {
      client.removeChannel(channel);
    } catch (e) {}
  };
}

