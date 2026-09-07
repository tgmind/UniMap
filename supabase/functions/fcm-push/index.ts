// ============================================================================
// Supabase Edge Function: fcm-push
// Dispatches Native Android Push Notifications via Google FCM HTTP v1 API
// Triggered by: Supabase Database Webhook on `public.notifications` table (INSERT)
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

interface ServiceAccountKey {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface WebhookPayload {
  type?: string;
  table?: string;
  record?: {
    id?: string;
    user_id?: string;
    title?: string;
    body?: string;
    data?: Record<string, string>;
  };
  // Fallback for direct API invocation
  user_id?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
}

// In-memory token cache for OAuth2 access token
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Base64URL encoder helper
 */
function base64url(input: Uint8Array | string): string {
  let str: string;
  if (typeof input === 'string') {
    str = btoa(input);
  } else {
    let binary = '';
    const bytes = new Uint8Array(input);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    str = btoa(binary);
  }
  return str.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Converts a PEM formatted private key string into a CryptoKey for Web Crypto signing.
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';

  let cleanKey = pem.trim();
  if (cleanKey.includes(pemHeader)) {
    const startIndex = cleanKey.indexOf(pemHeader) + pemHeader.length;
    const endIndex = cleanKey.indexOf(pemFooter);
    cleanKey = cleanKey.substring(startIndex, endIndex);
  }
  cleanKey = cleanKey.replace(/\s+/g, '');

  const binaryString = atob(cleanKey);
  const keyBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    keyBytes[i] = binaryString.charCodeAt(i);
  }

  return await crypto.subtle.importKey(
    'pkcs8',
    keyBytes.buffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' },
    },
    false,
    ['sign']
  );
}

/**
 * Generates an OAuth2 Access Token for FCM HTTP v1 using RFC 7523 JWT assertion.
 */
async function getFcmAccessToken(serviceAccount: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if valid for at least 5 more minutes
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 300) {
    return cachedAccessToken.token;
  }

  const tokenUri = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token';

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const dataToSign = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);

  const privateKey = await importPrivateKey(serviceAccount.private_key);
  const signatureBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, dataToSign);
  const signedJwt = `${encodedHeader}.${encodedPayload}.${base64url(new Uint8Array(signatureBuffer))}`;

  // Exchange JWT for OAuth2 Access Token
  const tokenResponse = await fetch(tokenUri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error(`Google OAuth2 token exchange failed (${tokenResponse.status}): ${errText}`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  const expiresIn = tokenData.expires_in || 3600;

  cachedAccessToken = {
    token: accessToken,
    expiresAt: now + expiresIn,
  };

  return accessToken;
}

/**
 * Main HTTP Handler
 */
serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const rawServiceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!rawServiceAccount) {
      return new Response(
        JSON.stringify({
          error: 'Missing FIREBASE_SERVICE_ACCOUNT in Supabase Secrets. Please add your Firebase Service Account JSON.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccount: ServiceAccountKey = JSON.parse(rawServiceAccount);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase URL or Service Role Key missing in environment.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse incoming payload (Database Webhook or direct POST)
    const payload: WebhookPayload = await req.json();
    const record = payload.record || payload;

    const targetUserId = record.user_id;
    const notificationTitle = record.title || 'White Vault Notification';
    const notificationBody = record.body || '';
    const rawData = record.data || {};

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'No target user_id specified in webhook payload.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Lookup user's registered FCM tokens
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('user_push_tokens')
      .select('id, fcm_token, platform, device_token')
      .eq('user_id', targetUserId);

    if (tokensError) {
      return new Response(
        JSON.stringify({ error: 'Database query failed', details: tokensError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No registered devices found for user.', count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate with Google FCM HTTP v1
    const accessToken = await getFcmAccessToken(serviceAccount);
    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    const sendResults: Array<{ token: string; status: string; error?: string }> = [];
    const tokensToDelete: string[] = [];
    const senderDeviceToken = rawData.sender_device_token;

    // Ensure all data attributes are string values as required by FCM specification
    const stringifiedData: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawData)) {
      stringifiedData[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }

    // Dispatch notification to each registered device (excluding sender)
    for (const item of tokens) {
      // Exclude the device that posted the card!
      if (senderDeviceToken && item.device_token && item.device_token === senderDeviceToken) {
        console.log(`[fcm-push] Skipping push notification for sender device: ${senderDeviceToken}`);
        continue;
      }
      const messageBody = {
        message: {
          token: item.fcm_token,
          notification: {
            title: notificationTitle,
            body: notificationBody,
          },
          data: stringifiedData,
          android: {
            priority: 'HIGH',
            notification: {
              sound: 'default',
              channel_id: 'whitevault_notifications',
              default_vibrate_timings: true,
              notification_priority: 'PRIORITY_HIGH',
            },
          },
        },
      };

      try {
        const fcmResponse = await fetch(fcmEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messageBody),
        });

        if (fcmResponse.ok) {
          sendResults.push({ token: item.fcm_token, status: 'sent' });
        } else {
          const errData = await fcmResponse.json();
          const errCode = errData?.error?.details?.[0]?.errorCode || errData?.error?.message || '';

          // If token is dead or unregistered, schedule for removal
          if (
            fcmResponse.status === 404 ||
            errCode.includes('UNREGISTERED') ||
            errCode.includes('NOT_FOUND') ||
            errCode.includes('INVALID_ARGUMENT')
          ) {
            tokensToDelete.push(item.fcm_token);
          }

          sendResults.push({
            token: item.fcm_token,
            status: 'failed',
            error: errData?.error?.message || `HTTP ${fcmResponse.status}`,
          });
        }
      } catch (fcmErr: any) {
        sendResults.push({
          token: item.fcm_token,
          status: 'error',
          error: fcmErr.message,
        });
      }
    }

    // Clean up stale or invalid tokens
    if (tokensToDelete.length > 0) {
      await supabaseAdmin.from('user_push_tokens').delete().in('fcm_token', tokensToDelete);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentCount: sendResults.filter((r) => r.status === 'sent').length,
        results: sendResults,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Internal edge function error', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
