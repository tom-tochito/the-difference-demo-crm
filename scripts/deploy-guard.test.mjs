import { test } from "node:test";
import assert from "node:assert/strict";
import { verifiedLegacyIndexHeaders } from "./legacy-index-guard.mjs";
test("allows only the named index group after migration verification", () => {
  assert.deepEqual(
    [
      ...verifiedLegacyIndexHeaders(
        [
          "✔ Would delete table indexes:",
          "  [-] records.search_text (text)  searchText",
          "  [-] tasks.by_done_and_dueAt done, dueAt",
        ],
        () => true,
      ),
    ],
    [0],
  );
});
test("refuses legacy index removal when retirement is not verified", () => {
  assert.throws(
    () =>
      verifiedLegacyIndexHeaders(
        [
          "✔ Deleted table indexes:",
          "  [-] records.search_text (text) searchText",
        ],
        () => false,
      ),
    /completed backup-verified/,
  );
});
test("never exempts freight indexes, table deletions or unknown groups", () => {
  let called = false;
  assert.deepEqual(
    [
      ...verifiedLegacyIndexHeaders(
        [
          "✔ Deleted table indexes:",
          "  [-] shippingShipments.by_reference reference",
          "Deleted table records",
        ],
        () => {
          called = true;
          return true;
        },
      ),
    ],
    [],
  );
  assert.equal(called, false);
  assert.deepEqual(
    [...verifiedLegacyIndexHeaders(["Deleted table records"], () => true)],
    [],
  );
});
