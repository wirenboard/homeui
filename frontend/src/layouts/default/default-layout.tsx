import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { Suspense } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { ConsolePanel } from '@/components/console-panel';
import { Navigation } from '@/components/navigation';
import { consolePanelStore } from '@/stores/console-panel';
import './styles.css';

export const DefaultLayout = observer(() => {
  const [searchParams] = useSearchParams();

  return (
    <div
      className={classNames('defaultLayout', {
        'defaultLayout-consoleRight': consolePanelStore.position === 'right',
      })}
    >
      <div className="defaultLayout-container">
        <Navigation />
        <main
          id="page-wrapper"
          className={classNames('defaultLayout-pageWrapper', {
            'defaultLayout-pageWrapperHmi': searchParams.has('hmi'),
          })}
        >
          <Suspense>
            <Outlet />
          </Suspense>
        </main>
      </div>
      {consolePanelStore.isVisible && <ConsolePanel />}
    </div>
  );
});
