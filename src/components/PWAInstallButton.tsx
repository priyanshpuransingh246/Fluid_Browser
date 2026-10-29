import React, { useEffect, useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export const PWAInstallButton: React.FC<{
  onOpenAndroidModal?: () => void;
}> = ({ onOpenAndroidModal }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Android App Active
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else if (onOpenAndroidModal) {
            onOpenAndroidModal();
          } else {
            setShowGuide(true);
          }
        }}
        className="min-h-[40px] px-4 rounded-full text-xs font-semibold text-[#180600] bg-white hover:bg-[#fff4ec] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        Install App
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Install ItihaskarStudio on Android"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-[24px] bg-[#180600] border border-white/15 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-[#ff8a1f]" />
                <h3 className="text-base font-semibold">
                  Install on Android Device
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close install guide"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-white/80">
              {isIOS ? (
                <p>
                  1. Tap the <strong>Share</strong> icon in Safari toolbar.
                  <br />
                  2. Select <strong>Add to Home Screen</strong>.
                </p>
              ) : (
                <>
                  <p>
                    1. Tap browser menu (<strong>⋮</strong>) on your Android
                    phone and select <strong>Install app</strong> /{' '}
                    <strong>Add to Home screen</strong>.
                  </p>
                  <p>
                    2. Or open the <strong>Auto-Browser APK</strong> tab in the
                    Studio to download the custom Android Chromium APK project.
                  </p>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[38px] px-5 rounded-full bg-white text-[#180600] text-xs font-semibold hover:bg-[#fff4ec]"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
