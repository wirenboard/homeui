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

  test('exportSvg creates blob and triggers download', () => {
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({ click, href: '', download: '' } as any);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');

    store.setSvg('<svg>test</svg>');
    store.exportSvg('my-dashboard');

    expect(click).toHaveBeenCalled();
  });
});
