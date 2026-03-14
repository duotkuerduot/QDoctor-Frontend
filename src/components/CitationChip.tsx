// src/components/CitationChip.tsx
"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import type { Reference } from "./ReferencesCard";

interface CitationChipProps {
  citations: Reference[];
  startIndex: number;
}

function SourceBadge({ abbr }: { abbr: string }) {
  const colors: Record<string, string> = {
    KMHP: "bg-orange-500",
    DSM5: "bg-purple-600",
    WHO:  "bg-blue-500",
    NICE: "bg-blue-700",
    JAMA: "bg-red-500",
    NEJM: "bg-blue-600",
    BMJ:  "bg-green-600",
  };
  const bg = colors[abbr] ?? "bg-orange-500";
  return (
    <span
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[8px] font-black flex-shrink-0 ${bg}`}
    >
      {abbr.slice(0, 2)}
    </span>
  );
}

export function CitationChip({ citations, startIndex }: CitationChipProps) {
  const [open, setOpen] = useState(false);
  const chipRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: true });
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const primary = citations[0];
  const extra = citations.length - 1;

  const updatePos = () => {
    if (!chipRef.current) return;
    const rect = chipRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceAbove > 280 || spaceAbove > spaceBelow;
    setPos({
      top: openUp
        ? rect.top + window.scrollY - 8
        : rect.bottom + window.scrollY + 8,
      left: Math.min(
        rect.left + window.scrollX,
        window.innerWidth - 320 - 16
      ),
      openUp,
    });
  };

  // ── Hover handlers with delay so mouse can travel to popover ──
  const handleMouseEnterChip = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => {
      updatePos();
      setOpen(true);
    }, 120); // small delay prevents flicker on quick mouse-overs
  };

  const handleMouseLeaveChip = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    // Give user time to move mouse to the popover before closing
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  };

  const handleMouseEnterPopover = () => {
    // Cancel the close timer when mouse enters popover
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const handleMouseLeavePopover = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  };

  return (
    <>
      {/* ── Inline chip ───────────────────────────────────────── */}
      <span
        ref={chipRef}
        onMouseEnter={handleMouseEnterChip}
        onMouseLeave={handleMouseLeaveChip}
        className="inline-flex items-center gap-1 mx-0.5 px-1 py-0.5 rounded-full border border-orange-200 bg-orange-50 hover:bg-orange-100 cursor-pointer transition-colors align-baseline select-none dark:border-orange-900 dark:bg-orange-950/40 dark:hover:bg-orange-900/40"
      >
        <SourceBadge abbr={primary.abbr} />
        <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 leading-none">
          {primary.abbr}
        </span>
        {extra > 0 && (
          <span className="text-[11px] text-orange-400 dark:text-orange-500 leading-none">
            +{extra}
          </span>
        )}
      </span>

      {/* ── Popover (portaled to body) ────────────────────────── */}
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            onMouseEnter={handleMouseEnterPopover}
            onMouseLeave={handleMouseLeavePopover}
            style={{
              position: "absolute",
              top: pos.top,
              left: pos.left,
              transform: pos.openUp ? "translateY(-100%)" : "translateY(0)",
              zIndex: 9999,
              width: 320,
            }}
            className="rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground">
                {citations.length} Reference{citations.length > 1 ? "s" : ""}
              </span>
              {citations.length > 2 && (
                <button className="text-xs font-medium text-orange-500 hover:underline">
                  See All ({citations.length})
                </button>
              )}
            </div>

            {/* Reference cards */}
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {citations.map((ref, i) => (
                <div
                  key={i}
                  className="px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  {/* Number + Title */}
                  <p className="text-sm leading-snug">
                    <span className="text-muted-foreground text-xs mr-1.5 font-medium">
                      {startIndex + i}.
                    </span>
                    <span className="font-semibold text-orange-500 hover:underline cursor-pointer">
                      {ref.title.length > 80
                        ? `${ref.title.slice(0, 80)}…`
                        : ref.title}
                    </span>
                  </p>

                  {/* Journal row */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <SourceBadge abbr={ref.abbr} />
                    {ref.journal && (
                      <span className="text-xs text-muted-foreground">
                        {ref.journal}
                        {ref.year ? `. ${ref.year}` : ""}.
                      </span>
                    )}
                    {ref.authors && (
                      <span className="text-xs text-muted-foreground">
                        {ref.authors.length > 40
                          ? `${ref.authors.slice(0, 40)}…`
                          : ref.authors}
                      </span>
                    )}
                  </div>

                  {/* Tag + page row */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {ref.tag && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900">
                        {ref.tag}
                      </span>
                    )}
                    {ref.page && ref.page !== "N/A" && (
                      <span className="text-[11px] text-muted-foreground">
                        p. {ref.page}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}