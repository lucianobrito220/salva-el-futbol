'use client';

export default function SplashLoading() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center bg-bg dark:bg-[#1A1C20] p-4 blur-in">
      <div className="flex flex-col items-center gap-3 text-center">
        <img
          src="/brand/logo.png"
          alt="Salvá el Fútbol"
          className="h-12 w-12 rounded-full object-cover shadow-sm"
        />
        <p className="font-display text-base font-bold text-brand-dark">
          Salvá el Fútbol
        </p>
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand stagger-1" />
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand stagger-2" />
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand stagger-3" />
        </div>
      </div>
    </div>
  );
}
