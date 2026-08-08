'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import MapModal from '@/components/MapModal';

export default function LocationMapButton({ query, label, display }: { query: string; label: string; display: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="press-fx mb-4 flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-3 text-left text-sm"
      >
        <MapPin size={16} className="flex-shrink-0 text-brand-dark" />
        <span className="flex-1">{display}</span>
        <span className="text-xs font-bold text-brand-dark">Ver mapa</span>
      </button>
      {open && <MapModal query={query} label={label} onClose={() => setOpen(false)} />}
    </>
  );
}
