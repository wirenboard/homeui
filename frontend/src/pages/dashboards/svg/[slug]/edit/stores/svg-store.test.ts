// @vitest-environment happy-dom
import { SvgStore } from './svg-store';

describe('SvgStore', () => {
  let store: SvgStore;

  beforeEach(() => {
    store = new SvgStore();
  });

  test('starts with null svg', () => {
    expect(store.svg).toBeNull();
    expect(store.hasSvg).toBe(false);
  });

  test('setSvg sets svg content', () => {
    store.setSvg('<svg></svg>');
    expect(store.svg).toBe('<svg></svg>');
    expect(store.hasSvg).toBe(true);
  });

  test('setSvg with empty string sets null', () => {
    store.setSvg('');
    expect(store.svg).toBeNull();
    expect(store.hasSvg).toBe(false);
  });

  test('hasFontStyles returns false when svg is null', () => {
    expect(store.hasFontStyles).toBe(false);
  });

  test('hasFontStyles returns true when svg contains font-family in style', () => {
    store.setSvg('<svg><style>text { font-family: Arial; }</style></svg>');
    expect(store.hasFontStyles).toBe(true);
  });

  test('hasFontStyles returns true when svg contains font-family attribute', () => {
    store.setSvg('<svg><text font-family="Arial">Hello</text></svg>');
    expect(store.hasFontStyles).toBe(true);
  });

  test('hasFontStyles returns true when svg contains font shorthand', () => {
    store.setSvg('<svg><style>text { font: 12px MyFont; }</style></svg>');
    expect(store.hasFontStyles).toBe(true);
  });

  test('hasFontStyles returns false when svg has no font styles', () => {
    store.setSvg('<svg><rect fill="red" /></svg>');
    expect(store.hasFontStyles).toBe(false);
  });

  test('exportSvg creates blob and triggers download', () => {
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({ click, href: '', download: '' } as any);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');

    store.setSvg('<svg>test</svg>');
    store.exportSvg('my-dashboard');

    expect(click).toHaveBeenCalled();
  });
});
