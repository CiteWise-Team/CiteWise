export const API_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export function getApiUrl(endpoint) {
  if (!endpoint) return API_URL;
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_URL}${path}`;
}

export async function apiFetch(endpoint, options = {}) {
  const url = getApiUrl(endpoint);
  const token = localStorage.getItem("token");

  const headers = {
    ...(options.headers || {}),
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type");
  let data;
  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  } else {
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
    }
    throw new Error("Invalid response from server: Expected JSON. Please verify backend connection.");
  }

  return { res, data };
}

export async function apiRequest(endpoint, options = {}) {
  const { res, data } = await apiFetch(endpoint, options);

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }

  return data;
}
