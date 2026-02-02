interface SettingRowProps {
  label: string;
  description?: string;
  control: React.ReactNode;
}

export default function SettingRow({ label, description, control }: SettingRowProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-4 border-b-2 border-dashed border-black last:border-b-0">
      <div className="flex-1">
        <label className="font-display font-bold text-sm uppercase block mb-1">
          {label}
        </label>
        {description && (
          <p className="font-display text-xs text-gray-600">{description}</p>
        )}
      </div>
      <div className="md:w-1/2">{control}</div>
    </div>
  );
}
