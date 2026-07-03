// @vitest-environment happy-dom
import { downloadFile } from './download';

describe('downloadFile (with blob)', () => {
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

    const blob = new Blob(['data'], { type: 'text/plain' });
    downloadFile('file.txt', blob);

    expect(createURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(revokeURL).toHaveBeenCalledWith('blob:url');
  });
});
