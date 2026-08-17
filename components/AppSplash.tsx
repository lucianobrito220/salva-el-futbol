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
          className={`fixed inset-0 z-[200] flex items-center justify-center overflow-hidden transition-opacity duration-300 ${
            showSplash ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <img
            src="/backgrounds/splash.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-brand-dark/75" />
          <img
            src="/brand/logo.png"
            alt="Salvá el Fútbol"
            className="pop-in relative h-36 w-36 drop-shadow-[0_0_40px_rgba(0,0,0,0.45)]"
          />
        </div>
      )}
      <div className={showSplash ? 'invisible' : 'visible fade-slide-up'}>{children}</div>
    </>
  );
}
