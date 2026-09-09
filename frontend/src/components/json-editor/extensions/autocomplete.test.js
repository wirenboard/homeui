// @vitest-environment happy-dom
import { fireEvent, waitFor } from '@testing-library/react';
import { createJSONEditor } from './wb-json-editor';

// mirrors the channels field of wb-mqtt-db.schema.json — no pattern of its own, +/+ is valid there
const historySchema = {
  type: 'object',
  properties: {
    channels: {
      type: 'array',
      format: 'table',
      items: {
        type: 'string',
        title: 'Channel pattern',
        minLength: 3,
        format: 'wb-autocomplete',
        options: {
          wb: { data: 'devices' },
        },
      },
    },
  },
  required: ['channels'],
};

// mirrors a field addressing one control — wb-scenarios, alarms and waterius forbid + themselves
const singleControlSchema = {
  type: 'object',
  properties: {
    channels: {
      type: 'array',
      format: 'table',
      items: {
        type: 'string',
        title: 'Control',
        minLength: 3,
        pattern: '^[^/+#]+/[^/+#]+$',
        format: 'wb-autocomplete',
        options: {
          patternmessage: 'Invalid format',
          wb: { data: 'devices' },
        },
      },
    },
  },
  required: ['channels'],
};

// mirrors the topic field of wb-mqtt-opcua and wb-mqtt-iec104 — no pattern, but filled by the service
const readonlySchema = {
  type: 'object',
  properties: {
    channels: {
      type: 'array',
      format: 'table',
      items: {
        type: 'string',
        title: 'MQTT device and control',
        readonly: true,
        format: 'wb-autocomplete',
        options: {
          wb: { data: 'devices' },
        },
      },
    },
  },
  required: ['channels'],
};

const topics = [
  {
    label: 'wb-adc',
    options: [
      { value: 'wb-adc/A1', label: 'A1 [wb-adc/A1]' },
      { value: 'wb-adc/A2', label: 'A2 [wb-adc/A2]' },
    ],
  },
];

const buildEditor = async (value, schema = historySchema) => {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const editor = createJSONEditor(element, schema, value, 'en', 'root', topics);
  await new Promise((resolve) => editor.on('ready', resolve));
  return { editor, element };
};

const typeInto = async (element, text) => {
  const input = await waitFor(() => {
    const el = element.querySelector('input[aria-autocomplete="list"]');
    expect(el).toBeTruthy();
    return el;
  });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  await waitFor(() => {
    expect(document.querySelector('.dropdown__menu')).toBeTruthy();
  });
};

const menuOptions = () => [...document.querySelectorAll('.dropdown__option')].map((o) => o.textContent);

describe('wb-autocomplete editor in a schema that takes channel patterns', () => {
  test('a wildcard value from the config stays in the editor state and is shown in the field', async () => {
    const { editor, element } = await buildEditor({ channels: ['+/+'] });

    expect(editor.getValue().channels).toEqual(['+/+']);
    expect(editor.validate()).toEqual([]);

    const cell = element.querySelector('[data-schemapath="root.channels.0"]');
    await waitFor(() => {
      expect(cell.textContent).toContain('+/+');
    });

    editor.destroy();
  });

  test('the value survives a new row being added', async () => {
    const { editor } = await buildEditor({ channels: ['+/+'] });

    editor.getEditor('root.channels').add_row_button.click();

    expect(editor.getValue().channels[0]).toBe('+/+');

    editor.destroy();
  });

  test.each([['+/+'], ['+/Temperature'], ['wb-adc/+']])(
    'the pattern %s is offered as the first option and commits to the config',
    async (pattern) => {
      const { editor, element } = await buildEditor({ channels: ['wb-adc/A1'] });

      await typeInto(element, pattern);

      const options = menuOptions();
      expect(options[0]).toContain('common.buttons.add');
      expect(options[0]).toContain(pattern);

      fireEvent.click(document.querySelectorAll('.dropdown__option')[0]);

      await waitFor(() => {
        expect(editor.getValue().channels).toEqual([pattern]);
      });

      editor.destroy();
    },
  );

  test('a half-typed real channel is not offered as typed, the suggestions stay', async () => {
    const { element } = await buildEditor({ channels: ['+/+'] });

    await typeInto(element, 'wb-adc/A');

    expect(menuOptions()).toEqual(['A1 [wb-adc/A1]', 'A2 [wb-adc/A2]']);
  });

  test.each([['wb-adc/A9'], ['nonsense'], ['+'], ['wb-adc/+/A1'], ['wb-adc/#'], ['#/A1']])(
    'the value %s is neither a channel nor a pattern, so the menu offers nothing at all',
    async (typed) => {
      const { element } = await buildEditor({ channels: ['+/+'] });

      await typeInto(element, typed);

      expect(menuOptions()).toEqual([]);
    },
  );
});

describe('wb-autocomplete editor in a schema that forbids channel patterns', () => {
  test('the field stays a strict select and a wildcard cannot be typed in', async () => {
    const { element } = await buildEditor({ channels: ['wb-adc/A1'] }, singleControlSchema);

    await typeInto(element, '+/+');

    expect(menuOptions()).toEqual([]);
  });

  test('a read-only field takes nothing typed in either, although it has no pattern', async () => {
    const { element } = await buildEditor({ channels: ['wb-adc/A1'] }, readonlySchema);

    await typeInto(element, '+/+');

    expect(menuOptions()).toEqual([]);
  });

  test('a wildcard already in the config is reported as invalid instead of being shown', async () => {
    const { editor, element } = await buildEditor({ channels: ['+/+'] }, singleControlSchema);

    expect(editor.validate()).toEqual([
      expect.objectContaining({ path: 'root.channels.0', property: 'pattern' }),
    ]);

    const cell = element.querySelector('[data-schemapath="root.channels.0"]');
    await waitFor(() => {
      expect(cell.querySelector('.dropdown__control')).toBeTruthy();
    });
    expect(cell.textContent).not.toContain('+/+');

    editor.destroy();
  });
});
