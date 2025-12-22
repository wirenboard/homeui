/* eslint-disable stylistic/max-len */

import { type CompletionSource, snippetCompletion } from '@codemirror/autocomplete';

const snippets = [
  snippetCompletion(
    'log("${1:string}");',
    { label: 'log', type: 'function', detail: '(fmt, ...args)' }
  ),
  snippetCompletion(
    'debug("${1:string}");',
    { label: 'debug', type: 'function', detail: '(fmt, ...args)' }
  ),
  snippetCompletion(
    'startTimer("${1:name}", ${2:milliseconds});',
    { label: 'startTimer', type: 'function' }
  ),
  snippetCompletion(
    'setTimeout(function() {\n\t${1:callback}\n}, ${2:milliseconds});',
    { label: 'setTimeout', type: 'function' }
  ),
  snippetCompletion(
    'var intervalId = setInterval(function() {\n\t${1:callback}\n}, ${2:milliseconds});',
    { label: 'setInterval', type: 'function' }
  ),
  snippetCompletion(
    'clearInterval(${1:intervalId});',
    { label: 'clearInterval', type: 'function' }
  ),
  snippetCompletion(
    'startTicker("${1:name}", ${2:milliseconds});',
    { label: 'startTicker', type: 'function' }
  ),
  snippetCompletion(
    'enableRule(${1:ruleId});',
    { label: 'enableRule', type: 'function', detail: '(ruleId: number)' }
  ),
  snippetCompletion(
    'runRule(${1:ruleId});',
    { label: 'runRule', type: 'function', detail: '(ruleId: number)' }
  ),
  snippetCompletion(
    'disableRule(${1:ruleId});',
    { label: 'disableRule', type: 'function', detail: '(ruleId: number)' }
  ),
  snippetCompletion(
    'getDevice(${1:deviceName})',
    { label: 'getDevice', type: 'function' }
  ),
  snippetCompletion(
    'getControl(${1})',
    { label: 'getControl', type: 'function' }
  ),
  snippetCompletion(
    'var config = readConfig("${1:path}");',
    { label: 'readConfig', type: 'function', detail: '(path: string, params?: object): object' }
  ),
  snippetCompletion(
    'defineAlias("${1:aliasName}", "${2:paramName}");',
    { label: 'defineAlias', type: 'function' }
  ),
  snippetCompletion(
    'trackMqtt("${1:topicName}", function(message) {\n\t// message.topic, message.value\n}});',
    { label: 'trackMqtt', type: 'function', detail: '(topicName: string, callback: function)' }
  ),
  snippetCompletion(
    'publish("${1:topicName}", ${2:value}, ${3:qos}, ${4:retain});',
    { label: 'publish', type: 'function', detail: '(topicName: string, value: any, qos?: number, retain?: boolean)' }
  ),
  snippetCompletion(
    'Notify',
    { label: 'Notify', type: 'class' }
  ),
  snippetCompletion(
    'Alarms.load(${1:spec});',
    { label: 'Alarms', type: 'function' }
  ),
  snippetCompletion(
    'var storage = new PersistentStorage("${1:storageName}", {global: true});',
    { label: 'PersistentStorage', type: 'class' }
  ),
  snippetCompletion(
    'timers.${1:timerName};',
    { label: 'timers', type: 'variable' }
  ),
  snippetCompletion(
    'dev[${1:deviceName}];',
    { label: 'dev', type: 'variable' }
  ),
  snippetCompletion(
    'cron("@hourly")',
    { label: 'cron', type: 'function' }
  ),
  snippetCompletion(
    'runShellCommand("${1:command}");',
    { label: 'runShellCommand', type: 'function' }
  ),
  snippetCompletion(
    'defineVirtualDevice("${1:name}", {\n\ttitle: "${2:title}",\n\tcells: {\n\t\t${3:key}: {\n\t\t\ttype: "${4:type}",\n\t\t\tvalue: ${5:0}\n\t\t}\n\t}\n});',
    { label: 'defineVirtualDevice', type: 'function' }
  ),
  snippetCompletion(
    'defineRule("${1:name}", {\n\tasSoonAs: function() {\n\t\t//${2:condition}\n\t},\n\tthen: function(newValue, devName, cellName) {\n\t\t//${3:callback}\n\t}\n});',
    { label: 'defineRule', detail: 'asSoonAs', type: 'function' }
  ),
  snippetCompletion(
    'defineRule("${1:name}", {\n\twhen: function() {\n\t\t//${2:condition}\n\t},\n\tthen: function(newValue, devName, cellName) {\n\t\t//${3:callback}\n\t}\n});',
    { label: 'defineRule', detail: 'when', type: 'function' }
  ),
  snippetCompletion(
    'defineRule("${1:name}", {\n\twhenChanged: ["${2:topic}"],\n\tthen: function(newValue, devName, cellName) {\n\t\t//${3:callback}\n\t}\n});',
    { label: 'defineRule', detail: 'whenChanged', type: 'function' }
  ),
];

export const snippetSource: CompletionSource = (context) => {
  const word = context.matchBefore(/\p{L}[\p{L}\d_]*$/u);
  if (!word) return null;

  return {
    from: word.from,
    to: context.pos,
    options: snippets,
  };
};
