import HardShadowCard from '@/components/ui/HardShadowCard';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export default function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <HardShadowCard className="p-6">
      <h3 className="font-headline text-xl uppercase mb-4 pb-4 border-b-4 border-black">
        {title}
      </h3>
      <div className="space-y-0">{children}</div>
    </HardShadowCard>
  );
}
