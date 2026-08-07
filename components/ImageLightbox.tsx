'use client';

import { X } from 'lucide-react';

export default function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="press-fx absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
      >
        <X size={20} />
      </button>
      <img
        src={src}
        alt={alt}
        className="pop-in max-h-[80vh] max-w-full rounded-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
