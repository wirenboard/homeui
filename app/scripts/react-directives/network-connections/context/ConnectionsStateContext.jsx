import React, { createContext, useContext } from 'react';
import { observable } from 'mobx';

const ConnectionsStateContext = createContext();

export const ConnectionsStateContextData = (toggle) => observable({
  // "activated"
  // "activating"
  // "deactivating"
  // "not-connected"
  // "unknown"
  states: {},

  getState(uuid) {
    // FIXME: defaults
    return this.states[uuid] || 'unknown';
  },

  toggleState(uuid) {
    // FIXME
    toggle(uuid);
    this.states[uuid] = 'something';
  },

  setStateFromSubscriber(uuid, nmState) {
    const states = ['activated', 'activating', 'deactivating'];
    this.states[uuid] = states.find((state) => state === nmState) || 'not-connected';
  },
});

export function ConnectionsStateProvider({ data, children }) {
  return (
    <ConnectionsStateContext.Provider value={data}>{children}</ConnectionsStateContext.Provider>
  );
}

export const useConnectionsState = () => useContext(ConnectionsStateContext);
