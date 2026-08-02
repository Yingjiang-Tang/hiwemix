import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface SpinnerProps {
  className?: string
}

// 统一加载指示器：转圈图标，加载时只显示圈圈
function Spinner({ className }: SpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <Loader2 aria-hidden="true" className={cn("size-5 animate-spin", className)} />
      <span className="sr-only">加载中</span>
    </span>
  )
}

export { Spinner }
