'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-full h-full flex-1 flex flex-col">{children}</div>;
  }

  return (
    <div key={pathname} className="page-transition w-full flex-1 flex flex-col">
      {children}
    </div>
  );
}
