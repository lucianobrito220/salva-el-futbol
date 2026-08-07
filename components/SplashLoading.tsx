export default function SplashLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <div className="ball-bounce flex h-12 w-12 items-center justify-center rounded-full bg-brand-pale text-2xl">
        ⚽
      </div>
      <p className="text-xs font-medium text-inksoft">Cargando…</p>
    </div>
  );
}
