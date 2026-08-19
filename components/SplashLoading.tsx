'use client';

export default function SplashLoading() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center p-4 blur-in">
      <img
        src="/backgrounds/splash.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-brand-dark/75 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <img
          src="/brand/logo.png"
          alt="Salvá el Fútbol"
          className="h-12 w-12 rounded-full object-cover shadow-sm drop-shadow-[0_0_20px_rgba(0,0,0,0.3)]"
        />
        <p className="font-display text-base font-bold text-white drop-shadow-md">
          Salvá el Fútbol
        </p>
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-white stagger-1" />
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-white stagger-2" />
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-white stagger-3" />
        </div>
      </div>
    </div>
  );
}
