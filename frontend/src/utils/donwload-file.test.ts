// @vitest-environment happy-dom
import { downloadFile } from './donwload-file';

describe('downloadFile (with type)', () => {
  test('creates link, clicks and revokes', () => {
    const click = vi.fn();
    const remove = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      click,
      remove,
      href: '',
      download: '',
      style: '',
    } as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
    const createURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
    const revokeURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    downloadFile('test.json', 'application/json', '{"a":1}');

    expect(createURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(revokeURL).toHaveBeenCalled();
  });
});
