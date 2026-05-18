import { lazy } from 'react';
import SettingsIcon from '@/assets/icons/settings.svg';
import { JsonSchemaEditor } from '@/components/json-schema-editor';
import type { SettingsTabContentProps, SettingsTabProps } from './types';
import './styles.css';

const WarnIcon = lazy(() => import('@/assets/icons/warn.svg'));

export const SettingsTab = ({ tab }: SettingsTabProps) => (
  <div className="settingsTab">
    <SettingsIcon className="settingsTab-icon" />
    <span className="settingsTab-name">{tab.name}</span>
    {tab.hasInvalidConfig && <WarnIcon className="settingsTab-icon" />}
  </div>
);

export const SettingsTabContent = ({ tab }: SettingsTabContentProps) => (
  <JsonSchemaEditor store={tab.schemaStore} translator={tab.schemaTranslator}/>
);
