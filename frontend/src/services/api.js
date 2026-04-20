const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

export const apiRequest = async ({ baseUrl, path, method = 'GET', body, accessToken }) => {
  const normalizedBase = (baseUrl || '').trim().replace(/\/$/, '');
  const url = normalizedBase ? `${normalizedBase}${path}` : path;

  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(payload?.message || 'API 요청에 실패했습니다.');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};