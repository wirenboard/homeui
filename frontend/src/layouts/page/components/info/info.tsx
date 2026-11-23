import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InfoIconButton } from '@/components/info-icon-button';
import { Popup } from '@/components/popup';
import './styles.css';

export const Info = ({ link }: { link?: string }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popup
      isOpen={isOpen}
      content={
        <div className="info-container">
          {link && (
            <a href={link} className="info-link" target="_blank">
              {t('page.labels.documentation-current')}
            </a>
          )}

          <a href={`https://wirenboard.com/wiki/Documentation/${i18n.language}`} className="info-link" target="_blank">
            {t('page.labels.documentation')}
          </a>

          <a href="https://support.wirenboard.com" className="info-link" target="_blank">
            {t('page.labels.support')}
          </a>
        </div>
      }
      onOpenChange={setIsOpen}
    >
      <InfoIconButton aria-label={t('page.labels.info')} />
    </Popup>
  );
};
