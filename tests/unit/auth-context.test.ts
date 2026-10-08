import { afterEach, beforeEach, expect, test, vi } from "vitest";

const hooks = vi.hoisted(() => ({ states: [] as unknown[], refs: [] as { current: unknown }[], effects: [] as (() => (() => void))[], stateIndex: 0, refIndex: 0 }));
const client = vi.hoisted(() => ({ profile: vi.fn(), getUser: vi.fn(), onAuthStateChange: vi.fn() }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState(initial: unknown) {
    const index = hooks.stateIndex++;
    hooks.states[index] = initial;
    return [initial, (value: unknown) => { hooks.states[index] = typeof value === "function" ? value(hooks.states[index]) : value; }];
  },
  useRef(initial: unknown) { const ref = { current: initial }; hooks.refs[hooks.refIndex++] = ref; return ref; },
  useEffect(effect: () => (() => void)) { hooks.effects.push(effect); },
  useCallback(callback: unknown) { return callback; },
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({
  auth: client,
  from: () => ({ select: () => ({ eq: () => ({ single: client.profile }) }) }),
}) }));
import { AuthProvider } from "@/components/AuthContext";

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  hooks.states.length = 0; hooks.refs.length = 0; hooks.effects.length = 0;
  hooks.stateIndex = 0; hooks.refIndex = 0;
  client.getUser.mockResolvedValue({ data: { user: null } });
  client.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});
afterEach(() => { vi.useRealTimers(); });

test("退出后旧 profile 查询不能重新设置登录状态", async () => {
  let resolveProfile!: (value: object) => void;
  client.profile.mockReturnValue(new Promise((resolve) => { resolveProfile = resolve; }));
  AuthProvider({ children: null });
  hooks.effects[0]();
  const callback = client.onAuthStateChange.mock.calls[0][0];
  callback("SIGNED_IN", { user: { id: "account-a", email: "a@example.invalid" } });
  await vi.advanceTimersByTimeAsync(0);
  callback("SIGNED_OUT", null);
  resolveProfile({ data: { role: "admin" }, error: null });
  await Promise.resolve();
  expect(hooks.states[0]).toBeNull();
  expect(hooks.states[1]).toBe(false);
});

test("切换账号后旧账号角色不能写到新账号", async () => {
  let resolveProfile!: (value: object) => void;
  client.profile.mockReturnValueOnce(new Promise((resolve) => { resolveProfile = resolve; }));
  client.profile.mockResolvedValue({ data: { role: "user" }, error: null });
  AuthProvider({ children: null });
  hooks.effects[0]();
  const callback = client.onAuthStateChange.mock.calls[0][0];
  callback("SIGNED_IN", { user: { id: "account-a" } });
  await vi.advanceTimersByTimeAsync(0);
  callback("SIGNED_IN", { user: { id: "account-b" } });
  await vi.advanceTimersByTimeAsync(0);
  resolveProfile({ data: { role: "admin" }, error: null });
  await Promise.resolve();
  expect(hooks.states[0]).toMatchObject({ id: "account-b", role: "user" });
});
