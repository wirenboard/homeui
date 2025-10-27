export const formatError = (error: unknown) => {
  if (typeof error === 'object') {
    const rpcError = error as Record<string, unknown>;
    if (rpcError.code) {
      return `${rpcError.message}: ${rpcError.data}(${rpcError.code})`;
    }
    return rpcError.message;
  }
  return String(error);
};
