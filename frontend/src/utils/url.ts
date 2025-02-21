export const getPathname = () => {
  const url = new URL(location.href);
  return decodeURIComponent(url.hash.split('/').pop());
};
