import assert from "node:assert/strict";

import {
  normalizeAnswerPayload,
  parseAnswerSegments,
  splitAnswerText,
} from "./triage-answer.ts";

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("parseAnswerSegments replaces markers with citation links in order", () => {
  const segments = parseAnswerSegments(
    "Stabilize airway [C1] then reassess [C2].",
    [
      {
        citation_id: "cite_1",
        marker: "[C1]",
        title: "Airway Guideline",
        tier: "tier_1",
        chunk_id: "chunk-1",
        source_url: "https://example.org/airway.pdf#page=4",
      },
      {
        citation_id: "cite_2",
        marker: "[C2]",
        title: "Kenya Triage Manual",
        tier: "tier_1",
        chunk_id: "chunk-2",
        pdf_path: "/pdfs/triage.pdf#page=8",
      },
    ],
    "https://backend.example"
  );

  assert.deepEqual(
    segments.map((segment) =>
      segment.type === "text"
        ? { type: "text", text: segment.text }
        : {
            type: "citation",
            marker: segment.marker,
            label: segment.label,
            href: segment.href,
          }
    ),
    [
      { type: "text", text: "Stabilize airway " },
      {
        type: "citation",
        marker: "[C1]",
        label: "document",
        href: "https://example.org/airway.pdf#page=4",
      },
      { type: "text", text: " then reassess " },
      {
        type: "citation",
        marker: "[C2]",
        label: "document",
        href: "https://backend.example/pdfs/triage.pdf#page=8",
      },
      { type: "text", text: "." },
    ]
  );
});

runTest(
  "parseAnswerSegments preserves readable spacing for back-to-back citations",
  () => {
    const segments = parseAnswerSegments(
      "Escalate care [C1][C2]",
      [
        {
          citation_id: "cite_1",
          marker: "[C1]",
          title: "Doc 1",
          tier: "tier_1",
          chunk_id: "chunk-1",
          source_url: "https://example.org/doc-1.pdf",
        },
        {
          citation_id: "cite_2",
          marker: "[C2]",
          title: "Doc 2",
          tier: "tier_1",
          chunk_id: "chunk-2",
          source_url: "https://example.org/doc-2.pdf",
        },
      ]
    );

    assert.deepEqual(
      segments.map((segment) =>
        segment.type === "text" ? segment.text : segment.label
      ),
      ["Escalate care ", "document", " ", "document"]
    );
  }
);

runTest("parseAnswerSegments leaves unmatched markers as plain text", () => {
  const segments = parseAnswerSegments("Observe [C1] [C2]", [
    {
      citation_id: "cite_1",
      marker: "[C1]",
      title: "Doc 1",
      tier: "tier_1",
      chunk_id: "chunk-1",
      source_url: "https://example.org/doc-1.pdf",
    },
  ]);

  assert.deepEqual(
    segments.map((segment) =>
      segment.type === "text"
        ? { type: "text", text: segment.text }
        : { type: "citation", marker: segment.marker, label: segment.label }
    ),
    [
      { type: "text", text: "Observe " },
      { type: "citation", marker: "[C1]", label: "document" },
      { type: "text", text: " " },
      { type: "text", text: "[C2]" },
    ]
  );
});

runTest(
  "splitAnswerText extracts a clean primary recommendation and preserves cited rationale",
  () => {
    const split = splitAnswerText(
      "Start IV fluids immediately [C1]. Monitor urine output closely [C2]."
    );

    assert.equal(split.primaryRecommendation, "Start IV fluids immediately.");
    assert.equal(
      split.primarySourceText,
      "Start IV fluids immediately [C1]."
    );
    assert.equal(split.rationale, "Monitor urine output closely [C2].");
  }
);

runTest("splitAnswerText derives the primary recommendation from the first bullet", () => {
  const split = splitAnswerText(
    "- Administer oral rehydration salts [C1]\n- Check capillary refill"
  );

  assert.equal(
    split.primaryRecommendation,
    "Administer oral rehydration salts"
  );
  assert.equal(split.rationale, "- Check capillary refill");
});

runTest("normalizeAnswerPayload keeps legacy answer and sources usable", () => {
  const normalized = normalizeAnswerPayload(
    {
      answer: "Legacy recommendation",
      sources: {
        "Kenya Policy.pdf": {
          title: "Kenya Policy.pdf",
          url: "/pdfs/kenya-policy.pdf#page=12",
        },
      },
    },
    "https://backend.example"
  );

  assert.equal(normalized.answerText, "Legacy recommendation");
  assert.deepEqual(normalized.citations, []);
  assert.deepEqual(normalized.sourceLinks, [
    {
      key: "Kenya Policy.pdf",
      label: "Kenya Policy",
      href: "https://backend.example/pdfs/kenya-policy.pdf#page=12",
    },
  ]);
});
