'use client';

import { useState } from 'react';

const DONATE_URL = 'https://link.mercadopago.com.ar/salvaelfutbol';

const DONATE_PHRASES = [
  '¿Nos tirás un centro? ⚽',
  'Invitanos una coca 🥤',
  '¿Nos regalás un cafecito? ☕',
  'Ayudanos con un centro 😉',
];

export default function SuccessCheck({ message, donate = false }: { message: string; donate?: boolean }) {
  const [phrase] = useState(() => DONATE_PHRASES[Math.floor(Math.random() * DONATE_PHRASES.length)]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/30 modal-backdrop-in">
      <div className="modal-enter flex flex-col items-center gap-4 rounded-3xl bg-white dark:bg-[#25282F] px-8 py-8 shadow-card">
        <div className="pop-in flex h-16 w-16 items-center justify-center rounded-full bg-brand">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              className="draw-check"
              d="M5 13l4 4L19 7"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-center font-display text-lg font-semibold text-ink dark:text-white">{message}</p>
        {donate && (
          <a
            href={DONATE_URL}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="press-fx mt-1 rounded-full bg-[#00B1EA] px-6 py-2.5 text-sm font-bold text-white shadow-card-hover"
          >
            {phrase}
          </a>
        )}
      </div>
    </div>
  );
}
