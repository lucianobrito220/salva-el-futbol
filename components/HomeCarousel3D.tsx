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
      icon: <Search size={36} strokeWidth={2} />,
      color: 'bg-[#6d5dfc]',
      action: () => router.push('/buscar')
    },
    {
      title: 'Armar partido',
      desc: 'Armá y compartí',
      icon: <Megaphone size={36} strokeWidth={2} />,
      color: 'bg-[#6d5dfc]', // Match the user's image purple
      action: () => router.push('/publicar')
    },
    {
      title: 'Buscar rival',
      desc: 'Para tu equipo',
      icon: <Users size={36} strokeWidth={2} />,
      color: 'bg-[#6d5dfc]',
      action: () => router.push('/publicar?tipo=equipo_rival')
    },
    {
      title: 'Explorar torneos',
      desc: 'Anotá a tu equipo',
      icon: <Trophy size={36} strokeWidth={2} />,
      color: 'bg-[#6d5dfc]',
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
        className="w-full h-[320px] flex items-center"
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i} className="!w-[230px] !h-[280px]" onClick={slide.action}>
            {({ isActive }) => (
              <div 
                className={`w-full h-full rounded-[28px] flex flex-col items-center justify-center p-6 text-white shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-300 ${isActive ? slide.color : 'bg-[#1a1a2e] border border-white/5 opacity-80'}`}
              >
                <div className="relative mb-5 flex h-[86px] w-[86px] items-center justify-center rounded-full">
                  <div className={`absolute inset-0 rounded-full transition-all duration-500 ${isActive ? 'bg-white/20 shadow-inner' : 'border-2 border-white/10 bg-transparent'}`} />
                  <div className={`relative z-10 ${isActive ? 'text-white' : 'text-white/50'}`}>
                    {slide.icon}
                  </div>
                  {/* Plus badge like in the screenshot */}
                  {isActive && i === 1 && (
                    <div className="absolute top-0 right-0 h-7 w-7 rounded-full bg-white text-[#6d5dfc] flex items-center justify-center font-bold text-xl shadow-lg leading-none pt-0.5">
                      +
                    </div>
                  )}
                </div>
                <h3 className={`text-[20px] font-display font-extrabold text-center leading-tight mb-1.5 transition-all ${isActive ? 'text-white' : 'text-white/60'}`}>
                  {slide.title}
                </h3>
                <p className={`text-[14px] font-medium text-center transition-all ${isActive ? 'text-white/80' : 'text-white/30'}`}>
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
          background: #6d5dfc;
          width: 24px;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
