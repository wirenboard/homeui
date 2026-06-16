export const formatErrorMock = vi.fn((err: unknown) =>
  err instanceof Error ? err.message : String(err),
);

export { formatErrorMock as formatError };
