import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { getSupabaseClient } from './supabase';
import { generateDefaultDeviceName } from './deviceDetector';

let isPushInitialized = false;
let currentRegisteredToken: string | null = null;

/**
 * Initializes native Android Push Notifications via Google Firebase Cloud Messaging (FCM).
 *
 * Steps:
 * 1. Checks native platform execution guard.
 * 2. Requests notification permissions from the OS.
 * 3. Registers device with Google FCM to obtain the registration token.
 * 4. Upserts the FCM token into Supabase table `user_push_tokens` linked to `userId`.
 * 5. Registers listeners for foreground and background push events.
 */
export async function initPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  if (isPushInitialized && currentRegisteredToken) {
    // Re-verify token association for current active user
    await savePushTokenToSupabase(userId, currentRegisteredToken);
    return;
  }

  try {
    // 1. Check existing permission status
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permission was not granted:', permStatus.receive);
      return;
    }

    // Clear any previous listeners to prevent duplicate triggers
    await PushNotifications.removeAllListeners();

    // 2. Listen for successful registration with Google FCM
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Native FCM registration successful. Token:', token.value.substring(0, 16) + '...');
      currentRegisteredToken = token.value;
      await savePushTokenToSupabase(userId, token.value);
    });

    // 3. Listen for FCM registration errors
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Native FCM registration error:', error);
    });

    // 4. Listen for push notification received while app is in foreground
    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Foreground push notification received:', notification);
        // Dispatch in-window event so UI components can display an in-app banner or badge
        window.dispatchEvent(
          new CustomEvent('unimap:push-received', {
            detail: notification,
          })
        );
      }
    );

    // 5. Listen for user tapping or interacting with a push notification
    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification tapped / action performed:', action);
        window.dispatchEvent(
          new CustomEvent('unimap:push-action', {
            detail: action,
          })
        );

        // If notification payload contains a specific route or item ID, navigate or handle
        const data = action.notification.data;
        if (data?.item_id) {
          window.dispatchEvent(
            new CustomEvent('unimap:navigate-item', {
              detail: { itemId: data.item_id },
            })
          );
        }
      }
    );

    // 6. Trigger registration with FCM
    await PushNotifications.register();
    isPushInitialized = true;
  } catch (err) {
    console.error('Failed to initialize native push notifications:', err);
  }
}

/**
 * Saves or updates the FCM token in Supabase `user_push_tokens` table.
 */
export async function savePushTokenToSupabase(userId: string, fcmToken: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId || !fcmToken) return;

  try {
    const deviceName =
      localStorage.getItem('unimap_custom_device_name') || generateDefaultDeviceName();

    const { error } = await client.from('user_push_tokens').upsert(
      {
        user_id: userId,
        fcm_token: fcmToken,
        platform: 'android',
        device_name: deviceName,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,fcm_token',
      }
    );

    if (error) {
      console.warn('Could not sync push token to Supabase:', error.message);
    } else {
      console.log('FCM token successfully registered to Supabase user_push_tokens.');
    }
  } catch (err) {
    console.error('Error in savePushTokenToSupabase:', err);
  }
}

/**
 * Unregisters push notifications and cleans up database token on sign out.
 */
export async function cleanupPushNotifications(userId?: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    if (userId && currentRegisteredToken) {
      const client = getSupabaseClient();
      if (client) {
        await client
          .from('user_push_tokens')
          .delete()
          .eq('user_id', userId)
          .eq('fcm_token', currentRegisteredToken);
      }
    }

    await PushNotifications.removeAllListeners();
    isPushInitialized = false;
    currentRegisteredToken = null;
  } catch (err) {
    console.warn('Error during push notification cleanup:', err);
  }
}
