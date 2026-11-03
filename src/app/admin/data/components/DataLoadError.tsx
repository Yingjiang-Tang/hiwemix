import { Button } from "@/components/ui/button";

export default function DataLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex items-center gap-3 py-6 text-sm text-destructive">
      数据加载失败，请重试
      <Button variant="outline" onClick={onRetry} className="max-md:min-h-11">重新加载</Button>
    </div>
  );
}
