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
          className={`fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-bg dark:bg-[#1A1C20] transition-all duration-500 ease-in-out ${
            showSplash ? 'opacity-100 blur-none' : 'pointer-events-none opacity-0 blur-sm'
          }`}
        >
          <img
            src="/brand/logo.png"
            alt="Salvá el Fútbol"
            className="scale-in-sm relative h-36 w-36 drop-shadow-xl"
          />
        </div>
      )}
      <div className={showSplash ? 'invisible' : 'visible fade-slide-up'}>{children}</div>
    </>
  );
}
