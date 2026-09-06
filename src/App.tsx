import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { usePwaInstall } from './lib/usePwaInstall';
import { ViewMode } from './types';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('bento');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [isFleetOpen, setIsFleetOpen] = useState(false);
  const [fleetInitialTab, setFleetInitialTab] = useState<'devices' | 'qr_generate' | 'qr_scan'>('devices');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const handleOpenFleet = useCallback((tab?: 'devices' | 'qr_generate' | 'qr_scan') => {
    setFleetInitialTab(tab || 'devices');
    setIsFleetOpen(true);
  }, []);

  // Modern PWA Installation Hook
  const { isIOS, showInstallPrompt, promptInstall, dismissInstallPrompt } = usePwaInstall();

  // Mobile bottom navigation compact/expanded state
  const [isBottomNavExpanded, setIsBottomNavExpanded] = useState(false);

  // Synchronized intelligent auto-hide for top header & mobile bottom navigation
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const wakeChrome = useCallback((delayMs = 3500) => {
    setIsChromeVisible(true);
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
    if (delayMs > 0) {
      autoHideTimerRef.current = setTimeout(() => {
        setIsChromeVisible(false);
      }, delayMs);
    }
  }, []);

  const hideChrome = useCallback(() => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
    setIsChromeVisible(false);
  }, []);

  useEffect(() => {
    // Reveal header initially for 3.5s then auto-hide
    wakeChrome(3500);

    let lastScrollY = window.scrollY || document.documentElement.scrollTop;
    let touchStartY = 0;

    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;

      const isScrollingDown = currentScrollY > lastScrollY + 8;
      const isScrollingUp = currentScrollY < lastScrollY - 8;

      if (isScrollingDown) {
        // Hides top header and compacts bottom nav for full immersive viewing
        hideChrome();
        setIsBottomNavExpanded(false);
      } else if (isScrollingUp) {
        // Deliberate scroll up: reveal header
        wakeChrome(3500);
      } else if (currentScrollY <= 20) {
        // At top of page: reveal header
        wakeChrome(4000);
      } else if (currentScrollY + windowHeight >= documentHeight - 30) {
        // At bottom of page: reveal header
        wakeChrome(4000);
      }

      lastScrollY = currentScrollY;
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      const currentY = e.touches[0].clientY;
      const diffY = currentY - touchStartY;

      // Deliberate pull-down at top reveals chrome
      if (currentScrollY <= 30 && diffY > 20) {
        wakeChrome(4000);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < -12) {
        wakeChrome(3500);
      } else if (e.deltaY > 12) {
        hideChrome();
        setIsBottomNavExpanded(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [wakeChrome, hideChrome]);

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

  // If user is not authenticated, show modern landing & login screen with PWA install support
  if (!user) {
    return (
      <>
        <AuthScreen />
        <PwaInstallPrompt
          isOpen={showInstallPrompt}
          isIOS={isIOS}
          onInstall={promptInstall}
          onDismiss={dismissInstallPrompt}
        />
      </>
    );
  }

  return (
    <div className={`min-h-screen ${viewMode === 'canvas' ? 'bg-background' : 'telegram-canvas'} text-text-main flex flex-col selection:bg-primary selection:text-white`}>
      {/* Top Navbar */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenAddModal={() => setIsAddOpen(true)}
        onOpenStorageModal={() => setIsStorageOpen(true)}
        onOpenFleetModal={handleOpenFleet}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onOpenConfigModal={() => setIsConfigOpen(true)}
        isChromeVisible={isChromeVisible}
        onWakeChrome={wakeChrome}
        onHideChrome={hideChrome}
      />

      {/* Main Content Area: Edge-to-edge full screen for Canvas, padded container for Bento/Timeline */}
      <main
        className={
          viewMode === 'canvas'
            ? 'fixed inset-0 w-full h-full overflow-hidden'
            : 'flex-1 w-full mx-auto pt-14 sm:pt-16 py-2 sm:py-4 pb-20 md:pb-8'
        }
      >
        {viewMode === 'bento' && (
          <BentoView
            onOpenAddModal={() => setIsAddOpen(true)}
            onOpenMedia={(url, title) => setLightboxData({ url, title })}
            isNavVisible={isBottomNavExpanded}
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
            onOpenAddModal={() => setIsAddOpen(true)}
            isNavVisible={isBottomNavExpanded}
            isHeaderVisible={isChromeVisible}
          />
        )}
      </main>

      {/* Ergonomic Mobile Bottom Nav & Floating Action Button */}
      <MobileBottomNav
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenAddModal={() => setIsAddOpen(true)}
        onOpenFleetModal={handleOpenFleet}
        onOpenStorageModal={() => setIsStorageOpen(true)}
        isExpanded={isBottomNavExpanded}
        onExpandChange={setIsBottomNavExpanded}
      />

      {/* Modals */}
      <AddItemModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <StorageMeterModal isOpen={isStorageOpen} onClose={() => setIsStorageOpen(false)} />
      <FleetModal
        isOpen={isFleetOpen}
        onClose={() => setIsFleetOpen(false)}
        initialTab={fleetInitialTab}
      />
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

      {/* Modern PWA Install Bottom Sheet Popup */}
      <PwaInstallPrompt
        isOpen={showInstallPrompt}
        isIOS={isIOS}
        onInstall={promptInstall}
        onDismiss={dismissInstallPrompt}
      />
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
