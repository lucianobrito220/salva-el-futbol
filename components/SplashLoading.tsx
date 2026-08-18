'use client';

export default function SplashLoading() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center bg-bg p-4 fade-in">
      <div className="flex flex-col items-center gap-3 text-center">
        <img
          src="/brand/logo.png"
          alt="Salvá el Fútbol"
          className="h-12 w-12 rounded-full object-cover shadow-sm"
        />
        <p className="font-display text-base font-bold text-brand-dark">
          Salvá el Fútbol
        </p>
        <div className="flex items-center justify-center pt-0.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
          </span>
        </div>
      </div>
    </div>
  );
}
