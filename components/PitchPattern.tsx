export default function PitchPattern({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 440 260"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B7A3C" />
          <stop offset="100%" stopColor="#125C2C" />
        </linearGradient>
        <radialGradient id="floodlight" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="#1E9E4A" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#1E9E4A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="440" height="260" fill="url(#grassGrad)" />
      {/* franjas de césped sintético */}
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x={i * 55} y="0" width="27.5" height="260" fill="#ffffff" opacity="0.035" />
      ))}
      <rect width="440" height="260" fill="url(#floodlight)" />

      {/* borde / vallado de la cancha techada (perimetro) */}
      <rect x="18" y="14" width="404" height="232" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="2" />

      {/* linea media + circulo central */}
      <line x1="220" y1="14" x2="220" y2="246" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.5" />
      <circle cx="220" cy="130" r="38" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.5" />
      <circle cx="220" cy="130" r="2.5" fill="#ffffff" fillOpacity="0.3" />

      {/* area chica arriba */}
      <rect x="160" y="14" width="120" height="30" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.5" />
      {/* area chica abajo */}
      <rect x="160" y="216" width="120" height="30" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.5" />

      {/* arcos (goal) arriba y abajo */}
      <rect x="196" y="8" width="48" height="8" fill="none" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="2" />
      <rect x="196" y="244" width="48" height="8" fill="none" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="2" />
    </svg>
  );
}
