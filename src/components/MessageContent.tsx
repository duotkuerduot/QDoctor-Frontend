// src/components/MessageContent.tsx
"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CitationChip } from "./CitationChip";
import {
  ReferencesCard,
  parseReferences,
  type Reference,
} from "./ReferencesCard";

function splitReferences(content: string): {
  body: string;
  refSection: string | null;
} {
  const match = content.match(/\n?\*\*References\*\*\n?/i);
  if (!match || match.index === undefined)
    return { body: content, refSection: null };
  return {
    body: content.slice(0, match.index).trimEnd(),
    refSection: content.slice(match.index + match[0].length).trim() || null,
  };
}

function buildRefMap(refs: Reference[]): Record<string, Reference> {
  return Object.fromEntries(refs.map((r) => [r.abbr, r]));
}

function injectChips(
  text: string,
  refMap: Record<string, Reference>,
  getCounter: () => number,
): React.ReactNode {
  const abbrs = Object.keys(refMap);
  if (!abbrs.length) return text;

  const pattern = new RegExp(
    `(?<!\\[)(\\b(?:${abbrs
      .sort((a, b) => b.length - a.length)
      .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})\\b)(?!\\])`,
    "g",
  );

  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const abbr = match[1];
    const ref = refMap[abbr];
    if (!ref) continue;
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <CitationChip
        key={`chip-${abbr}-${match.index}`}
        citations={[ref]}
        startIndex={getCounter()}
      />,
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? <>{parts}</> : text;
}

function walkChildren(
  children: React.ReactNode,
  refMap: Record<string, Reference>,
  getCounter: () => number,
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      return injectChips(child, refMap, getCounter);
    }
    if (React.isValidElement(child)) {
      const el = child as React.ReactElement<{ children?: React.ReactNode }>;
      if (el.props.children) {
        return React.cloneElement(el, {
          children: walkChildren(el.props.children, refMap, getCounter),
        });
      }
    }
    return child;
  });
}

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
}

export function MessageContent({ content, isStreaming }: MessageContentProps) {
  const { body, refSection } = splitReferences(content);
  const references = refSection ? parseReferences(refSection) : [];
  const refMap = buildRefMap(references);
  const showRefsCard = !isStreaming && references.length > 0;

  let counter = 0;
  const getCounter = () => ++counter;

  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        className="prose prose-sm max-w-none dark:prose-invert"
        components={{
          // ── Numbered lists — indented with decimal numbering ──
          ol({ children }) {
            return (
              <ol
                style={{
                  paddingLeft: "1.5rem",
                  listStyleType: "decimal",
                  marginTop: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                {children}
              </ol>
            );
          },

          // ── Bullet lists — indented with disc bullets ─────────
          ul({ children }) {
            return (
              <ul
                style={{
                  paddingLeft: "1.5rem",
                  listStyleType: "disc",
                  marginTop: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                {children}
              </ul>
            );
          },

          // ── List items — walk children for plain-text chips ───
          li({ children }) {
            return (
              <li style={{ marginTop: "0.25rem", marginBottom: "0.25rem" }}>
                {walkChildren(children, refMap, getCounter)}
              </li>
            );
          },

          // ── Paragraphs — walk children for plain-text chips ───
          p({ children }) {
            return (
              <p>{walkChildren(children, refMap, getCounter)}</p>
            );
          },

          // ── cite:// links → orange chip ───────────────────────
          a({ href, children }) {
            if (href?.startsWith("cite://")) {
              if (String(children) === "View") return null;
              const [docId, page] = href.replace("cite://", "").split("#");
              const abbr = String(children);
              const ref: Reference = refMap[abbr] ?? {
                abbr,
                title: docId
                  .split("-")
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" "),
                journal: "",
                year: "",
                authors: "",
                tag: "",
                page: page ?? "N/A",
                docId,
              };
              return (
                <CitationChip citations={[ref]} startIndex={getCounter()} />
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {isStreaming ? content : body}
      </ReactMarkdown>

      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-primary/70 animate-pulse rounded-sm" />
      )}

      {showRefsCard && <ReferencesCard references={references} />}
    </>
  );
}