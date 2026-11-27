// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import { render } from '@/test/render';
import { MenuItem } from './menu-item';

const baseProps = {
  isMenuCompact: false,
  openedSubmenus: [],
  setOpenedSubmenus: vi.fn(),
  activePopup: null,
  setActivePopup: vi.fn(),
  closeMobileMenu: vi.fn(),
  isMenuFocused: true,
  setIsMenuFocused: vi.fn(),
};

describe('MenuItem external links', () => {
  test('external item with openInNewTab renders an anchor carrying target and rel="noopener noreferrer"', () => {
    render(
      <MenuItem
        {...baseProps}
        item={{ id: 'svc', url: 'https://service.example/', label: 'ext', isExternal: true, openInNewTab: true }}
      />,
    );
    const link = screen.getByRole('link', { name: 'ext' });
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('https://service.example/');
    expect(link.getAttribute('target')).toBe('svc');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  test('external item without openInNewTab has href but no target/rel', () => {
    render(
      <MenuItem
        {...baseProps}
        item={{ id: 'svc', url: 'https://service.example/', label: 'ext', isExternal: true }}
      />,
    );
    const link = screen.getByRole('link', { name: 'ext' });
    expect(link.getAttribute('href')).toBe('https://service.example/');
    expect(link.getAttribute('target')).toBeNull();
    expect(link.getAttribute('rel')).toBeNull();
  });

  test('internal item renders a router link without rel', () => {
    render(
      <MenuItem {...baseProps} item={{ id: 'devices', url: '/devices', label: 'int' }} />,
    );
    const link = screen.getByRole('link', { name: 'int' });
    expect(link.getAttribute('href')).toBe('/devices');
    expect(link.getAttribute('rel')).toBeNull();
    expect(link.getAttribute('target')).toBeNull();
  });
});

describe('MenuItem submenu scrolling', () => {
  const submenuItem = {
    id: 'settings',
    label: 'settings',
    children: [{ id: 'child', url: '/child', label: 'child' }],
  };

  let scrollIntoView = vi.fn();
  let original: typeof Element.prototype.scrollIntoView;

  beforeEach(() => {
    scrollIntoView = vi.fn();
    original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = original;
  });

  test('opening a submenu scrolls its list to the end', () => {
    const { rerender } = render(
      <MenuItem {...baseProps} item={submenuItem} openedSubmenus={[]} />,
    );
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(<MenuItem {...baseProps} item={submenuItem} openedSubmenus={['settings']} />);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'end' });
  });

  test('a submenu already open on mount does not scroll', () => {
    render(<MenuItem {...baseProps} item={submenuItem} openedSubmenus={['settings']} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  test('closing a submenu does not scroll', () => {
    const { rerender } = render(
      <MenuItem {...baseProps} item={submenuItem} openedSubmenus={['settings']} />,
    );
    rerender(<MenuItem {...baseProps} item={submenuItem} openedSubmenus={[]} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
