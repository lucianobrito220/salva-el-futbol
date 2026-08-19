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
      icon: <Search size={28} strokeWidth={2.5} />,
      color: 'bg-brand text-white',
      action: () => router.push('/buscar')
    },
    {
      title: 'Armar partido',
      desc: 'Armá y compartí',
      icon: <Megaphone size={28} strokeWidth={2.5} />,
      color: 'bg-brand text-white',
      action: () => router.push('/publicar')
    },
    {
      title: 'Buscar rival',
      desc: 'Para tu equipo',
      icon: <Users size={28} strokeWidth={2.5} />,
      color: 'bg-brand text-white',
      action: () => router.push('/publicar?tipo=equipo_rival')
    },
    {
      title: 'Explorar',
      desc: 'Torneos locales',
      icon: <Trophy size={28} strokeWidth={2.5} />,
      color: 'bg-brand text-white',
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
          depth: 150,
          modifier: 2,
          slideShadows: false,
        }}
        pagination={{ 
          el: '.custom-pagination', 
          clickable: true,
          bulletClass: 'swiper-bullet-custom',
          bulletActiveClass: 'swiper-bullet-active-custom'
        }}
        modules={[EffectCoverflow, Pagination]}
        className="w-full h-[220px] flex items-center"
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i} className="!w-[150px] !h-[180px]" onClick={slide.action}>
            {({ isActive }) => (
              <div 
                className={`w-full h-full rounded-[24px] flex flex-col items-center justify-center p-4 text-white shadow-xl transition-all duration-300 border ${isActive ? slide.color + ' border-transparent' : 'bg-white/5 border-white/10 opacity-70 backdrop-blur-md dark:bg-charcoal-light/50'}`}
              >
                <div className="relative mb-3 flex h-[60px] w-[60px] items-center justify-center rounded-full">
                  <div className={`absolute inset-0 rounded-full transition-all duration-500 ${isActive ? 'bg-white/20 shadow-inner' : 'border-2 border-white/20 bg-transparent'}`} />
                  <div className={`relative z-10 ${isActive ? 'text-white' : 'text-white/60'}`}>
                    {slide.icon}
                  </div>
                  {/* Plus badge like in the screenshot */}
                  {isActive && i === 1 && (
                    <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-white text-brand flex items-center justify-center font-bold text-lg shadow-md leading-none pt-0.5">
                      +
                    </div>
                  )}
                </div>
                <h3 className={`text-[15px] font-display font-extrabold text-center leading-tight mb-1 transition-all ${isActive ? 'text-white' : 'text-white/80'}`}>
                  {slide.title}
                </h3>
                <p className={`text-[11.5px] font-medium text-center transition-all ${isActive ? 'text-white/90' : 'text-white/40'}`}>
                  {slide.desc}
                </p>
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="custom-pagination flex justify-center gap-2 mt-4"></div>
      
      <style jsx global>{`
        .swiper-bullet-custom {
          width: 8px;
          height: 8px;
          background: rgba(255, 255, 255, 0.2);
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
