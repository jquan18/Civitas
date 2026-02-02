'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface VideoSplashScreenProps {
  children: React.ReactNode;
}

export function VideoSplashScreen({ children }: VideoSplashScreenProps) {
  const [hasSeenSplash, setHasSeenSplash] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    // Check if user has seen splash
    const seen = localStorage.getItem('civitas_splash_seen');
    if (seen === 'true') {
      setHasSeenSplash(true);
      return;
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      handleSkip();
      return;
    }

    // Auto-advance after animation duration (3 seconds)
    const timer = setTimeout(() => {
      handleAnimationEnd();
    }, 3000);

    // Keyboard support
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnimationEnd = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      localStorage.setItem('civitas_splash_seen', 'true');
      setHasSeenSplash(true);
    }, 500); // Match fade duration
  };

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      localStorage.setItem('civitas_splash_seen', 'true');
      setHasSeenSplash(true);
    }, 500);
  };

  // Don't render splash if already seen
  if (hasSeenSplash) {
    return <>{children}</>;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-paper-cream flex items-center justify-center transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animation Container - Fullscreen with proper aspect ratio */}
      <div className="relative w-full h-full flex items-center justify-center">
        <Image
          src="/videos/civitas-word-animation.webp"
          alt="Civitas brand animation"
          fill
          priority
          className={`object-contain transition-opacity duration-300 ${
            isImageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsImageLoaded(true)}
          unoptimized // Don't optimize WebP animations
        />
      </div>

      {/* Skip Button - Desktop */}
      <button
        onClick={handleSkip}
        className="hidden md:block fixed bottom-8 right-8 bg-acid-lime border-[3px] border-black shadow-[4px_4px_0px_#000] px-8 py-4 font-headline uppercase text-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-200"
        aria-label="Skip intro animation"
      >
        SKIP INTRO
      </button>

      {/* Skip Button - Mobile */}
      <button
        onClick={handleSkip}
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-acid-lime border-[3px] border-black shadow-[2px_2px_0px_#000] px-6 py-3 font-headline uppercase text-base hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-200"
        aria-label="Skip intro animation"
      >
        SKIP →
      </button>
    </div>
  );
}
