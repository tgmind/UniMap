import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ItemProvider } from './context/ItemContext';
import { Header } from './components/Header';
import { BentoView } from './components/views/BentoView';
import { TimelineView } from './components/views/TimelineView';
import { CanvasView } from './components/views/CanvasView';
import { AddItemModal } from './components/AddItemModal';
import { StorageMeterModal } from './components/StorageMeterModal';
import { FleetModal } from './components/FleetModal';
import { AuthModal } from './components/AuthModal';
import { ConfigModal } from './components/ConfigModal';
import { MediaLightboxModal } from './components/MediaLightboxModal';
import { AuthScreen } from './components/AuthScreen';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ViewMode } from './types';

const MainApp: React.FC = () => {
  const { user, isLoading, enterGuestMode } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('bento');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [isFleetOpen, setIsFleetOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Lightbox
  const [lightboxData, setLightboxData] = useState<{ url: string; title: string } | null>(null);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsAddOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent p-0.5 animate-pulse">
            <div className="w-full h-full bg-background rounded-[14px] flex items-center justify-center">
              <img src="/logo.svg" alt="UniMap" className="w-7 h-7" />
            </div>
          </div>
          <p className="text-xs text-text-muted font-mono animate-pulse">Initializing UniMap Vault...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show modern landing & login screen
  if (!user) {
    return <AuthScreen onEnterGuestMode={enterGuestMode} />;
  }

  return (
    <div className="min-h-screen bg-background text-text-main flex flex-col selection:bg-primary selection:text-white">
      {/* Top Navbar */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenAddModal={() => setIsAddOpen(true)}
        onOpenStorageModal={() => setIsStorageOpen(true)}
        onOpenFleetModal={() => setIsFleetOpen(true)}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onOpenConfigModal={() => setIsConfigOpen(true)}
      />

      {/* Main Content Area with Bottom Padding for Mobile Nav */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-28 md:pb-8">
        {viewMode === 'bento' && (
          <BentoView
            onOpenAddModal={() => setIsAddOpen(true)}
            onOpenMedia={(url, title) => setLightboxData({ url, title })}
          />
        )}
        {viewMode === 'timeline' && (
          <TimelineView
            onOpenMedia={(url, title) => setLightboxData({ url, title })}
          />
        )}
        {viewMode === 'canvas' && (
          <CanvasView
            onOpenMedia={(url, title) => setLightboxData({ url, title })}
          />
        )}
      </main>

      {/* Ergonomic Mobile Bottom Nav & Floating Action Button */}
      <MobileBottomNav
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenAddModal={() => setIsAddOpen(true)}
        onOpenFleetModal={() => setIsFleetOpen(true)}
        onOpenStorageModal={() => setIsStorageOpen(true)}
      />

      {/* Modals */}
      <AddItemModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <StorageMeterModal isOpen={isStorageOpen} onClose={() => setIsStorageOpen(false)} />
      <FleetModal isOpen={isFleetOpen} onClose={() => setIsFleetOpen(false)} />
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onOpenConfigModal={() => setIsConfigOpen(true)}
      />
      <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />

      {/* Media Lightbox */}
      {lightboxData && (
        <MediaLightboxModal
          url={lightboxData.url}
          title={lightboxData.title}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ItemProvider>
          <MainApp />
        </ItemProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
