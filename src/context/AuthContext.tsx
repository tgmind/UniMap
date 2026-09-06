import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConnectedDevice, UserProfile } from '../types';
import { getSupabaseClient, getSupabaseConfig } from '../lib/supabase';
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
  signInWithSession: (accessToken: string, refreshToken: string) => Promise<{ error?: string }>;
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
        if (session?.user) {
          const u: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0],
          };
          setUser(u);
          await registerCurrentDeviceOnline(u.id);
          await fetchDevicesOnline(u.id);
        }

        // Listen for auth state changes
        const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
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

  const signInWithSession = async (accessToken: string, refreshToken: string) => {
    const client = getSupabaseClient();
    if (!client) {
      return { error: 'Cloud backend is initializing. Please try again in a moment.' };
    }
    try {
      const { data, error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) return { error: error.message };

      if (data.session?.user) {
        const u: UserProfile = {
          id: data.session.user.id,
          email: data.session.user.email || '',
          display_name:
            data.session.user.user_metadata?.display_name ||
            data.session.user.email?.split('@')[0],
        };
        setUser(u);
        await registerCurrentDeviceOnline(u.id);
        await fetchDevicesOnline(u.id);
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to authenticate session' };
    }
  };

  const signOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
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
