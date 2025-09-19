import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import {
  BooleanField,
  StringField,
  PasswordField,
  FormButtonGroup,
  FormFieldGroup
} from '@/components/form';

export const MqttSettings = () => {
  const { t } = useTranslation();
  const [mqttLogin, setMqttLogin] = useState(localStorage['user'] ?? '');
  const [mqttPassword, setMqttPassword] = useState(localStorage['password'] ?? '');
  const [useMqttPassword, setUseMqttPassword] = useState(!!mqttLogin || !!mqttPassword);
  const [addPrefixToTopic, setAddPrefixToTopic] = useState((localStorage['prefix'] ?? 'false') === 'true');
  const [isDirty, setIsDirty] = useState(false);

  const applyHandler = () => {
    if (useMqttPassword) {
      localStorage.setItem('user', mqttLogin);
      localStorage.setItem('password', mqttPassword);
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('password');
    }
    localStorage.setItem('prefix', addPrefixToTopic ? 'true' : 'false');
    window.location.reload();
  };

  const setAddPrefixToTopicHandler = (value: boolean) => {
    setAddPrefixToTopic(value);
    setIsDirty(true);
  };

  const setUseMqttPasswordHandler = (value: boolean) => {
    setUseMqttPassword(value);
    if (!value) {
      setMqttLogin('');
      setMqttPassword('');
    }
    setIsDirty(true);
  };

  const setMqttLoginHandler = (value: string) => {
    setMqttLogin(value);
    setIsDirty(true);
  };

  const setMqttPasswordHandler = (value: string) => {
    setMqttPassword(value);
    setIsDirty(true);
  };

  return (
    <FormFieldGroup heading={t('web-ui-settings.labels.mqtt-settings')}>
      <BooleanField
        title={t('web-ui-settings.labels.use-mqtt-password')}
        value={useMqttPassword}
        onChange={setUseMqttPasswordHandler}
      />
      <StringField
        title={t('web-ui-settings.labels.mqtt-login')}
        value={mqttLogin}
        isDisabled={!useMqttPassword}
        autoComplete="username"
        required={true}
        onChange={setMqttLoginHandler}
      />
      <PasswordField
        title={t('web-ui-settings.labels.mqtt-password')}
        value={mqttPassword}
        isDisabled={!useMqttPassword}
        autoComplete="current-password"
        required={true}
        onChange={setMqttPasswordHandler}
      />
      <BooleanField
        title={t('web-ui-settings.labels.add-prefix-to-topic')}
        value={addPrefixToTopic}
        onChange={setAddPrefixToTopicHandler}
      />
      <FormButtonGroup>
        <Button
          label={t('common.buttons.apply')}
          variant="secondary"
          disabled={!isDirty || ((useMqttPassword || addPrefixToTopic) && (!mqttLogin || !mqttPassword))}
          onClick={applyHandler}
        />
      </FormButtonGroup>
    </FormFieldGroup>
  );
};

export default MqttSettings;
