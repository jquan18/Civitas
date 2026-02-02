interface EventTypeBadgeProps {
  eventType: 'created' | 'activated' | 'rent_released' | 'termination_initiated' | 'terminated' | 'completed';
}

const EVENT_COLORS = {
  created: 'bg-acid-lime text-black',
  activated: 'bg-hot-pink text-white',
  rent_released: 'bg-warning-yellow text-black',
  termination_initiated: 'bg-void-black text-white',
  terminated: 'bg-gray-400 text-black',
  completed: 'bg-green-500 text-white',
} as const;

const EVENT_LABELS = {
  created: 'DEPLOYED',
  activated: 'ACTIVATED',
  rent_released: 'RENT PAID',
  termination_initiated: 'TERMINATING',
  terminated: 'TERMINATED',
  completed: 'COMPLETED',
} as const;

export default function EventTypeBadge({ eventType }: EventTypeBadgeProps) {
  const colorClass = EVENT_COLORS[eventType];
  const label = EVENT_LABELS[eventType];

  return (
    <span
      className={`${colorClass} px-3 py-1 text-xs font-headline uppercase border-2 border-black inline-block`}
    >
      {label}
    </span>
  );
}
