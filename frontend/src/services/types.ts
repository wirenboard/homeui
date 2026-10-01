import type { JsonReviver } from '@/utils/types';

export interface RpcMethodDescription {
  name: string;
  // Parses the reply, for example to keep integers a number can't hold exactly
  reviver?: JsonReviver;
}
