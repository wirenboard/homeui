import { type createHashRouter } from 'react-router-dom';

export interface AppProps {
  router: ReturnType<typeof createHashRouter>;
}
