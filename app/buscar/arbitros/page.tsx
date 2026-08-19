'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';
import { ChevronLeft, MessageCircle, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import { showToast } from '@/lib/toast';
import SplashLoading from '@/components/SplashLoading';

export default function BuscarArbitrosPage() {
  const router = useRouter();
  const [referees, setReferees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReferees() {
      // Obtenemos a los perfiles que tienen is_referee = true
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_referee', true);
        
      if (!error && data) {
        setReferees(data as Profile[]);
      }
      setLoading(false);
    }
    fetchReferees();
  }, []);

  if (loading) return <SplashLoading />;

  return (
    <div className="pb-10">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-4 backdrop-blur-md">
        <button onClick={() => router.back()} className="press-fx text-ink">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-display text-lg font-black text-brand-dark">Directorio de Árbitros</h1>
      </div>

      <div className="p-5">
        <p className="mb-4 text-sm text-inksoft">
          Contactá directamente a los árbitros oficiales de tu ciudad para invitarlos a tus partidos o torneos.
        </p>

        <div className="flex flex-col gap-3">
          {referees.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-6 text-center">
              <p className="text-sm font-semibold text-inksoft">No hay árbitros disponibles todavía.</p>
            </div>
          ) : (
            referees.map((referee) => (
              <div key={referee.id} className="flex flex-col rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar name={referee.name || 'Árbitro'} url={referee.avatar_url} size={48} />
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-ink">{referee.name || 'Árbitro'}</h3>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-yellow-600 uppercase tracking-wide">
                      <Star size={12} className="fill-yellow-600" />
                      Árbitro Oficial
                    </div>
                    {referee.city && <p className="text-xs text-inksoft">{referee.city}</p>}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      if (referee.phone) {
                        window.open(`https://wa.me/${referee.phone.replace(/[^0-9]/g, '')}`, '_blank');
                      } else {
                        showToast.error('Este árbitro no tiene un número de teléfono público.');
                      }
                    }}
                    className="press-fx flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-xs font-bold text-white shadow-sm"
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
