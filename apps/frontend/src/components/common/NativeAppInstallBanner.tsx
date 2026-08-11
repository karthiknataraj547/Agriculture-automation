import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Download, CheckCircle2, X } from 'lucide-react';

export const NativeAppInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    // Check if app is already running in standalone native mode
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        '📲 To install AgriFlow Native App on your device:\n\n' +
        '• PC / Mac: Click the Install icon in the browser address bar.\n' +
        '• Android: Tap Menu (⋮) -> "Add to Home Screen".\n' +
        '• iPhone / iPad: Tap Share (⬆) -> "Add to Home Screen".'
      );
    }
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-slate-900/90 border-b border-purple-500/30 px-4 py-2 text-white text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg backdrop-blur-md">
      <div className="flex items-center space-x-2.5">
        <div className="w-7 h-7 rounded-xl bg-purple-600/40 border border-purple-400/50 flex items-center justify-center text-purple-300">
          <Monitor className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-white">Install AgriFlow Native App</span>
          <span className="text-purple-300 ml-1 font-medium hidden sm:inline">
            — Run natively on Windows, macOS, Android & iOS with full hardware Bluetooth access!
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install Native App</span>
        </button>

        <button
          onClick={() => setShowBanner(false)}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
