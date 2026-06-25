export interface BusToggleProps {
  label: string;
  value: boolean;
  onToggle: (_value: boolean) => Promise<void>;
}
