'use client';

import { HTMLAttributes, forwardRef } from 'react';

export interface TornPaperCardProps extends HTMLAttributes<HTMLDivElement> {
  // Additional props can be added here
}

const TornPaperCard = forwardRef<HTMLDivElement, TornPaperCardProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`torn-paper ${className}`} {...props}>
        <div className="torn-paper-inner p-8 pb-12">
          {children}
        </div>
      </div>
    );
  }
);

TornPaperCard.displayName = 'TornPaperCard';

export default TornPaperCard;
