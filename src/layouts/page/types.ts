import { ReactElement } from 'react';

export interface PageProps {
  title: string;
  isHaveRights: boolean;
  isLoading?: boolean;
  actions?: ReactElement<any, any>;
}
