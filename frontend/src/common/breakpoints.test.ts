import { readFileSync } from 'fs';
import path from 'path';
import * as breakpoints from './breakpoints';

const css = readFileSync(path.resolve(__dirname, 'breakpoints.css'), 'utf8');

const declaredQuery = (name: string) => css.match(new RegExp(`@custom-media --${name} \\(([^)]+)\\);`))?.[1];

describe('CSS custom media match the TS breakpoints', () => {
  test.each(Object.entries(breakpoints))('%s', (name, width) => {
    const [bound] = name.split('_');
    expect(declaredQuery(name.toLowerCase().replaceAll('_', '-'))).toBe(`${bound.toLowerCase()}-width: ${width}px`);
  });

  test('every custom media has a TS constant', () => {
    expect(css.match(/@custom-media/g)).toHaveLength(Object.keys(breakpoints).length);
  });
});
