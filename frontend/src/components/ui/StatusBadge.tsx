'use client';

type StatusType = 'pending' | 'active' | 'success' | 'error' | 'warning' | 'incomplete' | 'ready';
type BadgeSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  status: StatusType;
  size?: BadgeSize;
  label?: string;
}

export function StatusBadge({ status, size = 'md', label }: StatusBadgeProps) {
  const statusConfig = {
    pending: { bg: 'bg-gray-300', text: 'PENDING' },
    active: { bg: 'bg-acid-lime', text: 'ACTIVE' },
    success: { bg: 'bg-green-400', text: 'SUCCESS' },
    error: { bg: 'bg-red-400', text: 'ERROR' },
    warning: { bg: 'bg-warning-yellow', text: 'WARNING' },
    incomplete: { bg: 'bg-gray-200', text: 'INCOMPLETE' },
    ready: { bg: 'bg-acid-lime', text: 'READY' },
  };

  const sizeConfig = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const config = statusConfig[status];
  const displayText = label || config.text;

  return (
    <span
      className={`inline-block ${config.bg} border-[2px] border-black font-black text-black uppercase tracking-wide ${sizeConfig[size]}`}
    >
      {displayText}
    </span>
  );
}
