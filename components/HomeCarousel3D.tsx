'use client';

import { useRouter } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import { Megaphone, Search, Users, Trophy } from 'lucide-react';

export default function HomeCarousel3D() {
  const router = useRouter();

  const slides = [
    {
      title: 'Sumarme a uno',
      desc: 'Buscá partidos',
      icon: <Search size={24} strokeWidth={2.5} />,
      activeColor: 'bg-brand glow-fx border-transparent',
      inactiveColor: 'bg-white/5 border-white/10 dark:bg-charcoal-light/50',
      action: () => router.push('/buscar')
    },
    {
      title: 'Armar partido',
      desc: 'Armá y compartí',
      icon: <Megaphone size={24} strokeWidth={2.5} />,
      activeColor: 'bg-brand glow-fx border-transparent',
      inactiveColor: 'bg-white/5 border-white/10 dark:bg-charcoal-light/50',
      action: () => router.push('/publicar')
    },
    {
      title: 'Buscar rival',
      desc: 'Para tu equipo',
      icon: <Users size={24} strokeWidth={2.5} />,
      activeColor: 'bg-brand glow-fx border-transparent',
      inactiveColor: 'bg-white/5 border-white/10 dark:bg-charcoal-light/50',
      action: () => router.push('/publicar?tipo=equipo_rival')
    },
    {
      title: 'Explorar',
      desc: 'Torneos locales',
      icon: <Trophy size={24} strokeWidth={2.5} />,
      activeColor: 'bg-brand glow-fx border-transparent',
      inactiveColor: 'bg-white/5 border-white/10 dark:bg-charcoal-light/50',
      action: () => router.push('/torneos')
    }
  ];

  return (
    <div className="w-full mt-2 mb-2 relative z-10">
      <Swiper
        effect={'coverflow'}
        grabCursor={true}
        centeredSlides={true}
        slidesPerView={'auto'}
        initialSlide={1}
        coverflowEffect={{
          rotate: 0,
          stretch: -15,
          depth: 120,
          modifier: 1.5,
          slideShadows: false,
        }}
        pagination={{ 
          el: '.custom-pagination', 
          clickable: true,
          bulletClass: 'swiper-bullet-custom',
          bulletActiveClass: 'swiper-bullet-active-custom'
        }}
        modules={[EffectCoverflow, Pagination]}
        className="w-full h-[170px] flex items-center"
        speed={250}
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i} className="!w-[140px] !h-[160px]" onClick={slide.action}>
            {({ isActive }) => (
              <div 
                className={`w-full h-full rounded-[22px] flex flex-col items-center justify-center p-3 transition-all duration-300 border backdrop-blur-md ${isActive ? slide.activeColor : slide.inactiveColor + ' opacity-70 scale-95'}`}
              >
                <div className="relative mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-full">
                  <div className={`absolute inset-0 rounded-full transition-all duration-500 ${isActive ? 'bg-white/20 shadow-inner' : 'bg-neutral-100 dark:bg-white/5'}`} />
                  <div className={`relative z-10 ${isActive ? 'text-white' : 'text-inksoft dark:text-white/50'}`}>
                    {slide.icon}
                  </div>
                  {/* Plus badge like in the screenshot */}
                  {isActive && i === 1 && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white text-brand flex items-center justify-center font-bold text-sm shadow-md leading-none pt-0.5">
                      +
                    </div>
                  )}
                </div>
                <h3 className={`text-[14px] font-display font-extrabold text-center leading-tight mb-0.5 transition-all ${isActive ? 'text-white' : 'text-ink dark:text-white/80'}`}>
                  {slide.title}
                </h3>
                <p className={`text-[11px] font-medium text-center transition-all ${isActive ? 'text-white/80' : 'text-inksoft dark:text-white/40'}`}>
                  {slide.desc}
                </p>
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="custom-pagination flex justify-center gap-2 mt-2 pb-2"></div>
      
      <style jsx global>{`
        .swiper-bullet-custom {
          width: 6px;
          height: 6px;
          background: rgba(138, 138, 138, 0.3);
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .swiper-bullet-active-custom {
          background: #00d65f; /* brand color */
          width: 24px;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
