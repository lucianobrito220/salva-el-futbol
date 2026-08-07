'use client';

import { useState } from 'react';
import ImageLightbox from '@/components/ImageLightbox';

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
        className="press-fx flex-shrink-0 overflow-hidden rounded-full"
        style={{ width: size, height: size }}
      >
        {url ? (
          <img src={url} alt={name} className="h-full w-full object-cover" />
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
