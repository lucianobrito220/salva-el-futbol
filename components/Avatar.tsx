'use client';

import { useState } from 'react';
import ImageLightbox from '@/components/ImageLightbox';
import Image from 'next/image';

export default function Avatar({
  name,
  url,
  size = 36,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          if (url) {
            e.stopPropagation();
            setOpen(true);
          }
        }}
        className="press-fx relative flex-shrink-0 overflow-hidden rounded-full"
        style={{ width: size, height: size }}
      >
        {url ? (
          <Image src={url} alt={name} fill className="object-cover" sizes={`${size}px`} />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center rounded-full bg-brand-pale font-display font-bold text-brand-dark"
            style={{ fontSize: size * 0.4 }}
          >
            {name.charAt(0)}
          </div>
        )}
      </button>
      {open && url && <ImageLightbox src={url} alt={name} onClose={() => setOpen(false)} />}
    </>
  );
}
