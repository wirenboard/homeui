import React, { createContext, useContext } from 'react';
import { observable } from 'mobx';

const ConfigContext = createContext();

export const ConfigContextData = (onSave) => observable({
  isLoading: true,
  isDirty: false,
  connections: [],
  con_switcher: {},
  additionalData: {},
  error: '',
  fullSchema: {},

  setConfigData(config, schema) {
    this.connections = config.ui.connections;
    this.conSwitcher = config.ui.con_switcher;
    this.additionalData = config.data;
    this.fullSchema = schema;

    this.isLoading = false;
  },

  async saveConnections(connections) {
    try {
      this.isLoading = true;
      await onSave({ ui: { connections, con_switcher: this.conSwitcher } });
      this.isDirty = false;
      this.isLoading = false;
    } catch (err) {
      this.error = err;
      this.isLoading = false;
      throw err;
    }
  },
});

export function ConfigProvider({ data, children }) {
  return (
    <ConfigContext.Provider value={data}>{children}</ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
