export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function call(method, path, body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("The server could not be reached.", 0);
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new ApiError((data && (data.detail && typeof data.detail === "string" ? data.detail : data.error)) || `The server answered with status ${res.status}.`, res.status);
  return data;
}

export const api = {
  config: () => call("GET", "/api/config"),
  list: () => call("GET", "/api/checkins"),
  get: (id) => call("GET", `/api/checkins/${encodeURIComponent(id)}`),
  create: (payload) => call("POST", "/api/checkins", payload),
};
