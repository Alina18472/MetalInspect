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
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body
      ? body instanceof FormData
        ? body
        : JSON.stringify(body)
      : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const err = new Error(data?.detail || "Request failed");
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

  // примеры будущих запросов
  getDashboard: () => request("/dashboard", { method: "GET" }),
};

export { API_BASE_URL };
