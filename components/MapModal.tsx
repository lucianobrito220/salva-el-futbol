'use client';

import { useEffect, useState } from 'react';
import { X, MapPin, AlertCircle } from 'lucide-react';

interface Props {
  query: string;
  label: string;
  onClose: () => void;
}

export default function MapModal({ query, label, onClose }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    async function geocode() {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (cancelled) return;
        if (data && data[0]) {
          setCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
          setStatus('ready');
        } else {
          setStatus('error');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    geocode();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const delta = 0.006;
  const embedSrc = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - delta}%2C${coords.lat - delta}%2C${coords.lon + delta}%2C${coords.lat + delta}&layer=mapnik&marker=${coords.lat}%2C${coords.lon}`
    : '';

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-ink/50" onClick={onClose}>
      <div className="mt-auto w-full max-w-[440px] self-center rounded-t-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <MapPin size={17} className="text-brand-dark" />
            <span className="text-sm font-bold">{label}</span>
          </div>
          <button onClick={onClose} className="press-fx text-inksoft">
            <X size={20} />
          </button>
        </div>

        <div className="h-[340px] w-full bg-neutral-100">
          {status === 'loading' && (
            <div className="flex h-full items-center justify-center text-sm text-inksoft">Ubicando la cancha…</div>
          )}
          {status === 'error' && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-inksoft">
              <AlertCircle size={22} />
              No pudimos ubicar esta dirección en el mapa.
            </div>
          )}
          {status === 'ready' && embedSrc && (
            <iframe
              src={embedSrc}
              className="h-full w-full border-0"
              loading="lazy"
              title="Ubicación de la cancha"
            />
          )}
        </div>
      </div>
    </div>
  );
}
