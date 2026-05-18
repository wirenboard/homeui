export enum ConnectionState {
  activated = 'activated',
  activating = 'activating',
  deactivating = 'deactivating',
  deprecated = 'deprecated',
  unknown = 'unknown',
  new = 'new',
  'not-connected' = 'not-connected',
  'deactivating by wb-connection-manager' = 'deactivating-by-cm',
  'deactivated by wb-connection-manager' = 'deactivated-by-cm',
}

export enum NetworkType {
  Ethernet = '01_nm_ethernet',
  Modem = '02_nm_modem',
  Wifi = '03_nm_wifi',
  WifiAp = '04_nm_wifi_ap',
  Can = 'can',
  Loopback = 'loopback',
  Static = 'static',
  Dhcp = 'dhcp',
  Ppp = 'ppp',
  Manual = 'manual',
}

export type ConfirmationData = 'save' | 'dont-save' | 'cancel';
export type Confirmation = () => Promise<ConfirmationData>;
