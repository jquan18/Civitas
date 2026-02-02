'use client';

import { HTMLAttributes, forwardRef } from 'react';

export interface HardShadowCardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

const HardShadowCard = forwardRef<HTMLDivElement, HardShadowCardProps>(
  ({ className = '', hoverable = false, children, onClick, ...props }, ref) => {
    const baseStyles = 'bg-stark-white border-[3px] border-black shadow-[4px_4px_0px_#000] transition-all duration-200';
    const hoverStyles = hoverable
      ? 'hover:shadow-[6px_6px_0px_#000] hover:-translate-y-[2px] cursor-pointer'
      : '';
    const activeStyles = onClick
      ? 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000]'
      : '';

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${hoverStyles} ${activeStyles} ${className}`}
        onClick={onClick}
        {...props}
      >
        {children}
      </div>
    );
  }
);

HardShadowCard.displayName = 'HardShadowCard';

export default HardShadowCard;
