import { describe, expect, test } from "vitest";
import { normalizeTonerWebsiteUrl } from "@/lib/toner-website";

describe("色母官网链接", () => {
  test.each([null, "", "   "])("%j 表示解除关联", (value) => {
    expect(normalizeTonerWebsiteUrl(value)).toBeNull();
  });

  test.each([
    ["  https://www.hiwe.com/product?lang=en#details  ", "https://www.hiwe.com/product?lang=en#details"],
    ["https://hiwe.com/product", "https://hiwe.com/product"],
    ["HTTPS://WWW.HIWE.COM:443/product", "https://www.hiwe.com/product"],
  ])("接受官网网址并规范化 %s", (input, expected) => {
    expect(normalizeTonerWebsiteUrl(input)).toBe(expected);
  });

  test.each([
    undefined, 42, false, [], {}, "hiwe.com/product", "/product", "https:hiwe.com/product",
    "http://www.hiwe.com/product", "javascript:alert(1)", "data:text/html,test", "https://example.com",
    "https://www.hiwe.com.evil.com/product", "https://evilhiwe.com/product", "https://shop.hiwe.com/product",
    "https://hiwe.com@evil.com/product", "https://admin:password@hiwe.com/product", "https://admin@hiwe.com/product",
    "https://hiwe.com:8443/product", "https://hiwe.com./product", "https://www.hiwe.com/has space",
    "https://www.hiwe.com/line\nbreak", "https://www.hiwe.com\\product", "https:///www.hiwe.com/product",
  ])("拒绝无效或非官网地址 %j", (value) => {
    expect(() => normalizeTonerWebsiteUrl(value)).toThrow();
  });
});
