export interface BusToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onToggle: (_value: boolean) => Promise<void>;
}
