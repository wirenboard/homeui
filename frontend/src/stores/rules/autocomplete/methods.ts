import { snippetCompletion, type Completion, type CompletionSource } from '@codemirror/autocomplete';

const makeMethodSource = (regex: RegExp, options: Completion[]): CompletionSource => {
  return (context) => {
    const before = context.matchBefore(regex);
    return before
      ? {
        from: before.from + before.text.lastIndexOf('.') + 1,
        to: context.pos,
        options,
      }
      : null;
  };
};

const deviceMethods: Completion[] = [
  { label: 'getId', type: 'function', detail: '(): string', apply: 'getId()' },
  { label: 'controlsList', type: 'function', detail: '(): Control[]', apply: 'controlsList()' },
  snippetCompletion(
    'getCellId("${1:cellId}")',
    { label: 'getCellId', type: 'function', detail: '(cellId: string): string' }
  ),
  snippetCompletion(
    'getControl(${1:name})',
    { label: 'getControl', type: 'function', detail: '(name: string)' }
  ),
  snippetCompletion(
    'addControl("${1:name}", { ${2:params} })',
    { label: 'addControl', type: 'function', detail: '(name: string, options: {...})' }
  ),
  snippetCompletion(
    'removeControl("${1:name}")',
    { label: 'removeControl', type: 'function', detail: '(name: string)' }
  ),
  snippetCompletion(
    'isControlExists("${1:name}")',
    { label: 'isControlExists', type: 'function', detail: '(name: string)' }
  ),
  { label: 'isVirtual', type: 'function', detail: '(): boolean', apply: 'isVirtual()' },
  snippetCompletion(
    'setError("${1:msg}")',
    { label: 'setError', type: 'function', detail: '(msg: string)' }
  ),
  { label: 'getError', type: 'function', detail: '(): string', apply: 'getError()' },
];

const controlMethods: Completion[] = [
  { label: 'getId', type: 'function', detail: '(): string', apply: 'getId()' },
  snippetCompletion(
    'getTitle("${1:lang}")',
    { label: 'getTitle', type: 'function', detail: '(lang?: string): string' }
  ),
  { label: 'getDescription', type: 'function', detail: '(): string', apply: 'getDescription()' },
  { label: 'getType', type: 'function', detail: '(): string', apply: 'getType()' },
  { label: 'getUnits', type: 'function', detail: '(): string', apply: 'getUnits()' },
  { label: 'getReadonly', type: 'function', detail: '(): boolean', apply: 'getReadonly()' },
  { label: 'getMax', type: 'function', detail: '(): number', apply: 'getMax()' },
  { label: 'getMin', type: 'function', detail: '(): number', apply: 'getMin()' },
  { label: 'getPrecision', type: 'function', detail: '(): number', apply: 'getPrecision()' },
  { label: 'getError', type: 'function', detail: '(): string', apply: 'getError()' },
  { label: 'getOrder', type: 'function', detail: '(): number', apply: 'getOrder()' },
  { label: 'getValue', type: 'function', detail: '(): any', apply: 'getValue()' },
  snippetCompletion(
    'setTitle({ en: "${1:titleEn}", ru: "${2:titleRu}" })',
    { label: 'setTitle', type: 'function', detail: '(lang?: string): string' }
  ),
  snippetCompletion(
    'setEnumTitles({ "val1": { en: "${1:titleEn}", ru: "${2:titleRu}" } })',
    { label: 'setEnumTitles', type: 'function', detail: '(object)' }
  ),
  snippetCompletion(
    'setDescription("${1:description}")',
    { label: 'setDescription', type: 'function', detail: '(string)' }
  ),
  snippetCompletion(
    'setType("${1:type}")',
    { label: 'setType', type: 'function', detail: '(string)' }
  ),
  snippetCompletion(
    'setUnits("${1:units}")',
    { label: 'setUnits', type: 'function', detail: '(string)' }
  ),
  snippetCompletion(
    'setReadonly(${1:true})',
    { label: 'setReadonly', type: 'function', detail: '(boolean)' }
  ),
  snippetCompletion(
    'setMin(${1:number})',
    { label: 'setMin', type: 'function', detail: '(number)' }
  ),
  snippetCompletion(
    'setMax(${1:number})',
    { label: 'setMax', type: 'function', detail: '(number)' }
  ),
  snippetCompletion(
    'setPrecision(${1:number})',
    { label: 'setPrecision', type: 'function', detail: '(number)' }
  ),
  snippetCompletion(
    'setOrder(${1:number})',
    { label: 'setOrder', type: 'function', detail: '(number)' }
  ),
  snippetCompletion(
    'setError("${1:w}")',
    { label: 'setError', type: 'function', detail: '("r" | "w" | "p")' }
  ),
  snippetCompletion(
    'setValue(${1:string})',
    { label: 'setValue', type: 'function', detail: '(any)' }
  ),
];

