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
  signOut: () => Promise<void>;
  revokeDevice: (deviceId: string) => Promise<void>;
  renameDevice: (deviceId: string, name: string) => Promise<void>;
  refreshDevices: () => Promise<void>;
  isGuestMode: boolean;
  enterGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [isGuestMode, setIsGuestMode] = useState(() => {
    return localStorage.getItem('unimap_guest_mode') === 'true';
  });

  const deviceToken = getDeviceToken();
  const { isConfigured } = getSupabaseConfig();

  // Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
      const client = getSupabaseClient();
      if (!client) {
        // If Supabase is not configured yet, allow guest mode
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
          setIsGuestMode(false);
          localStorage.removeItem('unimap_guest_mode');
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
            setIsGuestMode(false);
            localStorage.removeItem('unimap_guest_mode');
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

  const enterGuestMode = () => {
    setIsGuestMode(true);
    localStorage.setItem('unimap_guest_mode', 'true');
    const localUser: UserProfile = {
      id: 'local_study_user',
      email: 'offline.scholar@unimap.local',
      display_name: 'Local Scholar',
    };
    setUser(localUser);
    registerCurrentDeviceLocally();
  };

  const registerCurrentDeviceLocally = () => {
    const current: ConnectedDevice = {
      id: 'local_dev_1',
      user_id: 'local_user',
      device_token: deviceToken,
      device_name: generateDefaultDeviceName(),
      device_type: detectDeviceType(),
      os: detectDeviceOS(),
      browser: detectBrowser(),
      last_active_at: new Date().toISOString(),
      is_revoked: false,
      is_current: true,
      is_online: true,
    };
    setDevices([current]);
  };

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

  const signOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    localStorage.removeItem('unimap_auth_token');
    localStorage.removeItem('unimap_guest_mode');
    setUser(null);
    setIsGuestMode(false);
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
    if (user && !isGuestMode) {
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
        signOut,
        revokeDevice,
        renameDevice,
        refreshDevices,
        isGuestMode,
        enterGuestMode,
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
