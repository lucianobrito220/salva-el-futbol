export default function PhotoHero({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <img
        src="/backgrounds/cancha-hero.jpg"
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-charcoal" />
    </div>
  );
}
