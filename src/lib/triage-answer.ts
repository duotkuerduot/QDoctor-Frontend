const DEFAULT_BACKEND_BASE_URL =
  "https://duotkuerduot-qdoctor.hf.space";

const CITATION_MARKER_PATTERN = /(\[C\d+\])/g;
const SENTENCE_END_PATTERN = /[.!?]/;
const BULLET_PATTERN = /^(?:[-*•]|\d+[.)])\s+/;

export type Citation = {
  citation_id: string;
  marker: string;
  title: string;
  tier: string;
  chunk_id: string;
  page?: number;
  source_url?: string;
  pdf_path?: string;
  snippet?: string;
};

export type LegacySourceEntry = {
  title?: string;
  snippet?: string;
  page?: number;
  url?: string;
};

export type LegacySourceMap = Record<string, LegacySourceEntry>;
export type LegacySourcePayload = string[] | LegacySourceMap;

export type AnswerPayload = {
  answer_text?: string;
  citations?: Citation[];
  answer?: string;
  sources?: LegacySourcePayload;
};

export type AnswerPayloadLike = AnswerPayload & {
  content?: string;
};

export type AnswerSegment =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "citation";
      marker: string;
      label: "document";
      citation: Citation;
      href?: string;
    };

export type SplitAnswer = {
  primaryRecommendation: string;
  primarySourceText: string;
  rationale: string;
};

export type LegacySourceLink = {
  key: string;
  label: string;
  href?: string;
};

