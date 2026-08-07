'use client';

import { useEffect, useState } from 'react';

export default function AppSplash({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showSplash && (
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center bg-charcoal transition-opacity duration-300 ${
            showSplash ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <img
            src="/brand/logo.png"
            alt="Salvá el Fútbol"
            className="pop-in h-36 w-36 drop-shadow-[0_0_40px_rgba(30,158,74,0.35)]"
          />
        </div>
      )}
      <div className={showSplash ? 'invisible' : 'visible fade-slide-up'}>{children}</div>
    </>
  );
}
