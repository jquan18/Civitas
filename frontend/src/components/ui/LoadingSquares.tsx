'use client';

interface LoadingSquaresProps {
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSquares({ size = 'md' }: LoadingSquaresProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const squareClass = sizeClasses[size];

  return (
    <div className="flex items-center justify-center gap-2">
      <div className={`${squareClass} bg-black border-[2px] border-black animate-pulse-scale`} />
      <div className={`${squareClass} bg-black border-[2px] border-black animate-pulse-scale-delay-1`} />
      <div className={`${squareClass} bg-black border-[2px] border-black animate-pulse-scale-delay-2`} />
    </div>
  );
}
