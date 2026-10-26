import { authStore, UserRole } from '@/stores/auth';
import { createPluginApi } from './api';
import type { PluginDefinition, PluginManifest } from './types';

declare global {
  interface Window {
    wbHomeui?: { libs: Record<string, unknown>; register: (_plugin: PluginDefinition) => void };
  }
}

/**
 * Plugins are classic scripts listed by GET /ui/plugins. Each calls
 * `window.wbHomeui.register({ id, activate })` and takes React, MobX and CodeMirror from
 * `window.wbHomeui.libs`, so it shares the app's instances.
 */
export const loadPlugins = async () => {
  let manifests: PluginManifest[];
  try {
    const res = await fetch('/ui/plugins');
    manifests = res.ok ? await res.json() : [];
  } catch {
    return;
  }
  const api = await createPluginApi();
  window.wbHomeui = {
    libs: api.libs,
    register: ({ id, activate }) => {
      try {
        activate(api);
      } catch (err) {
        console.error(`Plugin "${id}" failed to start`, err);
      }
    },
  };
  manifests
    .filter((m) => authStore.hasRights(m.role || UserRole.User))
    .forEach((m) => {
      const script = document.createElement('script');
      script.src = m.script;
      script.async = true;
      script.onerror = () => console.error(`Plugin "${m.id}" failed to load from ${m.script}`);
      document.head.appendChild(script);
    });
};
