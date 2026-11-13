import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { DEVICE_TYPES, TYPE_CATEGORIES } from '@/stores/configurator';
import type { TypeTilesProps } from '../types';
import { TYPE_ICONS, typeName } from '../utils';

export const TypeTiles = ({ onPick }: TypeTilesProps) => {
  const { t } = useTranslation();

  return (
    <div className="configurator-tiles">
      {TYPE_CATEGORIES.map((category) => (
        <section key={category}>
          <h3 className="configurator-sectionTitle">{t(`configurator.categories.${category}`)}</h3>
          <div className="configurator-tilesGrid">
            {DEVICE_TYPES.filter((type) => type.category === category).map((type) => {
              const Icon = TYPE_ICONS[type.id];
              return (
                <Button
                  key={type.id}
                  className="configurator-tile"
                  variant="secondary"
                  size="large"
                  icon={<Icon />}
                  label={typeName(type.id)}
                  onClick={() => onPick(type.id)}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
