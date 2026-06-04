import { useTranslation } from 'react-i18next';
import InfoIcon from '@/assets/icons/info.svg';
import { Tooltip } from '@/components/tooltip';
import './styles.css';

export const Info = ({ link }: { link?: string }) => {
  const { t, i18n } = useTranslation();

  return (
    <Tooltip
      trigger="click"
      autoClose={false}
      text={
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
    >
      <InfoIcon className="info-icon" />
    </Tooltip>
  );
};
