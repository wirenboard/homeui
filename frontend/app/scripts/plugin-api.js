// Plugin API - exposes shared dependencies for plugins
// Plugins use window.__HOMEUI__ instead of bundling their own React/MobX

import React from 'react';
import ReactDOM from 'react-dom/client';

// UI Components
import { Button } from '@/components/button/button';
import { Card } from '@/components/card/card';
import { Table, TableRow, TableCell } from '@/components/table/table';
import { Input } from '@/components/input/input';
import { Range } from '@/components/range/range';
import { Dialog } from '@/components/dialog/dialog';
import { Confirm } from '@/components/confirm/confirm';
import { Alert } from '@/components/alert/alert';
import { Tabs, TabContent } from '@/components/tabs/tabs';
import { Tag } from '@/components/tag/tag';
import { Checkbox } from '@/components/checkbox/checkbox';
import { Switch } from '@/components/switch/switch';
import { Dropdown } from '@/components/dropdown/dropdown';
import { Loader } from '@/components/loader/loader';
import { PageLayout } from '@/layouts/page/page';

const pluginRegistry = {
  _plugins: {},
  register(pluginDef) {
    this._plugins[pluginDef.id] = pluginDef;
    window.dispatchEvent(new CustomEvent('homeui-plugin-registered', { detail: pluginDef }));
  },
  get(id) {
    return this._plugins[id] || null;
  },
  getAll() {
    return Object.values(this._plugins);
  },
};

window.__HOMEUI__ = {
  version: 1,
  pluginRegistry,
  React,
  ReactDOM,
  // services (mqttClient, ConfigEditorProxy, EditorProxy) are injected at runtime by app.js
  services: null,
  components: {
    Button,
    Card,
    Table, TableRow, TableCell,
    Input,
    Range,
    Dialog,
    Confirm,
    Alert,
    Tabs, TabContent,
    Tag,
    Checkbox,
    Switch,
    Dropdown,
    Loader,
    PageLayout,
  },
};
