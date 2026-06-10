const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;

export async function apiRequest(endpoint, options = {}) {
  if (!API_URL) {
    throw new Error("Missing API base URL. Set VITE_API_URL or VITE_API_BASE_URL.");
  }

  const token = localStorage.getItem("token");

  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    headers,
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }

  return data;
}
