# Plugin System

homeui supports runtime plugins that add new pages to the web interface without rebuilding the main application.

## How it works

1. Backend endpoint `GET /api/plugins` scans `/usr/share/wb-mqtt-homeui/plugins/*/manifest.json`
2. Frontend reads manifests and registers menu items in the navigation panel
3. When user navigates to a plugin page, `PluginHost` component dynamically loads the plugin script
4. Plugin script accesses shared React and UI components via `window.__HOMEUI__`
5. Plugin registers itself and its components through `window.__HOMEUI__.pluginRegistry`

## Plugin structure

```
/usr/share/wb-mqtt-homeui/plugins/<plugin-id>/
  manifest.json
  index.js
```

## manifest.json

```jsonc
{
  "id": "my-plugin",
  "version": "1.0.0",
  "title": { "ru": "My Plugin", "en": "My Plugin" },
  // Cache-busting: increment ?v=N on each deploy
  "entrypoint": "index.js?v=1",
  "menu": {
    // Parent section: "settings", "rules", "devices", etc.
    "parentId": "settings",
    "item": {
      "id": "my-plugin",
      // Format: plugins/<plugin-id>/<ComponentName>
      "url": "plugins/my-plugin/MyPage",
      "title": { "ru": "My Plugin", "en": "My Plugin" }
    }
  }
}
```

## Plugin entry point

Plugins are IIFE scripts that use `window.__HOMEUI__` instead of bundling their own React.

```js
(function () {
  'use strict';

  var HOMEUI = window.__HOMEUI__;
  if (!HOMEUI || !HOMEUI.pluginRegistry) return;

  var React = HOMEUI.React;
  var h = React.createElement;
  var useState = React.useState;

  var C = HOMEUI.components;
  var PageLayout = C.PageLayout;
  var Card = C.Card;
  var Button = C.Button;

  function MyPage() {
    return h(PageLayout, { title: 'My Plugin', hasRights: true },
      h(Card, { heading: 'Hello' },
        h('p', null, 'Plugin content here')
      )
    );
  }

  HOMEUI.pluginRegistry.register({
    id: 'my-plugin',
    components: { MyPage: MyPage },
  });
})();
```

## Plugin API (`window.__HOMEUI__`)

| Property | Description |
|---|---|
| `version` | API version (currently `1`) |
| `pluginRegistry` | `register(def)`, `get(id)`, `getAll()` |
| `React` | Shared React instance |
| `ReactDOM` | Shared ReactDOM/client |
| `services` | Runtime services (injected by app.js after init) |
| `components` | Shared UI components (see below) |

### Available components

**Layout:** `PageLayout`, `Card`, `Dialog`, `Confirm`

**Input:** `Input`, `Range`, `Checkbox`, `Switch`, `Dropdown`

**Display:** `Button`, `Table`, `TableRow`, `TableCell`, `Tag`, `Alert`, `Loader`

**Navigation:** `Tabs`, `TabContent`

### Services

Services are available after the application initializes. Check availability before use.

| Service | Description |
|---|---|
| `services.mqttClient` | MQTT client. Methods: `send(topic, value)`, `isConnected()`, `addStickySubscription(topic, handler)`, `unsubscribe(topic)` |
| `services.ConfigEditorProxy` | Config editor RPC. Methods: `Load({path})`, `Save({path, content})` |
| `services.EditorProxy` | Rules editor RPC |

## Deployment

1. Create plugin directory:
   ```
   /usr/share/wb-mqtt-homeui/plugins/<plugin-id>/
   ```

2. Place `manifest.json` and `index.js` inside

3. Ensure nginx serves static files (symlink should exist):
   ```
   /var/www/plugins -> /usr/share/wb-mqtt-homeui/plugins
   ```

4. Reload the web interface

## Existing plugins

| Plugin | Menu location | Description |
|---|---|---|
| `wb-buzzer` | Settings > Buzzer | Buzzer control panel with presets |
| `wb-scenarios-v2` | Rules > Scenarios V2 | Scenario CRUD editor |
