'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloudRain, Sun, Cloud, CloudLightning, Droplets, Thermometer, Wind, X } from 'lucide-react';

export default function WeatherWidget({ date, lat, lon, compact = false }: { date: string, lat?: number | null, lon?: number | null, compact?: boolean }) {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function fetchWeather() {
      const queryLat = lat || -26.8241;
      const queryLon = lon || -65.2226;
      
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${queryLat}&longitude=${queryLon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max&timezone=America%2FArgentina%2FTucuman&start_date=${date}&end_date=${date}`);
        const data = await res.json();
        
        if (data.daily && data.daily.time && data.daily.time.length > 0) {
          setWeather({
            tempMax: data.daily.temperature_2m_max[0],
            tempMin: data.daily.temperature_2m_min[0],
            rainProb: data.daily.precipitation_probability_max[0],
            wind: data.daily.windspeed_10m_max[0],
            code: data.daily.weathercode[0]
          });
        }
      } catch (e) {
        console.error('Weather fetch error', e);
      }
      setLoading(false);
    }
    fetchWeather();
  }, [date, lat, lon]);

  if (loading || !weather) return null;

  let Icon = Sun;
  let label = 'Despejado';
  let color = 'text-amber-400';
  let bg = 'bg-amber-400/10';

  if (weather.code >= 1 && weather.code <= 3) {
    Icon = Cloud;
    label = 'Nublado';
    color = 'text-neutral-400';
    bg = 'bg-white/10';
  } else if (weather.code >= 51 && weather.code <= 67) {
    Icon = CloudRain;
    label = 'Lluvia';
    color = 'text-blue-400';
    bg = 'bg-blue-400/10';
  } else if (weather.code >= 80 && weather.code <= 99) {
    Icon = CloudLightning;
    label = 'Tormenta';
    color = 'text-purple-400';
    bg = 'bg-purple-400/10';
  }

  const modalContent = (showModal && mounted) ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm fade-in" onClick={() => setShowModal(false)}>
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl scale-in" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-6 text-center font-display text-lg font-bold text-ink">Pronóstico para el {date}</h3>
        
        <div className="mb-6 flex flex-col items-center justify-center">
          <div className={`mb-3 flex h-24 w-24 items-center justify-center rounded-full ${bg} ${color}`}>
            <Icon size={48} />
          </div>
          <div className="text-3xl font-black text-ink">{weather.tempMax}°C</div>
          <div className="text-sm font-semibold text-inksoft">{label}</div>
        </div>
        
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-2xl bg-blue-50 p-3 text-blue-700">
            <Droplets size={24} className="opacity-70" />
            <div>
              <div className="text-[10px] font-bold uppercase opacity-70">Lluvia</div>
              <div className="font-bold">{weather.rainProb}%</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-orange-50 p-3 text-orange-700">
            <Thermometer size={24} className="opacity-70" />
            <div>
              <div className="text-[10px] font-bold uppercase opacity-70">Mínima</div>
              <div className="font-bold">{weather.tempMin}°C</div>
            </div>
          </div>
          <div className="col-span-2 flex items-center gap-3 rounded-2xl bg-neutral-50 p-3 text-ink">
            <Wind size={24} className="text-inksoft" />
            <div>
              <div className="text-[10px] font-bold uppercase text-inksoft">Viento (Ráfagas)</div>
              <div className="font-bold">{weather.wind} km/h</div>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setShowModal(false)}
          className="press-fx flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-100 py-3 font-bold text-ink hover:bg-neutral-200"
        >
          <X size={18} />
          Cerrar
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  if (compact) {
    return (
      <>
        <button 
          onClick={() => setShowModal(true)}
          className="press-fx flex items-center gap-1.5 px-2 py-1 transition-opacity hover:opacity-80"
        >
          <Icon size={16} className={color} />
          <span className="text-[13px] font-bold text-ink dark:text-white">{weather.tempMax}°</span>
        </button>
        {modalContent}
      </>
    );
  }

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="press-fx mb-4 flex w-full items-center justify-between rounded-2xl border border-line bg-white p-3 shadow-sm transition-colors hover:bg-neutral-50"
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${bg} ${color}`}>
            <Icon size={18} />
          </div>
          <div className="text-left">
            <h4 className="text-[13px] font-bold text-ink leading-tight">Clima {label}</h4>
            <p className="text-[11px] text-inksoft">{weather.tempMax}° máximo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-sm font-black text-blue-600 leading-tight">{weather.rainProb}%</div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-inksoft">Lluvia</div>
          </div>
        </div>
      </button>
      {modalContent}
    </>
  );
}
