// src/components/ReferencesCard.tsx
"use client";

export interface Reference {
  abbr: string;
  title: string;
  journal: string;
  year: string;
  authors: string;
  tag: string;
  page: string;
  docId: string;
}

export function parseReferences(refSection: string): Reference[] {
  const lines = refSection.split("\n").filter((l) => l.trim());
  const results: Reference[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^\*\*References\*\*$/i.test(trimmed)) continue;

    // Matches EXACTLY the system prompt format:
    // - **[KMHP]** Kenya Mental Health Policy, p. 34 — [View](cite://kenya-mental-health-policy#34)
    const match = trimmed.match(
      /^-?\s*\*\*\[([A-Z0-9]+)\]\*\*\s+(.+?),\s*p\.\s*(\d+|N\/A)\s*[—-]+\s*\[.*?\]\(cite:\/\/([^#)]+)#?(\d+)?\)/
    );

    if (match) {
      results.push({
        abbr:    match[1],           // KMHP
        title:   match[2].trim(),    // Kenya Mental Health Policy
        journal: "",
        year:    "",
        authors: "",
        tag:     "",
        page:    match[3],           // 34
        docId:   match[4],           // kenya-mental-health-policy
      });
      continue;
    }

    // Fallback: **[ABBR]** Title, p. PAGE  (no cite link)
    const fallback = trimmed.match(
      /^-?\s*\*\*\[([A-Z0-9]+)\]\*\*\s+(.+?)(?:,\s*p\.\s*(\d+|N\/A))?\.?\s*$/
    );
    if (fallback) {
      results.push({
        abbr:    fallback[1],
        title:   fallback[2].trim(),
        journal: "",
        year:    "",
        authors: "",
        tag:     "",
        page:    fallback[3] ?? "N/A",
        docId:   fallback[2].trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      });
    }
  }

  return results;
}

export function ReferencesCard({ references }: { references: Reference[] }) {
  if (!references.length) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        References
      </p>
      <ol className="space-y-1 list-none p-0 m-0">
        {references.map((ref, i) => (
          <li key={i} className="flex items-baseline gap-2 text-sm">
            {/* Number */}
            <span className="text-muted-foreground flex-shrink-0 tabular-nums">
              {i + 1}.
            </span>

            {/* Full title as clickable orange link */}
            <span
              className="text-orange-500 hover:underline cursor-pointer"
              onClick={() => {
                // Fire your document viewer here
                // e.g. openDocumentViewer(ref.docId, ref.page)
                console.log("Open doc:", ref.docId, "p.", ref.page);
              }}
            >
              {ref.title}
            </span>

            {/* Page hint */}
            {ref.page && ref.page !== "N/A" && (
              <span className="text-muted-foreground text-xs flex-shrink-0">
                p. {ref.page}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
