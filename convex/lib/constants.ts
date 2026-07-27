// The demo dataset is anchored to the 2025/26 financial year, matching
// the prototype site ("Prototype · May 2025").
export const CURRENT_FY = "25/26";

export const ENTITY_KEYS = {
  contact: "contact",
  organisation: "organisation",
  gift: "gift",
  pipeline: "pipeline",
  deadline: "deadline",
} as const;

export const CLOSED_PIPELINE_STAGES = [
  "Successful",
  "Unsuccessful",
  "Stewarding",
];

export const DAY_MS = 24 * 60 * 60 * 1000;
