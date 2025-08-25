export const getPathname = () => {
  const url = new URL(location.href);
  return decodeURIComponent(url.hash.split('/').pop());
};

export const parseHash = () => {
  const hash = location.href.split('#!')[1];
  const [path, queryString] = hash.split('?');

  return {
    page: path.split('/').at(-1),
    params: new URLSearchParams(queryString),
  };
};
