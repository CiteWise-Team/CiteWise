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

export const SESSION_EXPIRED_EVENT = "citewise:session-expired";

// Wipes every trace of the signed-in session. Exported so UI code never has to
// remember the individual key names.
export function clearSession() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  } catch (err) {
    console.error("Failed to clear session storage:", err);
  }
}

// A 401 that cannot be recovered by refreshing has to tear the session down in
// one place. Previously each caller alerted and navigated to /login on its own
// while `user` stayed in localStorage, so AuthContext still believed it was
// signed in and the navbar kept rendering the old account on the login page.
// Broadcasting here lets AuthProvider drop the user and the route guards redirect.
let sessionExpiredNotified = false;
export function notifySessionExpired() {
  clearSession();
  if (sessionExpiredNotified) return;
  sessionExpiredNotified = true;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  // Allow a later, genuinely new session to expire and notify again.
  setTimeout(() => { sessionExpiredNotified = false; }, 5000);
}

// Single-flight token refresh.
//
// The refresh token is read INSIDE this promise, not by each caller. Supabase
// rotates refresh tokens on use and invalidates the old one, so two concurrent
// 401s that each captured the pre-rotation token would make the second refresh
// fail and log a perfectly valid session out. The dashboard runs several polls
// at once, so simultaneous 401s at token expiry are the normal case, not an edge.
let refreshPromise = null;

function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return false;

    try {
      const r = await fetch(getApiUrl("/api/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok || !data.access_token) return false;

      localStorage.setItem("token", data.access_token);
      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
      }
      return true;
    } catch (err) {
      // Could not reach the refresh endpoint at all. Inconclusive — don't tear a
      // possibly-valid session down over a transient network blip.
      console.warn("Token refresh request failed:", err.message);
      return null;
    }
  })();

  // Always release the slot so the next expiry can start a fresh refresh
  // instead of re-reading this call's long-resolved result.
  refreshPromise.finally(() => { refreshPromise = null; });

  return refreshPromise;
}

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
  if (res.status === 401) {
    if (!isRetry) {
      const refreshed = await refreshAccessToken();
      if (refreshed === true) {
        return apiFetch(endpoint, options, true);
      }
      // `false` = no refresh token, or the refresh was definitively rejected.
      // The old code fell through here without clearing anything, leaving the app
      // "signed in" with a dead token so every subsequent request failed too.
      // `null` = the refresh endpoint was unreachable; stay signed in and let the
      // 401 surface to the caller instead.
      if (refreshed === false) {
        notifySessionExpired();
      }
    } else {
      // The retry carried a freshly issued access token and the server still
      // rejected it, so the session really is finished. Without this the app kept
      // its stale `user` and every later request 401'd in the same way.
      notifySessionExpired();
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
