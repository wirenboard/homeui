// @vitest-environment happy-dom
import type { WbDeviceTemplateChannel } from '../../types';
import { WbDeviceChannelEditor } from './channel-editor-store';

const channel: WbDeviceTemplateChannel = { name: 'K1' };

const makeEditor = (config?: { name: string; title?: string; enabled?: boolean }, defaultTitle = 'Реле 1') =>
  new WbDeviceChannelEditor(channel, config, new Map(), defaultTitle);

describe('WbDeviceChannelEditor title', () => {
  it('fills the field with the translated template name and does not store it', () => {
    const editor = makeEditor();

    expect(editor.title.value).toBe('Реле 1');
    expect(editor.hasCustomTitle).toBe(false);
    expect(editor.customProperties).toBeUndefined();
  });

  it('keeps the title from the config and saves it back', () => {
    const editor = makeEditor({ name: 'K1', title: 'Hall light' });

    expect(editor.title.value).toBe('Hall light');
    expect(editor.isDirty).toBe(false);
    expect(editor.customProperties).toEqual({ name: 'K1', title: 'Hall light' });
  });

  it('saves an entered title together with other channel settings', () => {
    const editor = makeEditor({ name: 'K1', enabled: false });

    editor.title.setValue('Hall light');

    expect(editor.isDirty).toBe(true);
    expect(editor.customProperties).toEqual({ name: 'K1', enabled: false, title: 'Hall light' });
  });

  it.each(['Реле 1', 'K1'])('drops the title equal to the template name "%s"', (title) => {
    const editor = makeEditor({ name: 'K1', title: 'Hall light' });

    editor.title.setValue(title);

    expect(editor.hasCustomTitle).toBe(false);
    expect(editor.customProperties).toBeUndefined();
  });

  it('reports an error for an empty title', () => {
    const editor = makeEditor();

    editor.title.setValue('');

    expect(editor.hasErrors).toBe(true);
  });
});
