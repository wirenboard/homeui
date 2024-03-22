import React from 'react';
import { Button, WarningBar } from '../common';
import { useTranslation } from 'react-i18next';
import JsonEditor from '../components/json-editor/jsonEditor';
import { observer } from 'mobx-react-lite';
import BootstrapLikeSelect from '../components/select/select';

export const DeviceTab = observer(({ tab }) => {
  let className = 'device-tab';
  if (!tab.isValid) {
    className = className + ' error';
  } else {
    if (tab.isDeprecated) {
      className = className + ' warning';
    }
  }
  return (
    <div className={className}>
      <span>{tab.name}</span>
      {(!tab.isValid || tab.isDeprecated) && (
        <i className="glyphicon glyphicon-exclamation-sign"></i>
      )}
    </div>
  );
});

function findDeviceTypeSelectOption(options, value) {
  let res;
  options.find(option => {
    if (option?.options) {
      res = option.options.find(option => option.value === value);
      if (res) {
        return true;
      }
      return false;
    }
    if (option.value === value) {
      res = option;
      return true;
    }
    return false;
  });
  return res;
}

export const DeviceTabContent = observer(
  ({ tab, index, onDeleteTab, onCopyTab, deviceTypeSelectOptions, onDeviceTypeChange }) => {
    const { t } = useTranslation();
    const selectedDeviceType = findDeviceTypeSelectOption(deviceTypeSelectOptions, tab.deviceType);
    return (
      <div>
        {tab.isDeprecated && (
          <WarningBar>
            <span>{t('device-manager.errors.deprecated')}</span>
          </WarningBar>
        )}
        <BootstrapLikeSelect
          options={deviceTypeSelectOptions}
          selectedOption={selectedDeviceType}
          onChange={option => onDeviceTypeChange(tab, option.value)}
          className={'pull-left device-type-select'}
        />
        <div className="pull-right button-group">
          <Button label={t('device-manager.buttons.delete')} type="danger" onClick={onDeleteTab} />
          <Button label={t('device-manager.buttons.copy')} onClick={onCopyTab} />
        </div>
        <JsonEditor
          schema={tab.schema}
          data={tab.editedData}
          root={'dev' + index}
          onChange={tab.setData}
          className={'device-tab-properties'}
        />
      </div>
    );
  }
);
