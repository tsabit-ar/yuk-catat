import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';

export const IOSInstallBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    // Check if already running in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && Boolean(window.navigator.standalone));

    const dismissed = localStorage.getItem('yukcatat_ios_banner_dismissed');

    if (isIOS && !isStandalone && !dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('yukcatat_ios_banner_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <aside aria-label="Panduan Instalasi iOS" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-white/20 rounded-lg flex items-center justify-center">
            <Share className="w-4 h-4" />
          </div>
          <p className="font-medium">
            Pengguna iOS: Ketuk tombol <span className="font-bold underline">Share</span> lalu pilih{' '}
            <span className="inline-flex items-center font-bold px-1.5 py-0.5 bg-white/20 rounded">
              <PlusSquare className="w-3.5 h-3.5 mr-1" /> Tambah ke Layar Utama (PWA)
            </span>{' '}
            untuk menerima pengingat harian.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-white/20 rounded-md transition shrink-0"
          title="Tutup banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
