//Api.js
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("access_token");
}
async function request(path, { method = "GET", body, auth = true, headers = {} } = {}) {
  const finalHeaders = { ...headers };

  if (body && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = localStorage.getItem("access_token");
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });

  // ✅ 204 No Content: ничего не парсим
  if (res.status === 204) return null;

  // ✅ читаем как text, и только потом решаем — JSON или нет
  const raw = await res.text();
  const contentType = (res.headers.get("content-type") || "").toLowerCase();

  let data = raw;
  if (raw && contentType.includes("application/json")) {
    try {
      data = JSON.parse(raw);
    } catch {
      // если сервер по ошибке прислал пустое/битое json-тело — не падаем
      data = raw;
    }
  } else if (!raw) {
    // пустое тело даже при 200/201 (бывает)
    data = null;
  }

  if (!res.ok) {
    const msg =
      (typeof data === "object" && data?.detail) ||
      (typeof data === "string" && data) ||
      "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  loginJson: (email, password) =>
    request("/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    }),

  getMe: () => request("/users/me", { method: "GET" }),

  // --- USERS (ADMIN) ---
  getUsers: () => request("/users", { method: "GET" }),

  createUser: (payload) =>
    request("/users", {
      method: "POST",
      body: payload,
    }),

  updateUser: (id, payload) =>
    request(`/users/${id}`, {
      method: "PUT",
      body: payload,
    }),

  deleteUser: (id) =>
    request(`/users/${id}`, {
      method: "DELETE",
    }),

  updateMe: (payload) =>
    request("/users/me", {
      method: "PUT",
      body: payload,
    }),
    


  getUser: (id) => request(`/users/${id}`, { method: "GET" }),

  // --- other ---
  getDashboard: () => request("/dashboard", { method: "GET" }),

    // --- JOURNAL ---
  getJournal: () => request("/journal", { method: "GET" }),

  confirmDefect: (defectId, comment = "") =>
    request(`/journal/${defectId}/confirm?comment=${encodeURIComponent(comment)}`, {
      method: "POST",
    }),

  rejectDefect: (defectId, comment = "") =>
    request(`/journal/${defectId}/reject?comment=${encodeURIComponent(comment)}`, {
      method: "POST",
    }),

    // --- AI SHIFT ---
  startShift: ({ mode = "balanced", threshold = null, delaySec = 0.7 } = {}) => {
    const params = new URLSearchParams();

    params.set("mode", mode);
    params.set("delay_sec", String(delaySec));

    if (threshold !== null && threshold !== undefined && threshold !== "") {
      params.set("threshold", String(threshold));
    }

    return request(`/ai/shift/start?${params.toString()}`, {
      method: "POST",
    });
  },

  getShiftStatus: () =>
    request("/ai/shift/status", {
      method: "GET",
    }),

  stopShift: () =>
    request("/ai/shift/stop", {
      method: "POST",
    }),
};

export { API_BASE_URL };
