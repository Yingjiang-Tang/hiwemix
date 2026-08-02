"use client";

import { ReactNode } from "react";
import ThemeProvider from "@/components/ThemeProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