export type NormalizedAnswerPayload = {
  answerText: string;
  citations: Citation[];
  sourceLinks: LegacySourceLink[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function getBackendBaseUrl(backendBaseUrl?: string): string {
  return (
    backendBaseUrl ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    DEFAULT_BACKEND_BASE_URL
  );
}

function resolveUrl(
  rawUrl?: string,
  backendBaseUrl?: string
): string | undefined {
  const trimmed = asTrimmedString(rawUrl);
  if (!trimmed) return undefined;

  try {
    return new URL(trimmed).toString();
  } catch {
    try {
      return new URL(trimmed, getBackendBaseUrl(backendBaseUrl)).toString();
    } catch {
      return undefined;
    }
  }
}

function normalizeCitation(raw: unknown): Citation | null {
  if (!isRecord(raw)) return null;

  const citation_id = asTrimmedString(raw.citation_id);
  const marker = asTrimmedString(raw.marker);
  const title = asTrimmedString(raw.title);
  const tier = asTrimmedString(raw.tier);
  const chunk_id = asTrimmedString(raw.chunk_id);

  if (!citation_id || !marker || !title || !tier || !chunk_id) {
    return null;
  }

  return {
    citation_id,
    marker,
    title,
    tier,
    chunk_id,
    page: typeof raw.page === "number" ? raw.page : undefined,
    source_url: asTrimmedString(raw.source_url),
    pdf_path: asTrimmedString(raw.pdf_path),
    snippet: asTrimmedString(raw.snippet),
  };
}

function collapseSpacing(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function findFirstMeaningfulLine(lines: string[]): string | undefined {
  return lines.find((line) => line.trim());
}

function findSentenceEndIndex(paragraph: string): number {
  for (let index = 0; index < paragraph.length; index += 1) {
    const current = paragraph[index];
    if (!SENTENCE_END_PATTERN.test(current)) continue;

    const next = paragraph[index + 1];
    if (!next || /\s/.test(next)) {
      return index + 1;
    }
  }

  const newlineIndex = paragraph.indexOf("\n");
  return newlineIndex >= 0 ? newlineIndex : paragraph.length;
}

export function resolveCitationHref(
  citation: Pick<Citation, "source_url" | "pdf_path">,
  backendBaseUrl?: string
): string | undefined {
  const directUrl = resolveUrl(citation.source_url, backendBaseUrl);
  if (directUrl) return directUrl;

  return resolveUrl(citation.pdf_path, backendBaseUrl);
}

export function buildCitationMap(citations: Citation[]): Map<string, Citation> {
  return new Map(citations.map((citation) => [citation.marker, citation]));
}

export function stripCitationMarkers(text: string): string {
  return collapseSpacing(text.replace(CITATION_MARKER_PATTERN, " "));
}

export function splitAnswerText(answerText: string): SplitAnswer {
  const normalizedText = answerText.replace(/\r\n/g, "\n").trim();
  if (!normalizedText) {
    return {
      primaryRecommendation: "",
      primarySourceText: "",
      rationale: "",
    };
  }

  const paragraphs = normalizedText
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return {
      primaryRecommendation: "",
      primarySourceText: "",
      rationale: "",
    };
  }

  const [firstParagraph, ...remainingParagraphs] = paragraphs;
  const firstParagraphLines = firstParagraph
    .split("\n")
    .map((line) => line.trimEnd());
  const firstMeaningfulLine = findFirstMeaningfulLine(firstParagraphLines);

  let primaryRecommendation = "";
  let firstParagraphRemainder = "";

  if (firstMeaningfulLine && BULLET_PATTERN.test(firstMeaningfulLine.trim())) {
    primaryRecommendation = firstMeaningfulLine
      .trim()
      .replace(BULLET_PATTERN, "");

    const firstLineIndex = firstParagraphLines.findIndex(
      (line) => line === firstMeaningfulLine
    );
    firstParagraphRemainder = firstParagraphLines
      .slice(firstLineIndex + 1)
      .join("\n")
      .trim();
  } else {
    const sentenceEndIndex = findSentenceEndIndex(firstParagraph);
    primaryRecommendation = firstParagraph
      .slice(0, sentenceEndIndex)
      .trim();
    firstParagraphRemainder = firstParagraph
      .slice(sentenceEndIndex)
      .trim();
  }

  const cleanedPrimaryRecommendation = stripCitationMarkers(
    primaryRecommendation
  );
  const rationale = [firstParagraphRemainder, ...remainingParagraphs]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return {
    primaryRecommendation:
      cleanedPrimaryRecommendation || stripCitationMarkers(normalizedText),
    primarySourceText: primaryRecommendation,
    rationale,
  };
}

export function parseAnswerSegments(
  answerText: string,
  citations: Citation[],
  backendBaseUrl?: string
): AnswerSegment[] {
  if (!answerText) return [];

  const citationMap = buildCitationMap(citations);
  const parts = answerText.split(CITATION_MARKER_PATTERN);
  const segments: AnswerSegment[] = [];
  let previousWasCitation = false;

  for (const part of parts) {
    if (!part) continue;

    const citation = citationMap.get(part);
    if (!citation) {
      segments.push({ type: "text", text: part });
      previousWasCitation = false;
      continue;
    }

    if (previousWasCitation) {
      segments.push({ type: "text", text: " " });
    }

    segments.push({
      type: "citation",
      marker: part,
      label: "document",
      citation,
      href: resolveCitationHref(citation, backendBaseUrl),
    });
    previousWasCitation = true;
  }

  return segments;
}

export function normalizeLegacySourceLinks(
  sources?: LegacySourcePayload,
  backendBaseUrl?: string
): LegacySourceLink[] {
  if (!sources) return [];

  if (Array.isArray(sources)) {
    return sources
      .map((source) => asTrimmedString(source))
      .filter((source): source is string => Boolean(source))
      .map((source) => ({
        key: source,
        label: source.replace(/\.pdf$/i, ""),
      }));
  }

  return Object.entries(sources).map(([key, source]) => ({
    key,
    label: (source.title || key).replace(/\.pdf$/i, ""),
    href: resolveUrl(source.url, backendBaseUrl),
  }));
}

export function normalizeAnswerPayload(
  payload?: AnswerPayloadLike,
  backendBaseUrl?: string
): NormalizedAnswerPayload {
  const answerText =
    asTrimmedString(payload?.answer_text) ||
    asTrimmedString(payload?.content) ||
    asTrimmedString(payload?.answer) ||
    "";

  const citations = Array.isArray(payload?.citations)
    ? payload.citations
        .map((citation) => normalizeCitation(citation))
        .filter((citation): citation is Citation => Boolean(citation))
    : [];

  return {
    answerText,
    citations,
    sourceLinks: normalizeLegacySourceLinks(payload?.sources, backendBaseUrl),
  };
}
