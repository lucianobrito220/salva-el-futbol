'use client';
import { useState, useRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export default function PullToRefresh({ children, onRefresh }: { children: ReactNode, onRefresh: () => Promise<void> }) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const maxPull = 140;
  
  const pullDistance = Math.max(0, currentY - startY);
  const height = Math.min(pullDistance * 0.4, maxPull); // add friction
  const isReady = height >= 60;

  function handleTouchStart(e: React.TouchEvent) {
    if (window.scrollY <= 10) {
      setStartY(e.touches[0].clientY);
      setCurrentY(e.touches[0].clientY);
    } else {
      setStartY(0);
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startY === 0) return;
    
    // Only track if pulling down
    if (e.touches[0].clientY > startY) {
      setCurrentY(e.touches[0].clientY);
      // Cancel native scroll if we are actively pulling down
      if (document.body.style.overscrollBehaviorY !== 'none') {
        document.body.style.overscrollBehaviorY = 'none';
      }
    }
  }

  async function handleTouchEnd() {
    document.body.style.overscrollBehaviorY = '';
    
    if (startY === 0) return;
    
    if (isReady && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    
    setStartY(0);
    setCurrentY(0);
  }

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-screen"
    >
      <div 
        className={`fixed top-20 left-0 right-0 flex items-center justify-center overflow-hidden z-50 pointer-events-none ${startY > 0 ? '' : 'transition-all duration-300 ease-out'}`}
        style={{ 
          opacity: refreshing || height > 20 ? 1 : 0,
          transform: `translateY(${refreshing ? 10 : (startY > 0 ? height - 50 : -50)}px)`
        }}
      >
        <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-brand shadow-[0_8px_24px_rgba(30,158,74,0.4)] text-white ${refreshing ? 'animate-spin' : ''}`}
             style={{ transform: refreshing ? 'none' : `rotate(${Math.min(height * 4, 360)}deg)` }}>
          <Loader2 size={22} className="text-white" />
        </div>
      </div>
      
      <div 
        className={`${startY > 0 ? '' : 'transition-transform duration-300 ease-out'}`}
        style={{ transform: `translateY(${refreshing ? 40 : (startY > 0 ? height : 0)}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
