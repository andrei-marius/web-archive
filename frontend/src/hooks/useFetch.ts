// hooks/useFetch.ts
import { useState, useCallback } from 'react';

type FetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
};

type FetchResponse<T> = {
  data?: T;
  error?: string;
  loading: boolean;
};

export function useFetch<T>() {
  const [response, setResponse] = useState<FetchResponse<T>>({
    loading: false,
  });

  const fetchData = useCallback(async (url: string, options?: FetchOptions) => {
    setResponse(prev => ({ ...prev, loading: true }));

    try {
      const fetchOptions: RequestInit = {
        method: options?.method || 'GET',
        headers: options?.headers || { 'Content-Type': 'application/json' },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      };

      const res = await fetch(url, fetchOptions);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResponse({
        data,
        loading: false,
        error: undefined,
      });

      return { success: true, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResponse({
        data: undefined,
        loading: false,
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }, []);

  return { ...response, fetchData };
}