"use client";

import { useLang } from "@/components/LanguageContext";
import { LANGS, type Lang } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

// SVG 国旗图标
import GB from "country-flag-icons/react/3x2/GB";
import CN from "country-flag-icons/react/3x2/CN";
import FR from "country-flag-icons/react/3x2/FR";
import DE from "country-flag-icons/react/3x2/DE";
import ES from "country-flag-icons/react/3x2/ES";
import PT from "country-flag-icons/react/3x2/PT";
import IT from "country-flag-icons/react/3x2/IT";
import RU from "country-flag-icons/react/3x2/RU";
import SI from "country-flag-icons/react/3x2/SI";
import TR from "country-flag-icons/react/3x2/TR";
import IL from "country-flag-icons/react/3x2/IL";
import SA from "country-flag-icons/react/3x2/SA";

const FLAG_MAP: Record<string, React.FC<{ className?: string }>> = {
  GB, CN, FR, DE, ES, PT, IT, RU, SI, TR, IL, SA,
};

function FlagIcon({ code }: { code: string }) {
  const Flag = FLAG_MAP[code];
  if (!Flag) return null;
  return (
    <span className="inline-flex items-center justify-center leading-none">
      <Flag />
    </span>
  );
}

/* LanguageSwitcher — 样式与右侧按钮组严格统一 */
export default function LanguageSwitcher({
  transitionStyle,
}: {
  transitionStyle: string;
}) {
  const { lang, setLang } = useLang();

  return (
    <Select value={lang} onValueChange={(v) => setLang((v as Lang) || "en")}>
      <SelectTrigger
        className="h-8 w-auto min-w-0 gap-1.5 rounded-lg border border-border bg-transparent px-3 text-2xs font-medium header-action-btn"
        style={{ transition: transitionStyle }}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" side="bottom" sideOffset={8} alignItemWithTrigger={false} className="max-h-[300px] min-w-[200px] overflow-y-auto bg-popover text-popover-foreground rounded-lg shadow-md border border-border">
        {LANGS.map((l) => (
          <SelectItem key={l.code} value={l.code} className="gap-3 text-sm">
            <FlagIcon code={l.flag} />
            <span className="flex-1">{l.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
