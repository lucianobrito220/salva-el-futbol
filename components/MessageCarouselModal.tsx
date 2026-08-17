'use client';

import { useRef, useState, useEffect } from 'react';
import { X, Coffee } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CarouselMessage {
  Icon: LucideIcon;
  text: string;
  href?: string;
}

export default function MessageCarouselModal({
  messages,
  startIndex,
  onClose,
}: {
  messages: CarouselMessage[];
  startIndex: number;
  onClose: () => void;
}) {
  const [active, setActive] = useState(startIndex);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTo({ left: startIndex * scrollerRef.current.clientWidth });
    }
  }, [startIndex]);

  function goTo(i: number) {
    setActive(i);
    const el = scrollerRef.current;
    if (el) {
      el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
    }
  }

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 backdrop-blur-md" onClick={onClose}>
      <div className="mx-4 w-full max-w-[400px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex justify-end">
          <button onClick={onClose} className="press-fx flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink">
            <X size={18} />
          </button>
        </div>

        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className="flex w-full flex-shrink-0 snap-center flex-col items-center gap-4 rounded-3xl bg-white px-7 py-9 text-center shadow-2xl"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-pale text-brand-dark">
                <m.Icon size={26} strokeWidth={2.2} />
              </span>
              <p className="font-display text-base font-bold text-ink">{m.text}</p>
              {m.href && (
                <a
                  href={m.href}
                  target="_blank"
                  rel="noreferrer"
                  className="press-fx flex items-center gap-2 rounded-full bg-[#00B1EA] px-5 py-2.5 text-xs font-bold text-white"
                >
                  <Coffee size={14} /> Tirar un centro
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-center gap-1.5">
          {messages.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
