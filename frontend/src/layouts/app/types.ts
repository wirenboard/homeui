import { type createHashRouter } from 'react-router-dom';

export interface AppProps {
  // Absent until the HTTPS check is done — the router is created only when we stay on this origin
  router?: ReturnType<typeof createHashRouter>;
}
