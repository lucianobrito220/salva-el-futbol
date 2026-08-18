'use client';

function BallIllustration() {
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
      <circle cx="44" cy="66" r="14" fill="#E7E9EC" />
      <circle cx="44" cy="34" r="30" fill="#F4F5F7" stroke="#E7E9EC" strokeWidth="2" />
      <path
        d="M44 18l9 6-3 11H38l-3-11z"
        fill="none"
        stroke="#C9CDD3"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M44 18v-6M53 24l7-3M35 24l-7-3M41 35l-8 8M47 35l8 8M38 46h12"
        stroke="#C9CDD3" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WhistleIllustration() {
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
      <circle cx="44" cy="44" r="40" fill="#F4F5F7" />
      <path
        d="M28 40c0-7 6-13 13-13h12c8 0 14 6 14 13s-6 13-14 13c-2 6-8 10-15 10-9 0-16-7-16-16 0-2 .3-4.5 1-6z"
        fill="none"
        stroke="#C9CDD3"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="38" cy="47" r="5" fill="none" stroke="#C9CDD3" strokeWidth="2.5" />
      <path d="M53 34l6-6M59 28h6M59 28v6" stroke="#C9CDD3" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function BellIllustration() {
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
      <circle cx="44" cy="44" r="40" fill="#F4F5F7" />
      <path
        d="M44 22c-8 0-13 6-13 14v8l-5 8h36l-5-8v-8c0-8-5-14-13-14z"
        fill="none"
        stroke="#C9CDD3"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M39 58a5 5 0 0010 0" stroke="#C9CDD3" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const illustrations = {
  ball: BallIllustration,
  whistle: WhistleIllustration,
  bell: BellIllustration,
};

export default function EmptyState({
  icon = 'ball',
  title,
  subtitle,
}: {
  icon?: keyof typeof illustrations;
  title: string;
  subtitle?: string;
}) {
  const Illustration = illustrations[icon];
  return (
    <div className="fade-slide-up flex flex-col items-center gap-3 rounded-3xl bg-gradient-to-b from-neutral-50 to-white px-8 py-12 text-center">
      <div className="flex flex-col items-center gap-1.5">
        <Illustration />
        <span className="text-sm select-none" aria-hidden="true">✨</span>
      </div>
      <div>
        <p className="text-[15px] font-bold text-ink">{title}</p>
        {subtitle && <p className="mt-1 text-[13px] text-inksoft/80">{subtitle}</p>}
      </div>
    </div>
  );
}
