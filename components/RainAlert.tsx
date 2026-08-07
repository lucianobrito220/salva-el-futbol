'use client';

import { useEffect, useState } from 'react';
import { CloudRain } from 'lucide-react';

export default function RainAlert({ date, time }: { date: string; time: string }) {
  const [prob, setProb] = useState<number | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=precipitation_probability&start_date=${date}&end_date=${date}`
          );
          const data = await res.json();
          const hour = time.slice(0, 2);
          const idx = (data?.hourly?.time || []).findIndex((t: string) => t.endsWith(`T${hour}:00`));
          if (idx >= 0) setProb(data.hourly.precipitation_probability[idx]);
        } catch {
          // Sin pronóstico disponible (partido muy lejano en el tiempo, por ejemplo): no mostramos nada.
        }
      },
      () => {},
      { timeout: 6000 }
    );
  }, [date, time]);

  if (prob === null || prob < 50) return null;

  return (
    <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
      <CloudRain size={18} className="flex-shrink-0" />
      <span>Puede llover para este partido ({prob}% de probabilidad). Tenganlo en cuenta.</span>
    </div>
  );
}
