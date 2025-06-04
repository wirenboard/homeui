interface FetchOptions {
  body?: Record<string, any> | string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

export const request = async <ResponseData>(url: string, options: FetchOptions = {}): Promise<ResponseData> => {
  const { body, method } = options;

  const params: any = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Accept-Language': localStorage.getItem('language') || 'ru',
    },
    method: method || 'GET',
  };
  if (body) {
    params.body = JSON.stringify(body);
  }

  const res = await fetch(url, params);
  if (![200, 201].includes(res.status)) {
    throw Error((await res.json()).detail);
  }
  return await res.json();
};
