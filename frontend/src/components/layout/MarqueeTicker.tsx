'use client';

export default function MarqueeTicker() {
  const statusText = 'ENS DOMAIN: ACTIVE // AGENT STATUS: ACTIVE // BRIDGE SECURED // LI.FI ROUTE OPTIMIZED // ';

  return (
    <div className="bg-warning-yellow border-b-4 border-black py-2 overflow-hidden whitespace-nowrap shrink-0 relative z-40">
      <div className="inline-block animate-marquee">
        <span className="text-black font-headline text-lg uppercase mx-4">{statusText}</span>
        <span className="text-black font-headline text-lg uppercase mx-4">{statusText}</span>
        <span className="text-black font-headline text-lg uppercase mx-4">{statusText}</span>
        <span className="text-black font-headline text-lg uppercase mx-4">{statusText}</span>
      </div>
    </div>
  );
}
