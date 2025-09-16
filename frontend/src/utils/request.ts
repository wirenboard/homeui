interface FetchOptions {
  body?: Record<string, any> | string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  emptyResponse?: boolean;
}

interface ErrorResponse {
  detail: string;
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
    let errorData: ErrorResponse;
    try {
      errorData = await res.json();
    } catch (SyntaxError) {
      throw Error(res.statusText);
    }
    throw Error(errorData.detail);
  }
  if (options.emptyResponse) {
    return;
  }
  return await res.json();
};
