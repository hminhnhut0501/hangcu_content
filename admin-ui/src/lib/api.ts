export const API_BASE_URL = '';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
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
