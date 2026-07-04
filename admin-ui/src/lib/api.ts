export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') || '';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const hasBody = typeof options.body !== 'undefined' && options.body !== null;
  const headers = new Headers(options.headers || {});
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    // Include credentials to send/receive cookies (important for auth)
    credentials: 'include',
  });
  
  if (!res.ok) {
    let message = `API error: ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data?.detail === 'string') {
        message = data.detail;
      } else if (Array.isArray(data?.detail)) {
        message = data.detail
          .map((item: { loc?: unknown; msg?: unknown }) => {
            const loc = Array.isArray(item?.loc) ? item.loc.join('.') : '';
            const msg = typeof item?.msg === 'string' ? item.msg : 'validation error';
            return loc ? `${loc}: ${msg}` : msg;
          })
          .join('; ');
      } else if (typeof data?.message === 'string') {
        message = data.message;
      }
    } catch {
      try {
        const text = await res.text();
        if (text) message = text;
      } catch {
        // ignore
      }
    }
    const error = new Error(message);
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
  
  return res.json();
}

// SWR fetcher wrapper
export const fetcher = (url: string) => fetchApi(url);
