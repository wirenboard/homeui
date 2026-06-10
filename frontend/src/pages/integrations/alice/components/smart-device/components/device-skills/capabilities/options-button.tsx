import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MoreIcon from '@/assets/icons/more.svg';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Popup } from '@/components/popup';
import {
  Capability,
  countModifiedCapability,
  getCapabilityDefaults,
  type SmartDeviceCapability,
} from '@/stores/alice';
import { type CapabilitySubProps } from '../types';

const updateCapability = (
  capabilities: SmartDeviceCapability[],
  index: number,
  patch: Partial<SmartDeviceCapability>,
): SmartDeviceCapability[] =>
  capabilities.map((item, i) => (i === index ? { ...item, ...patch } : item));

export const CapabilityOptionsButton = ({
  capability, index, capabilities, onCapabilityChange,
}: CapabilitySubProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const defaults = getCapabilityDefaults(capability.type);
  const retrievable = capability.retrievable ?? defaults.retrievable;
  const reportable = capability.reportable ?? defaults.reportable;
  const split = capability.parameters?.split ?? defaults.parameters.split ?? false;

  const modifiedCount = countModifiedCapability(capability);
  const itemClass = (modified: boolean) =>
    `aliceDeviceSkills-optionsItem${modified ? ' is-modified' : ''}`;
  const isRetrievableModified = capability.retrievable !== undefined && retrievable !== defaults.retrievable;
  const isReportableModified = capability.reportable !== undefined && reportable !== defaults.reportable;
  const isSplitModified = capability.parameters?.split !== undefined && split !== defaults.parameters.split;

  const handleRetrievableChange = (checked: boolean) => {
    onCapabilityChange(updateCapability(capabilities, index, { retrievable: checked }));
  };

  const handleReportableChange = (checked: boolean) => {
    onCapabilityChange(updateCapability(capabilities, index, { reportable: checked }));
  };

  const handleSplitChange = (checked: boolean) => {
    onCapabilityChange(updateCapability(capabilities, index, {
      parameters: { ...capability.parameters, split: checked },
    }));
  };

  const showSplit = capability.type === Capability['On/Off'];

  const content = (
    <div className="aliceDeviceSkills-optionsContent">
      <div className={itemClass(isRetrievableModified)}>
        <Checkbox
          checked={retrievable}
          title={t('alice.labels.retrievable')}
          ariaLabel={t('alice.labels.retrievable')}
          onChange={handleRetrievableChange}
        />
        <div className="aliceDeviceSkills-optionsHint">
          {t('alice.labels.retrievable-hint')}
        </div>
      </div>

      <div className="aliceDeviceSkills-optionsDivider" />
      <div className={itemClass(isReportableModified)}>
        <Checkbox
          checked={reportable}
          title={t('alice.labels.reportable')}
          ariaLabel={t('alice.labels.reportable')}
          onChange={handleReportableChange}
        />
        <div className="aliceDeviceSkills-optionsHint">
          {t('alice.labels.reportable-hint')}
        </div>
      </div>

      {showSplit && (
        <>
          <div className="aliceDeviceSkills-optionsDivider" />
          <div className={itemClass(isSplitModified)}>
            <Checkbox
              checked={split}
              title={t('alice.labels.split')}
              ariaLabel={t('alice.labels.split')}
              onChange={handleSplitChange}
            />
            <div className="aliceDeviceSkills-optionsHint">
              {t('alice.labels.split-hint')}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Popup
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      placement="bottom-end"
      content={content}
    >
      <Button
        size="small"
        type="button"
        icon={(
          <span className="aliceDeviceSkills-optionsIcon">
            <MoreIcon />
            {modifiedCount > 0 && (
              <span className="aliceDeviceSkills-optionsBadge">{modifiedCount}</span>
            )}
          </span>
        )}
        variant="secondary"
        isOutlined
        title={t('alice.labels.capability-options')}
        aria-label={t('alice.labels.capability-options')}
      />
    </Popup>
  );
};
