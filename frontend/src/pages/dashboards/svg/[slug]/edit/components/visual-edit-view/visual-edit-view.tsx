import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFilePicker } from 'use-file-picker';
import DownloadIcon from '@/assets/icons/download.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { BooleanField, StringField, OptionsField } from '@/components/form';
import { useParseHash } from '@/utils/url';
import { SvgView } from '../svg-view';
import { VisualBindingsEditor } from './components/visual-bindings-editor';
import { type VisualEditViewProps } from './types';
import './styles.css';

export const VisualEditView = observer(({ store, dashboardsStore, devices }: VisualEditViewProps) => {
  const { t } = useTranslation();
  const { id } = useParseHash();

  const [openFileSelector] = useFilePicker({
    accept: '.svg',
    multiple: false,
    onFilesSuccessfulySelected: ({ filesContent }) => {
      store.svgStore.setSvg(filesContent[0].content);
    },
  });

  const dashboardOptions = useMemo(() => {
    return Array.from(dashboardsStore.dashboards.values())
      .filter((dashboard) => dashboard.isSvg && dashboard.id !== id)
      .map((dashboard) => ({
        label: dashboard.name,
        value: dashboard.id,
      }));
  }, [dashboardsStore.dashboards, id]);

  return (
    <div className="visualEditView">
      <div className="visualEditView-content">
        {store.svgStore.hasSvg ? (
          <SvgView
            svg={store.svgStore.svg}
            onSelectElement={(el) => store.bindingsStore.onSelectSvgElement(el)}
          />
        ) : (
          <Button
            label={t('edit-svg-dashboard.buttons.load-svg')}
            onClick={() => openFileSelector()}
          />
        )}
      </div>

      <div className="visualEditView-aside">
        {store.svgStore.hasSvg && (
          <fieldset className="visualEditView-fieldset">
            <legend className="visualEditView-bindingsHeader visualEditView-legend">
              <span className="visualEditView-legendTitle">
                {t('edit-svg-dashboard.labels.bindings-title')}
              </span>
              <Button
                label={t('edit-svg-dashboard.buttons.edit-json')}
                variant="secondary"
                onClick={() => store.bindingsStore.startJsonEditing()}
              />
            </legend>

            <Alert variant="info" size="small">{t('edit-svg-dashboard.labels.select-caption')}</Alert>
            {store.bindingsStore.editable.isSelected && (
              <VisualBindingsEditor
                store={store.bindingsStore.editable}
                devices={devices}
                dashboardsStore={dashboardsStore}
              />
            )}
          </fieldset>
        )}

        <fieldset className="visualEditView-fieldset">
          <legend className="visualEditView-bindingsHeader visualEditView-legend">
            <span className="visualEditView-legendTitle">
              {t('edit-svg-dashboard.labels.common-parameters-title')}
            </span>
            {store.svgStore.hasSvg && (
              <div className="visualEditView-svgButtons">
                <Button
                  label={t('edit-svg-dashboard.buttons.load-svg')}
                  onClick={() => openFileSelector()}
                />
                <Button
                  icon={<DownloadIcon />}
                  variant="secondary"
                  onClick={() => store.svgStore.exportSvg(store.commonParameters['name'])}
                />
              </div>
            )}
          </legend>

          <StringField
            title={t('edit-svg-dashboard.labels.common-parameters-id')}
            value={store.commonParameters['id']}
            required={true}
            autoFocus
            onChange={(val: string) => store.setCommonParam('id', val)}
          />

          <StringField
            title={t('edit-svg-dashboard.labels.common-parameters-name')}
            value={store.commonParameters['name']}
            required={true}
            onChange={(val: string) => store.setCommonParam('name', val)}
          />

          <BooleanField
            title={t('edit-svg-dashboard.labels.common-parameters-fullscreen')}
            value={store.commonParameters['svg_fullwidth']}
            onChange={(val) => store.setCommonParam('svg_fullwidth', val)}
          />

          <Card
            variant="secondary"
            isBodyVisible={store.swipeParameters.enable}
            heading={
              <BooleanField
                title={t('edit-svg-dashboard.labels.swipe-enable')}
                value={store.swipeParameters.enable}
                onChange={(val) => store.setSwipeParameters('enable', val)}
              />
            }
          >
            <div className="visualEditView-swipeWrapper">
              <OptionsField
                title={t('edit-svg-dashboard.labels.left')}
                value={store.swipeParameters.left}
                placeholder={t('edit-svg-dashboard.labels.select-dashboard-placeholder')}
                options={dashboardOptions}
                isClearable
                isSearchable
                onChange={(value: string) => store.setSwipeParameters('left', value)}
              />
              <OptionsField
                title={t('edit-svg-dashboard.labels.right')}
                value={store.swipeParameters.right}
                placeholder={t('edit-svg-dashboard.labels.select-dashboard-placeholder')}
                options={dashboardOptions}
                isClearable
                isSearchable
                onChange={(value: string) => store.setSwipeParameters('right', value)}
              />
            </div>
          </Card>
        </fieldset>
      </div>
    </div>
  );
});
