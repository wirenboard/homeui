import React, { createContext, useContext } from 'react';
import { observable } from 'mobx';

const ConfigContext = createContext();

export const ConfigContextData = (onSave) => observable({
  isLoading: true,
  isDirty: false,
  connections: [],
  con_switcher: {},
  error: '',
  fullSchema: {},

  setConfigData(config, schema) {
    this.connections = config.ui.connections;
    this.con_switcher = config.ui.con_switcher;
    this.fullSchema = schema;

    this.isLoading = false;
  },

  saveConnections(connections) {
    onSave({ ui: { connections, con_switcher: this.con_switcher } });
    this.isDirty = false;
  },
});

export function ConfigProvider({ data, children }) {
  return (
    <ConfigContext.Provider value={data}>{children}</ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
