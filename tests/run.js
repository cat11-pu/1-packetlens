// tests/run.js：基线用例 + 迭代用例
"use strict";
const assert = require("assert");
const { applyAll, offsetMap, budget } = require("../codec.js");
const { parseFields, locate, checkInvariant } = require("../fieldparse.js");
const { renderView } = require("../app.js");

let failed = 0;
let total = 0;
function check(name, fn) {
  total += 1;
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

// ---- 迭代用例 ----

check("delta decodes running-difference bytes", () => {
  // next[i] = curr[i] - curr[i-1] (mod 256)
  assert.deepStrictEqual(applyAll([10, 13, 7, 14], [{ op: "delta" }]), [10, 3, 250, 7]);
});

check("chained slice+xor+delta", () => {
  const bytes = [0, 10, 20, 21, 201, 0];
  const steps = [{ op: "slice", from: 1, to: 5 }, { op: "xor", key: 1 }, { op: "delta" }];
  const out = applyAll(bytes, steps);
  // slice -> [10,20,21,201]; xor1 -> [11,21,20,200]; delta -> [11,10,255,180]
  assert.deepStrictEqual(out, [11, 10, 255, 180]);
});

check("offsetMap identity without slice", () => {
  assert.deepStrictEqual(offsetMap([{ op: "xor", key: 7 }, { op: "delta" }], 5), [0, 1, 2, 3, 4]);
});

check("offsetMap passes through slice offset", () => {
  const steps = [{ op: "slice", from: 3, to: 7 }, { op: "xor", key: 1 }, { op: "delta" }];
  assert.deepStrictEqual(offsetMap(steps, 4), [3, 4, 5, 6]);
});

check("offsetMap composes multiple slices in reverse", () => {
  const steps = [{ op: "slice", from: 0, to: 10 }, { op: "slice", from: 2, to: 6 }];
  assert.deepStrictEqual(offsetMap(steps, 4), [2, 3, 4, 5]);
});

check("parse multiple fields until truncation", () => {
  // 完整字段 [tag=1,len=1,p=aa] + 截断字段头 [tag=2,len=9]（payload 不足）
  const fields = parseFields([0x01, 0x00, 0x01, 0xaa, 0x02, 0x00, 0x09]);
  assert.strictEqual(fields.length, 1);
  assert.deepStrictEqual(fields[0], { tag: 1, length: 1, from: 0, to: 4, nested: [] });
});

check("nested field parsed one level when tag high bit set", () => {
  // 外层 tag=0x81 len=7 payload: 02 00 01 bb 00 ff（内层字段 + 2 字节余量）
  const bytes = [0x81, 0x00, 0x07, 0x02, 0x00, 0x01, 0xbb, 0x00, 0xff, 0x99];
  const fields = parseFields(bytes);
  assert.strictEqual(fields.length, 1);
  assert.strictEqual(fields[0].nested.length, 1);
  const inner = fields[0].nested[0];
  assert.deepStrictEqual([inner.tag, inner.length, inner.from, inner.to], [0x02, 1, 0, 4]);
  // 内层 tag 高位为 0，不再继续嵌套
  assert.deepStrictEqual(inner.nested, []);
});

check("locate reports original offset and reason", () => {
  const bytes = [0x01, 0x00, 0x01, 0xaa, 0x02, 0x00, 0x09];
  assert.deepStrictEqual(locate(bytes, 0), null);
  assert.deepStrictEqual(locate(bytes, 1), { offset: 4, reason: "length_out_of_range" });
});

check("locate flags field flush at buffer end as truncated", () => {
  // 9 字节：第二个字段恰好填满末尾，后继无空间 -> 截断，偏移 5
  const bytes = Buffer.from("100002aabb100001cc", "hex").toJSON().data;
  assert.deepStrictEqual(locate(bytes, 1), { offset: 5, reason: "length_out_of_range" });
});

check("viewport renders only visible rows and slices fields", () => {
  // 16 字节，宽 4 => 4 行；字段 [0,5) 与 [5,9)
  const payload = Buffer.from("100002aabb100001ccdddddd", "hex").toJSON().data;
  const view = renderView(payload, { steps: [], width: 4, top: 1, height: 2 });
  assert.strictEqual(view.rows.length, 2);
  assert.deepStrictEqual(view.rows.map((r) => r.offset), [4, 8]);
  assert.deepStrictEqual(view.fields.map((f) => f.from), [0, 5]);
  // 返回结构三键不变
  assert.deepStrictEqual(Object.keys(view).sort(), ["fields", "map", "rows"]);
});

check("budget stays tiny for 1e5 bytes with slice window", () => {
  const steps = [{ op: "slice", from: 0, to: 8 }];
  const cost = budget(steps, 100000);
  assert.strictEqual(cost.limit, 32);
  assert.ok(cost.visited <= cost.limit, "visited must fit budget");
  assert.ok(cost.visited < 100000, "must not visit full buffer");
});

check("field invariant holds for parsed fields", () => {
  const bytes = [0x01, 0x00, 0x01, 0xaa, 0x02, 0x00, 0x02, 0xbb, 0xcc];
  assert.ok(checkInvariant(parseFields(bytes)));
});

console.log(total + " cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
