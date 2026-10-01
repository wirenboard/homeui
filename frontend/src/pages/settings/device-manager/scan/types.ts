import type { NewDevicesScanPageStore, SearchDisconnectedScanPageStore } from '@/pages/settings/device-manager/scan/';

export interface ScanPageProps {
  pageStore: NewDevicesScanPageStore | SearchDisconnectedScanPageStore;
  scanType: 'new' | 'disconnected';
}
