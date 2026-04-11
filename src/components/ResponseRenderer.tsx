import { Fragment } from "react";

import { cn } from "@/lib/utils";
import {
  normalizeAnswerPayload,
  parseAnswerSegments,
  splitAnswerText,
  type AnswerPayloadLike,
  type AnswerSegment,
  type Citation,
} from "@/lib/triage-answer";

type ResponseRendererProps = {
  responseData?: AnswerPayloadLike;
  inline?: boolean;
  className?: string;
};

function renderSegments(
  segments: AnswerSegment[],
  keyPrefix: string
) {
  return segments.map((segment, index) => {
    if (segment.type === "text") {
      return (
        <Fragment key={`${keyPrefix}-text-${index}`}>
          {segment.text}
        </Fragment>
      );
    }

    if (!segment.href) {
      return (
        <span
          key={`${keyPrefix}-citation-${index}`}
          className="underline underline-offset-2"
        >
          {segment.label}
        </span>
      );
    }

    return (
      <a
        key={`${keyPrefix}-citation-${index}`}
        href={segment.href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 decoration-foreground/70 transition-colors hover:text-foreground hover:decoration-foreground"
      >
        {segment.label}
      </a>
    );
  });
}

function renderParagraphs(text: string, citations: Citation[]) {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => (
      <p
        key={`paragraph-${index}`}
        className="whitespace-pre-wrap leading-7"
      >
        {renderSegments(parseAnswerSegments(paragraph, citations), `paragraph-${index}`)}
      </p>
    ));
}

export default function ResponseRenderer({
  responseData,
  inline = false,
  className,
}: ResponseRendererProps) {
  const normalized = normalizeAnswerPayload(responseData);
  if (!normalized.answerText) return null;

  const { primaryRecommendation, primarySourceText, rationale } = splitAnswerText(
    normalized.answerText
  );
  const hasStructuredCitations = normalized.citations.length > 0;
  const shouldRepeatPrimaryInRationale =
    /\[C\d+\]/.test(primarySourceText);
  const bodyText = [
    shouldRepeatPrimaryInRationale ? primarySourceText : "",
    rationale,
  ]
    .filter(Boolean)
    .join("\n\n");
  const shouldShowLegacyLinks =
    !hasStructuredCitations && normalized.sourceLinks.length > 0;

  const content = (
    <div className={cn("space-y-3 text-sm text-foreground", className)}>
      <p className="text-[15px] font-semibold leading-6 text-foreground sm:text-base">
        {primaryRecommendation}
      </p>

      {bodyText ? (
        <div className="space-y-3 text-sm leading-7 text-foreground/80 sm:text-[15px]">
          {renderParagraphs(bodyText, normalized.citations)}
        </div>
      ) : null}

      {shouldShowLegacyLinks ? (
        <p className="text-xs leading-5 text-muted-foreground">
          Documents:{" "}
          {normalized.sourceLinks.map((sourceLink, index) => (
            <Fragment key={sourceLink.key}>
              {index > 0 ? ", " : null}
              {sourceLink.href ? (
                <a
                  href={sourceLink.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 decoration-muted-foreground/70 hover:text-foreground hover:decoration-foreground"
                >
                  {sourceLink.label}
                </a>
              ) : (
                <span>{sourceLink.label}</span>
              )}
            </Fragment>
          ))}
        </p>
      ) : null}
    </div>
  );

  if (inline) return content;

  return (
    <div className="mx-auto max-w-4xl p-8">
      {content}
    </div>
  );
}
