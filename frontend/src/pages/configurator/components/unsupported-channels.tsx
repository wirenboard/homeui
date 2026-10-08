import { useTranslation } from 'react-i18next';
import { CollapsiblePanel } from '@/components/collapsible-panel';
import type { UnsupportedChannelsProps } from '../types';

export const UnsupportedChannels = ({ items }: UnsupportedChannelsProps) => {
  const { t } = useTranslation();

  if (!items.length) {
    return null;
  }

  return (
    <div className="configurator-unsupported">
      <CollapsiblePanel title={t('configurator.labels.unsupported', { count: items.length })} isCollapsed>
        <ul className="configurator-channels">
          {items.map((item) => (
            <li key={item.id} className="configurator-channel configurator-channelHead">
              <span>{item.name}</span>
              <span className="configurator-channelValue">{item.reason}</span>
            </li>
          ))}
        </ul>
      </CollapsiblePanel>
    </div>
  );
};
