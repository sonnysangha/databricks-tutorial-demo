import test from "node:test";
import assert from "node:assert/strict";
import {
  groups,
  distinctReporters,
  needsReview,
  filterRows,
  parseFilters,
  filterUrl,
  issueKey,
} from "../lib/feedback-model.ts";
const base = {
  source: "support",
  feedback_id: "1",
  user_id: "alice",
  message_text: "Payment fails",
  timestamp: "2026-09-10T23:59:00.000Z",
  rating: null,
  category: "BUG_REPORT",
  sentiment: "negative",
  confidence_score: 0.8,
  explanation: "Payment error",
  uncertain_classification: false,
  issue_type: "Checkout",
  issue_cat: "BUG",
};
test("count repeat messages separately from source-qualified user IDs", () => {
  const rows = [
    base,
    { ...base, feedback_id: "2" },
    { ...base, source: "google_play" },
    { ...base, user_id: null, feedback_id: "3" },
  ];
  assert.equal(distinctReporters(rows), 2);
  assert.deepEqual(groups(rows)[0], {
    key: issueKey("BUG", "Checkout"),
    name: "Checkout",
    category: "BUG",
    messages: 4,
    reporters: 2,
    repeatedReporters: 1,
    review: 0,
  });
});
test("review includes inconsistent flags and incomplete analysis", () => {
  assert.equal(needsReview(base), false);
  assert.equal(needsReview({ ...base, confidence_score: 0.69 }), true);
  assert.equal(needsReview({ ...base, confidence_score: null }), true);
  assert.equal(needsReview({ ...base, explanation: " " }), true);
  assert.equal(needsReview({ ...base, uncertain_classification: true }), true);
});
test("issue, source, date and search filters compose and include end day", () => {
  const f = parseFilters({
    issue: issueKey("BUG", "Checkout"),
    source: "support",
    from: "2026-09-10",
    to: "2026-09-10",
    q: "payment",
  });
  assert.equal(
    filterRows(
      [
        base,
        { ...base, source: "in_app" },
        { ...base, timestamp: "2026-09-11T00:00:00.000Z" },
        { ...base, issue_type: "Login" },
      ],
      f,
    ).length,
    1,
  );
  assert.equal(filterRows([base], { ...f, issue: "unknown" }).length, 0);
});
test("navigation preserves filters but resets pagination for a new issue", () => {
  const f = parseFilters({
    source: "support",
    review: "1",
    page: "3",
    q: "a & b",
  });
  const url = new URL(filterUrl(f, { issue: "checkout" }), "http://localhost");
  assert.equal(url.searchParams.get("source"), "support");
  assert.equal(url.searchParams.get("review"), "1");
  assert.equal(url.searchParams.get("q"), "a & b");
  assert.equal(url.searchParams.has("page"), false);
});
