import React, { useEffect, useState } from 'react';

interface PluginHostProps {
  pluginId: string;
  componentName: string;
}

class PluginErrorBoundary extends React.Component<
  { pluginId: string; children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '20px', color: '#d9534f' }}>
          Plugin "{this.props.pluginId}" crashed: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

const loadedScripts = new Set<string>();

export const PluginHost: React.FC<PluginHostProps> = ({ pluginId, componentName }) => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const registry = (window as any).__HOMEUI__?.pluginRegistry;
    if (!registry) {
      setError('Plugin system not initialized');
      setLoading(false);
      return;
    }

    const existing = registry.get(pluginId);
    if (existing?.components?.[componentName]) {
      setComponent(() => existing.components[componentName]);
      setLoading(false);
      return;
    }

    const manifests: any[] = (window as any).__HOMEUI_PLUGIN_MANIFESTS__ || [];
    const manifest = manifests.find((m: any) => m.id === pluginId);
    if (!manifest) {
      setError(`Plugin manifest not found: ${pluginId}`);
      setLoading(false);
      return;
    }

    const scriptUrl = `/plugins/${pluginId}/${manifest.entrypoint}`;

    let timeoutId: ReturnType<typeof setTimeout>;

    const onRegistered = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id === pluginId) {
        clearTimeout(timeoutId);
        const plugin = registry.get(pluginId);
        if (plugin?.components?.[componentName]) {
          setComponent(() => plugin.components[componentName]);
        } else {
          setError(`Component "${componentName}" not found in plugin "${pluginId}"`);
        }
        setLoading(false);
        window.removeEventListener('homeui-plugin-registered', onRegistered);
      }
    };

    window.addEventListener('homeui-plugin-registered', onRegistered);

    if (!loadedScripts.has(scriptUrl)) {
      loadedScripts.add(scriptUrl);
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.onerror = () => {
        clearTimeout(timeoutId);
        setError(`Failed to load plugin: ${scriptUrl}`);
        setLoading(false);
        loadedScripts.delete(scriptUrl);
      };
      document.head.appendChild(script);
    }

    timeoutId = setTimeout(() => {
      setError(`Plugin "${pluginId}" load timeout`);
      setLoading(false);
    }, 10000);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('homeui-plugin-registered', onRegistered);
    };
  }, [pluginId, componentName]);

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading plugin...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: '#d9534f' }}>{error}</div>;
  }

  if (!Component) {
    return null;
  }

  return (
    <PluginErrorBoundary pluginId={pluginId}>
      <Component />
    </PluginErrorBoundary>
  );
};
