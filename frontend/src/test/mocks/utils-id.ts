export const generateNextIdMock = vi.fn((_items: string[], base: string) => `${base}1`);

export { generateNextIdMock as generateNextId };
