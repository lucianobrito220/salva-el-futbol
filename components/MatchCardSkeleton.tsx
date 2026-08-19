'use client';

export default function MatchCardSkeleton() {
  return (
    <div className="mb-4 block overflow-hidden rounded-[24px] border border-white/10 shadow-card relative bg-black blur-in">
      {/* Background Gradient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

      <div className="relative z-10 flex h-full flex-col p-4">
        {/* Top Badges */}
        <div className="flex justify-between items-start mb-auto pb-8">
          <div className="flex flex-col gap-2.5">
            <div className="shimmer !bg-white/20 h-6 w-24 rounded-full border border-white/10" />
          </div>

          <div className="flex flex-col items-end gap-2.5">
            <div className="shimmer !bg-white/20 h-6 w-28 rounded-full border border-white/10" />
          </div>
        </div>

        {/* Bottom Content - Glassmorphism Card */}
        <div className="mt-4 rounded-2xl bg-white/8 backdrop-blur-2xl border border-white/10 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          {/* Upper row: Time & Location | Price */}
          <div className="flex items-end justify-between mb-3 border-b border-white/10 pb-3">
            <div>
              <div className="flex items-baseline gap-2 mb-1.5">
                <div className="shimmer !bg-white/30 h-8 w-20 rounded-lg" />
                <div className="shimmer !bg-white/20 h-4 w-14 rounded-md" />
              </div>
              <div className="shimmer !bg-white/20 h-4 w-36 rounded-md" />
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="shimmer !bg-white/30 h-7 w-16 rounded-lg" />
              <div className="shimmer !bg-white/15 h-3 w-14 rounded-md" />
            </div>
          </div>

          {/* Lower row: Court Name & Level/Format | Action button */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="shimmer !bg-white/25 h-4 w-32 rounded-md" />
              <div className="shimmer !bg-white/20 h-3 w-20 rounded-md" />
            </div>
            <div className="shimmer !bg-white/30 h-9 w-24 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
