"use client";

import ReactMarkdown from "react-markdown";
import { palette } from "@/lib/themes";

interface MarkdownProps {
  content: string;
}

export default function Markdown({ content }: MarkdownProps) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="text-sm leading-relaxed mb-2 last:mb-0" style={{ color: palette.textPrimary }}>
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold" style={{ color: palette.textPrimary }}>
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em style={{ color: palette.textMuted }}>{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-0.5 text-sm" style={{ color: palette.textSecondary }}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-0.5 text-sm" style={{ color: palette.textSecondary }}>
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-sm" style={{ color: palette.textSecondary }}>
            {children}
          </li>
        ),
        h1: ({ children }) => (
          <h1 className="text-base font-bold mb-1" style={{ color: palette.textPrimary }}>
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-sm font-bold mb-1" style={{ color: palette.textPrimary }}>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mb-1" style={{ color: palette.textPrimary }}>
            {children}
          </h3>
        ),
        code: ({ children }) => (
          <code
            className="text-xs px-1 py-0.5 rounded font-mono"
            style={{ backgroundColor: palette.bgCardHover, color: palette.accentDark }}
          >
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre
            className="text-xs p-3 rounded-lg mb-2 overflow-x-auto font-mono"
            style={{ backgroundColor: palette.bgCardHover, color: palette.textSecondary }}
          >
            {children}
          </pre>
        ),
        hr: () => (
          <hr className="my-3" style={{ borderColor: palette.borderLight }} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
