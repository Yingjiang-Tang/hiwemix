"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

// 统一封装 react-markdown 渲染管线
// remark-gfm    — 支持 GFM 表格、任务列表、删除线
// rehype-raw    — 允许内联 HTML（用于复杂表格的 colspan/rowspan）
// rehype-slug   — 自动给 heading 加 id，支持锚点跳转
// rehype-autolink-headings — heading 自动生成可点击锚点
// rehype-sanitize — 必须放在 rehypeRaw 之后：允许 raw HTML 的同时剥除事件属性/危险标签（存储型 XSS 防线）
const SANITIZE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    table: [...(defaultSchema.attributes?.table ?? []), "colspan", "rowspan"],
    th: [...(defaultSchema.attributes?.th ?? []), "colspan", "rowspan"],
    td: [...(defaultSchema.attributes?.td ?? []), "colspan", "rowspan"],
  },
};

export default function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, SANITIZE_SCHEMA], rehypeSlug, rehypeAutolinkHeadings]}
    >
      {children}
    </ReactMarkdown>
  );
}