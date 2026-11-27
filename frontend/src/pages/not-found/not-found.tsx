import { useTranslation } from 'react-i18next';
import { PageLayout } from '@/layouts/page';

const NotFoundPage = () => {
  const { t } = useTranslation();
  return <PageLayout title={t('page.labels.not-found')} errors={[{ code: 404 }]} hasRights />;
};

export default NotFoundPage;
