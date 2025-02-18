import { ReactElement } from 'react';

export interface PageProps {
  title: string;
  hasRights: boolean;
  isLoading?: boolean;
  actions?: ReactElement;
}
