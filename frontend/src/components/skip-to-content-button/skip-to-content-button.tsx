import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { focusToMainContent } from '@/utils/focus-content';
import './styles.css';

export const SkipToContentButton = () => {
  const { t } = useTranslation();

  return (
    <div className="skipToContentButton-container">
      <Button
        className="skipToContentButton"
        size="large"
        label={t('app.buttons.skip-to-main-content')}
        onClick={() => focusToMainContent()}
      />
    </div>
  );
};
