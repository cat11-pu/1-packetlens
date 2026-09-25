// tests/run.js：基线用例
"use strict";
const assert = require("assert");
const { applyAll } = require("../codec.js");
const { parseFields } = require("../fieldparse.js");
const { renderView } = require("../app.js");

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok   " + name); } catch (error) { failed += 1; console.log("FAIL " + name + " :: " + error.message); }
}

check("identity transform keeps bytes", () => {
  assert.deepStrictEqual(applyAll([1, 2, 3], []), [1, 2, 3]);
});

check("slice keeps window", () => {
  assert.deepStrictEqual(applyAll([1, 2, 3, 4], [{ op: "slice", from: 1, to: 3 }]), [2, 3]);
});

check("xor flips bytes", () => {
  assert.deepStrictEqual(applyAll([0, 255], [{ op: "xor", key: 255 }]), [255, 0]);
});

check("parse first field", () => {
  const fields = parseFields([0x10, 0x00, 0x02, 0xaa, 0xbb]);
  assert.strictEqual(fields.length, 1);
  assert.strictEqual(fields[0].length, 2);
});

check("render produces rows", () => {
  const view = renderView([1, 2, 3, 4], { steps: [], width: 2 });
  assert.strictEqual(view.rows.length, 2);
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
