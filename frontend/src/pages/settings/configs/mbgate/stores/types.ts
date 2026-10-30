export interface Register {
  topic: string;
  address: number;
  enabled: boolean;
  unitId: number;
  byteswap?: boolean;
  format?: 'varchar' | 'signed';
  scale?: number;
  size?: number;
  wordswap?: boolean;
}

export type RegisterType = 'coils' | 'discretes' | 'holdings' | 'inputs';

export type RegisterTypeSelection = RegisterType | 'auto';

export const REGISTER_TYPE_SELECTIONS: RegisterTypeSelection[] = [
  'auto',
  'discretes',
  'coils',
  'inputs',
  'holdings',
];

export interface AllRegisters {
  coils: Register[];
  discretes: Register[];
  holdings: Register[];
  inputs: Register[];
}
