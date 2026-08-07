'use client';

import { useEffect, useState } from 'react';
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog } from 'lucide-react';

const PHRASES = [
  'Lindo clima para un fútbol',
  'Día perfecto para la pelota',
  'Ideal para pisar la cancha',
  'Se viene un partidazo',
  'Clima de gol',
  'No hay excusa, ¡a jugar!',
  'Tarde de pelota',
  'Noche perfecta para un picado',
  'La cancha te espera',
  'Buen día para meter un caño',
];

function iconFor(code: number) {
  if (code === 0) return Sun;
  if (code <= 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

export default function WeatherWidget() {
  const [temp, setTemp] = useState<number | null>(null);
  const [code, setCode] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const [phrase] = useState(() => PHRASES[Math.floor(Math.random() * PHRASES.length)]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
          );
          const data = await res.json();
          setTemp(Math.round(data.current.temperature_2m));
          setCode(data.current.weather_code);
          setStatus('ready');
        } catch {
          setStatus('unavailable');
        }
      },
      () => setStatus('unavailable'),
      { timeout: 6000 }
    );
  }, []);

  if (status !== 'ready' || temp === null || code === null) return null;

  const Icon = iconFor(code);

  return (
    <>
      <button
        onClick={() => setExpanded(true)}
        className="press-fx flex max-w-[170px] items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5 backdrop-blur-sm"
      >
        <Icon size={14} className="flex-shrink-0 text-brand" />
        <span className="truncate text-[10.5px] font-semibold text-white">{phrase}</span>
        <span className="flex-shrink-0 text-xs font-bold text-white">· {temp}°</span>
      </button>

      {expanded && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 backdrop-blur-md"
          onClick={() => setExpanded(false)}
        >
          <div
            className="pop-in mx-8 flex flex-col items-center gap-2 rounded-3xl bg-white/95 px-10 py-9 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Icon size={48} className="text-brand" />
            <p className="mt-1 font-display text-lg font-extrabold text-ink">{phrase}</p>
            <p className="font-display text-4xl font-extrabold text-brand-dark">{temp}°</p>
            <button onClick={() => setExpanded(false)} className="mt-3 text-xs font-bold text-inksoft underline">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
