import { observer } from 'mobx-react-lite';
import { Alert } from '@/components/alert';
import { notificationsStore } from '@/stores/notifications';
import './styles.css';

export const Notifications = observer(() => {
  const { notifications } = notificationsStore;

  return (
    <div className="notifications">
      {notifications.map((notification, i) => (
        <div key={i}>
          <Alert variant={notification.variant} withIcon={false}>{notification.text}</Alert>
        </div>
      ))}
    </div>
  );
});