const timerMethods: Completion[] = [
  { label: 'firing', type: 'property', detail: 'boolean', apply: 'firing' },
  { label: 'stop', type: 'function', detail: '(): void', apply: 'stop()' },
];

const logMethodsSource: CompletionSource = (context) => {
  const before = context.matchBefore(/log\.\w*$/);
  if (!before) return null;

  return {
    from: before.from + 4,
    to: context.pos,
    options: [
      snippetCompletion(
        'debug("${1:message}")',
        { label: 'debug', type: 'function', detail: '(fmt, ...args)' }
      ),
      snippetCompletion(
        'info("${1:message}")',
        { label: 'info', type: 'function', detail: '(fmt, ...args)' }
      ),
      snippetCompletion(
        'warning("${1:message}")',
        { label: 'warning', type: 'function', detail: '(fmt, ...args)' }
      ),
      snippetCompletion(
        'error("${1:message}")',
        { label: 'error', type: 'function', detail: '(fmt, ...args)' }
      ),
    ],
  };
};

const notifyMethodsSource: CompletionSource = (context) => {
  const before = context.matchBefore(/Notify\.\w*$/);
  if (!before) return null;

  return {
    from: before.from + 7,
    to: context.pos,
    options: [
      snippetCompletion(
        'sendEmail(${1:to}, ${2:subject}, ${3:text})',
        { label: 'sendEmail', type: 'function', detail: '(to, subject, text)' }
      ),
      snippetCompletion(
        'sendSMS(${1:to}, ${2:text}, ${3:command})',
        { label: 'sendSMS', type: 'function', detail: '(to, text, command?)' }
      ),
      snippetCompletion(
        'sendTelegramMessage(${1:token}, ${2:chatId}, ${3:text})',
        { label: 'sendTelegramMessage', type: 'function', detail: '(token, chatId, text)' }
      ),
    ],
  };
};

const stringFormatSource: CompletionSource = (context) => {
  const before = context.matchBefore(/(["'`][^"'`]*["'`])\.\w*$/);
  if (!before) return null;

  return {
    from: before.from + before.text.lastIndexOf('.') + 1,
    to: context.pos,
    options: [
      snippetCompletion(
        'format(${1:arg})',
        { label: 'format', type: 'function', detail: '(token, chatId, text)' }
      ),
      snippetCompletion(
        'xformat(${1:arg})',
        { label: 'xformat', type: 'function', detail: '(token, chatId, text)' }
      ),
    ],
  };
};

export const methods = [
  makeMethodSource(/getDevice\([^)]*\)\.[\w$]*$/, deviceMethods),
  makeMethodSource(/getDevice\([^)]*\)\.getControl\([^)]*\)\.[\w$]*$/, controlMethods),
  makeMethodSource(/getControl\([^)]*\)\.[\w$]*$/, controlMethods),
  makeMethodSource(/timers\.\w+\.[\w$]*$/, timerMethods),
  logMethodsSource,
  notifyMethodsSource,
  stringFormatSource,
];
