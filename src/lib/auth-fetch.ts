// 仅给认证请求加超时，慢网络不会让提交按钮无限等待。
export async function fetchWithAuthTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!new URL(url, "http://localhost").pathname.startsWith("/auth/")) return fetch(input, init);
  const controller = new AbortController();
  const upstream = init.signal ?? (input instanceof Request ? input.signal : undefined);
  function abort() { controller.abort(); }
  if (upstream?.aborted) abort();
  else upstream?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 20000);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    // 认证响应较小，先读完副本，超时也覆盖响应体；保留原响应给 SDK 解析。
    await response.clone().arrayBuffer();
    return response;
  }
  finally { clearTimeout(timer); upstream?.removeEventListener("abort", abort); }
}
