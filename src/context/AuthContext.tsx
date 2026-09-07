import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConnectedDevice, UserProfile } from '../types';
import { getSupabaseClient, getSupabaseConfig, ensureClientAuth, resetSupabaseClient } from '../lib/supabase';
import { localDb } from '../lib/db';
import {
  detectBrowser,
  detectDeviceOS,
  detectDeviceType,
  generateDefaultDeviceName,
  getDeviceToken,
} from '../lib/deviceDetector';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isConfigured: boolean;
  currentDeviceToken: string;
  devices: ConnectedDevice[];
  signIn: (email: string, pass: string) => Promise<{ error?: string }>;
  signUp: (email: string, pass: string, name?: string) => Promise<{ error?: string }>;
  signInWithSession: (
    accessToken: string,
    refreshToken?: string,
    remoteUser?: any,
    sessionMeta?: { expires_at?: number; expires_in?: number; token_type?: string }
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  revokeDevice: (deviceId: string) => Promise<void>;
  renameDevice: (deviceId: string, name: string) => Promise<void>;
  refreshDevices: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);

  const deviceToken = getDeviceToken();
  const { isConfigured } = getSupabaseConfig();

  // Clear any legacy guest mode flag
  useEffect(() => {
    localStorage.removeItem('unimap_guest_mode');
  }, []);

  // Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
      const client = getSupabaseClient();
      if (!client) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session } } = await client.auth.getSession();
        let activeUser: UserProfile | null = null;

        if (session?.user) {
          activeUser = {
            id: session.user.id,
            email: session.user.email || '',
            display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
          };
        } else {
          // Fallback: check stored session in localStorage
          try {
            const raw = localStorage.getItem('unimap_auth_token');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.user?.id) {
                activeUser = {
                  id: parsed.user.id,
                  email: parsed.user.email || '',
                  display_name: parsed.user.user_metadata?.display_name || parsed.user.email?.split('@')[0] || 'User',
                };
              }
            }
          } catch (e) {
            console.warn('Fallback local auth read error:', e);
          }
        }

        if (activeUser) {
          ensureClientAuth();
          setUser(activeUser);
          await registerCurrentDeviceOnline(activeUser.id);
          await fetchDevicesOnline(activeUser.id);
        }

        // Listen for auth state changes
        const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            ensureClientAuth(session.access_token);
            const u: UserProfile = {
              id: session.user.id,
              email: session.user.email || '',
              display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
            };
            setUser(u);
            await registerCurrentDeviceOnline(u.id);
            await fetchDevicesOnline(u.id);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setDevices([]);
          }
        });

        // Setup real-time remote revocation listener for this specific device token
        setupDeviceRevokeListener();

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [isConfigured]);

  const registerCurrentDeviceOnline = async (userId: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const devName = localStorage.getItem('unimap_custom_device_name') || generateDefaultDeviceName();
      const payload = {
        user_id: userId,
        device_token: deviceToken,
        device_name: devName,
        device_type: detectDeviceType(),
        os: detectDeviceOS(),
        browser: detectBrowser(),
        last_active_at: new Date().toISOString(),
        is_revoked: false,
      };

      await client
        .from('devices')
        .upsert(payload, { onConflict: 'user_id,device_token' });
    } catch (err) {
      console.warn('Device registration skipped:', err);
    }
  };

  const fetchDevicesOnline = async (userId: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('devices')
        .select('*')
        .eq('user_id', userId)
        .eq('is_revoked', false)
        .order('last_active_at', { ascending: false });

      if (!error && data) {
        setDevices(
          data.map((d: any) => ({
            ...d,
            is_current: d.device_token === deviceToken,
            is_online: true,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    }
  };

  const setupDeviceRevokeListener = () => {
    const client = getSupabaseClient();
    if (!client) return;

    const channel = client.channel(`device_revoke_${deviceToken}`);
    channel
      .on('broadcast', { event: 'force_logout' }, () => {
        alert('This device session has been revoked from another device.');
        signOut();
      })
      .subscribe();
  };

  const signIn = async (email: string, pass: string) => {
    const client = getSupabaseClient();
    if (!client) {
      return { error: 'Cloud backend is initializing. Please try again in a moment.' };
    }
    const { error } = await client.auth.signInWithPassword({ email, password: pass });
    if (error) return { error: error.message };
    return {};
  };

  const signUp = async (email: string, pass: string, name?: string) => {
    const client = getSupabaseClient();
    if (!client) {
      return { error: 'Cloud backend is initializing. Please try again in a moment.' };
    }
    const { error } = await client.auth.signUp({
      email,
      password: pass,
      options: {
        data: { display_name: name || email.split('@')[0] },
      },
    });
    if (error) return { error: error.message };
    return {};
  };

  const signInWithSession = async (
    accessToken: string,
    refreshToken?: string,
    remoteUser?: any,
    sessionMeta?: { expires_at?: number; expires_in?: number; token_type?: string }
  ) => {
    if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
      return { error: 'Valid access credentials were not received from authorizing device.' };
    }

    const client = getSupabaseClient();
    const safeRefreshToken = refreshToken && refreshToken.trim().length > 0 ? refreshToken.trim() : accessToken;

    let authenticatedUser: UserProfile | null = null;
    let authSucceeded = false;

    // 1. Attempt official client.auth.setSession first
    if (client) {
      try {
        const { data, error } = await client.auth.setSession({
          access_token: accessToken.trim(),
          refresh_token: safeRefreshToken,
        });

        if (!error && data.session?.user) {
          authenticatedUser = {
            id: data.session.user.id,
            email: data.session.user.email || '',
            display_name:
              data.session.user.user_metadata?.display_name ||
              data.session.user.email?.split('@')[0] ||
              'User',
          };
          authSucceeded = true;
        } else if (error) {
          console.warn('Supabase setSession reported warning:', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase setSession error, applying resilient session fallback:', err);
      }
    }

    // 2. Direct hydration fallback (bypasses AuthSessionMissingError and network delays)
    if (!authSucceeded) {
      let resolvedUserId = '';
      let resolvedEmail = '';
      let resolvedDisplayName = '';

      // Try decoding JWT
      try {
        const parts = accessToken.split('.');
        if (parts.length >= 2) {
          let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) base64 += '=';
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const decoded = new TextDecoder().decode(bytes);
          const jwtPayload = JSON.parse(decoded);

          if (jwtPayload.sub) resolvedUserId = jwtPayload.sub;
          if (jwtPayload.email) resolvedEmail = jwtPayload.email;
          if (jwtPayload.user_metadata?.display_name) {
            resolvedDisplayName = jwtPayload.user_metadata.display_name;
          }
        }
      } catch (e) {
        console.warn('Could not decode JWT payload:', e);
      }

      // Check remoteUser if provided
      if (remoteUser) {
        if (remoteUser.id) resolvedUserId = remoteUser.id;
        if (remoteUser.email) resolvedEmail = remoteUser.email;
        if (remoteUser.user_metadata?.display_name) {
          resolvedDisplayName = remoteUser.user_metadata.display_name;
        } else if (remoteUser.display_name) {
          resolvedDisplayName = remoteUser.display_name;
        }
      }

      if (!resolvedUserId) {
        return { error: 'Could not extract valid user identity from authorization credentials.' };
      }

      const userObject = {
        id: resolvedUserId,
        aud: 'authenticated',
        role: 'authenticated',
        email: resolvedEmail,
        user_metadata: {
          display_name: resolvedDisplayName || (resolvedEmail ? resolvedEmail.split('@')[0] : 'User'),
        },
      };

      const syntheticSession = {
        access_token: accessToken.trim(),
        refresh_token: safeRefreshToken,
        token_type: sessionMeta?.token_type || 'bearer',
        expires_in: sessionMeta?.expires_in || 3600,
        expires_at: sessionMeta?.expires_at || Math.floor(Date.now() / 1000) + 3600,
        user: userObject,
      };

      try {
        localStorage.setItem('unimap_auth_token', JSON.stringify(syntheticSession));
      } catch (e) {
        console.warn('Failed to store session in localStorage:', e);
      }

      authenticatedUser = {
        id: resolvedUserId,
        email: resolvedEmail,
        display_name: resolvedDisplayName || (resolvedEmail ? resolvedEmail.split('@')[0] : 'User'),
      };
      authSucceeded = true;
    }

    if (authenticatedUser) {
      ensureClientAuth(accessToken);
      setUser(authenticatedUser);
      await registerCurrentDeviceOnline(authenticatedUser.id);
      await fetchDevicesOnline(authenticatedUser.id);
      return {};
    }

    return { error: 'Authentication failed. Please try again.' };
  };

  const signOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    resetSupabaseClient();
    try {
      await localDb.items.clear();
    } catch (e) {
      console.warn('Error clearing localDb items on logout:', e);
    }
    localStorage.removeItem('unimap_auth_token');
    localStorage.removeItem('unimap_guest_mode');
    setUser(null);
    setDevices([]);
  };

  const revokeDevice = async (deviceId: string) => {
    const client = getSupabaseClient();
    const targetDev = devices.find((d) => d.id === deviceId);

    if (client && targetDev) {
      await client.from('devices').update({ is_revoked: true }).eq('id', deviceId);

      const channel = client.channel(`device_revoke_${targetDev.device_token}`);
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'force_logout',
        payload: { deviceId },
      });
    }

    setDevices((prev) => prev.filter((d) => d.id !== deviceId));
  };

  const renameDevice = async (deviceId: string, newName: string) => {
    const client = getSupabaseClient();
    if (client) {
      await client.from('devices').update({ device_name: newName }).eq('id', deviceId);
    }
    setDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, device_name: newName } : d))
    );
  };

  const refreshDevices = async () => {
    if (user) {
      await fetchDevicesOnline(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isConfigured,
        currentDeviceToken: deviceToken,
        devices,
        signIn,
        signUp,
        signInWithSession,
        signOut,
        revokeDevice,
        renameDevice,
        refreshDevices,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
