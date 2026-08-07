export default function PlayerSilhouette({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 220" className={className} xmlns="http://www.w3.org/2000/svg">
      <g fill="#ffffff" opacity="0.14">
        {/* torso + cabeza */}
        <circle cx="92" cy="46" r="16" />
        <path d="M92 62c-14 0-24 10-27 24l-8 34 14 4 8-30c1-4 4-7 8-8l3 46-6 60h16l8-56 10 56h16l-4-62 6-46c3 1 6 4 7 8l9 30 14-4-9-35c-4-14-14-23-27-23-6 0-13 1-19 2-6-1-13-2-19-2z" />
        {/* pierna pateando */}
        <path d="M120 118c10 6 22 8 34 5l18-6 5 15-19 7c-16 5-33 3-47-5z" />
      </g>
      {/* pelota */}
      <circle cx="182" cy="150" r="13" fill="#ffffff" opacity="0.22" />
      <path
        d="M182 140l6 6-2 8-8 2-6-6 2-8z"
        fill="#ffffff"
        opacity="0.35"
      />
    </svg>
  );
}
