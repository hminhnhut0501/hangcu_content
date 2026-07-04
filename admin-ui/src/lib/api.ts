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
    const error = new Error(`API error: ${res.status}`);
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
  
  return res.json();
}

// SWR fetcher wrapper
export const fetcher = (url: string) => fetchApi(url);
