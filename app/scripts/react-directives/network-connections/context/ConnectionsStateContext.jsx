import React, { createContext, useContext } from 'react';
import { observable } from 'mobx';

const ConnectionsStateContext = createContext();

export const ConnectionsStateContextData = (toggle) => observable({
  states: {},

  getState(uuid) {
    // FIXME: defaults
    return this.states[uuid];
  },

  toggleState(uuid) {
    // FIXME
    toggle(uuid);
    this.states[uuid] = 'something';
  },

  setStateFromSubscriber(uuid, nmState) {
    this.states[uuid] = nmState;
  },
});

export function ConnectionsStateContextProvider(data) {
  return (
    <ConnectionsStateContext.Provider value={data} />
  );
}

export const useConnectionsState = () => useContext(ConnectionsStateContext);
