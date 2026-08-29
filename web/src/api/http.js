export const API_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export function getApiUrl(endpoint) {
  if (!endpoint) return API_URL;
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  let base = API_URL;
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (base.endsWith("/api") && path.startsWith("/api/")) {
    base = base.slice(0, -4);
  }

  return `${base}${path}`;
}

let isRefreshing = false;
let refreshPromise = null;

export async function apiFetch(endpoint, options = {}, isRetry = false) {
  const url = getApiUrl(endpoint);
  const token = localStorage.getItem("token");

  const headers = {
    ...(options.headers || {}),
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let res = await fetch(url, {
    ...options,
    headers,
  });

  // Handle auto-refresh if 401 Unauthorized
  if (res.status === 401 && !isRetry) {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = fetch(getApiUrl("/api/auth/refresh"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken })
        }).then(r => r.json()).finally(() => {
          isRefreshing = false;
        });
      }

      const refreshData = await refreshPromise;
      if (refreshData?.ok && refreshData.access_token) {
        localStorage.setItem("token", refreshData.access_token);
        if (refreshData.refresh_token) {
          localStorage.setItem("refresh_token", refreshData.refresh_token);
        }
        // Retry original request
        return apiFetch(endpoint, options, true);
      } else {
        // Refresh failed, force logout
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
  }

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
