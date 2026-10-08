"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SECONDS = 60;

// 共用邮件冷却逻辑：SSR 首帧一致，存储不可用时仍有内存保护。
export function useEmailCooldown(key: string) {
  const deadline = useRef(0);
  const [cooldown, setCooldown] = useState(0);
  const isCoolingDown = useCallback(() => {
    try {
      const stored = Number(localStorage.getItem(key));
      if (Number.isFinite(stored) && stored > Date.now() && stored <= Date.now() + SECONDS * 1000) deadline.current = Math.max(deadline.current, stored);
    } catch { /* 隐私设置禁用存储时使用内存时间 */ }
    return deadline.current > Date.now();
  }, [key]);
  useEffect(() => {
    function update() {
      isCoolingDown();
      setCooldown(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    }
    update();
    const timer = setInterval(update, 1000);
    window.addEventListener("storage", update);
    window.addEventListener("pageshow", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", update);
      window.removeEventListener("pageshow", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [isCoolingDown]);
  const startCooldown = useCallback(() => {
    deadline.current = Date.now() + SECONDS * 1000;
    setCooldown(SECONDS);
    try { localStorage.setItem(key, String(deadline.current)); } catch { /* 内存冷却继续有效 */ }
  }, [key]);
  return { cooldown, startCooldown, isCoolingDown };
}
