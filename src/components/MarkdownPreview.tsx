"use client";

import Markdown from "./Markdown";

// Admin 编辑器右侧预览：使用 typography 样式 + 紧凑尺寸
export default function MarkdownPreview({
  source,
  className = "",
}: {
  source: string;
  className?: string;
}) {
  if (!source.trim()) {
    return (
      <div className={`prose prose-sm dark:prose-invert max-w-none text-muted-foreground ${className}`}>
        <p>左侧编辑 Markdown，右侧实时预览</p>
      </div>
    );
  }
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <Markdown>{source}</Markdown>
    </div>
  );
}