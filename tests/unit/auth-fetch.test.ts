import { afterEach, expect, test, vi } from "vitest";
import { fetchWithAuthTimeout } from "@/lib/auth-fetch";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

test("认证请求超时后结束等待并清理定时器", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn((_input, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  })));
  const pending = fetchWithAuthTimeout("https://audit.supabase.co/auth/v1/token");
  const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
  await vi.advanceTimersByTimeAsync(20000);
  await rejected;
  expect(vi.getTimerCount()).toBe(0);
});

test("调用者取消认证请求时同步取消网络并清理定时器", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn((_input, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  })));
  const controller = new AbortController();
  const pending = fetchWithAuthTimeout("/auth/recovery", { signal: controller.signal });
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(vi.getTimerCount()).toBe(0);
});

test("普通数据库查询保留原始 fetch 配置", async () => {
  const response = new Response("{}");
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  const init = { method: "GET" };
  expect(await fetchWithAuthTimeout("https://audit.supabase.co/rest/v1/profiles", init)).toBe(response);
  expect(fetchMock).toHaveBeenCalledWith("https://audit.supabase.co/rest/v1/profiles", init);
});

test("收到响应头但响应体停滞时也会超时", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn((_input, init: RequestInit) => {
    const body = new ReadableStream({ start(controller) {
      init.signal?.addEventListener("abort", () => controller.error(new DOMException("Aborted", "AbortError")), { once: true });
    } });
    return Promise.resolve(new Response(body));
  }));
  const pending = fetchWithAuthTimeout("/auth/recovery");
  const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
  await vi.advanceTimersByTimeAsync(20000);
  await rejected;
  expect(vi.getTimerCount()).toBe(0);
});
