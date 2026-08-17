'use client';

import { useEffect, useState } from 'react';
import { X, MapPin, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const customIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

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
        const res = await fetch(
          `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&sourceCountry=ARG&maxLocations=1&singleLine=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (data && data.candidates && data.candidates.length > 0) {
          setCoords({ lat: data.candidates[0].location.y, lon: data.candidates[0].location.x });
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

        <div className="h-[340px] w-full bg-neutral-100 relative z-0">
          {status === 'loading' && (
            <div className="flex h-full items-center justify-center text-sm text-inksoft">Ubicando la cancha…</div>
          )}
          {status === 'error' && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-inksoft">
              <AlertCircle size={22} />
              No pudimos ubicar esta dirección en el mapa.
            </div>
          )}
          {status === 'ready' && coords && (
            <MapContainer center={[coords.lat, coords.lon]} zoom={15} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                attribution="&copy; Google Maps"
              />
              <Marker position={[coords.lat, coords.lon]} icon={customIcon} />
            </MapContainer>
          )}
        </div>

        {coords && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${coords.lat}%2C${coords.lon}`}
            target="_blank"
            rel="noreferrer"
            className="press-fx block border-t border-line px-5 py-3 text-center text-xs font-bold text-brand-dark hover:bg-neutral-50"
          >
            Abrir en Google Maps
          </a>
        )}
      </div>
    </div>
  );
}
