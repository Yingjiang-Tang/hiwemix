import { describe, expect, test } from "vitest";
import { formatYearEntry, yearEntryContains } from "@/lib/formula-utils";

describe("yearEntryContains", () => {
  test("单年只匹配相同年份", () => {
    expect(yearEntryContains({ year: 2020 }, 2020)).toBe(true);
    expect(yearEntryContains({ year: 2020 }, 2021)).toBe(false);
  });

  test("年份区间包含起止边界", () => {
    const entry = { year: 2018, year_end: 2022 };

    expect(yearEntryContains(entry, 2018)).toBe(true);
    expect(yearEntryContains(entry, 2022)).toBe(true);
    expect(yearEntryContains(entry, 2023)).toBe(false);
  });
});

describe("formatYearEntry", () => {
  test("按单年或区间格式化", () => {
    expect(formatYearEntry({ year: 2020 })).toBe("2020");
    expect(formatYearEntry({ year: 2018, year_end: 2022 })).toBe("2018-2022");
  });
});
