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

export interface AllRegisters {
  coils: Register[];
  discretes: Register[];
  holdings: Register[];
  inputs: Register[];
}
