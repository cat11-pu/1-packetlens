// check_sample.js：跑 sample/packet.json，打印验收面
"use strict";
const fs = require("fs");
const { applyAll, offsetMap, budget } = require("./codec.js");
const { parseFields, locate } = require("./fieldparse.js");
const { renderView } = require("./app.js");

const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/packet.json", "utf8"));
const bytes = Buffer.from(spec.hex, "hex");
const viewPayload = bytes.toJSON().data;

const transformed = applyAll(viewPayload, spec.steps);
const map = offsetMap(spec.steps, transformed.length);
const fields = parseFields(transformed);
const view = renderView(viewPayload, { steps: spec.steps, width: spec.width });
const located = locate(viewPayload, spec.bad_field);
const cost = budget(spec.steps, viewPayload.length);

console.log("变换后字节数 =", transformed.length);
console.log("偏移映射（变换后 → 原始） =", JSON.stringify(map));
console.log("解析出的字段 =", JSON.stringify(fields.map((f) => [f.tag, f.length, f.from, f.to])));
console.log("嵌套字段数 =", fields.reduce((acc, f) => acc + f.nested.length, 0));
console.log("截断报错的偏移 =", located && located.offset);
console.log("截断报错的原因 =", located && located.reason);
console.log("视口渲染的行数 =", view.rows.length);
console.log("预算（访问字节数） =", cost.visited);
console.log("预算上限 =", cost.limit);
console.log("不变量（字段区间互不重叠且有序） =", spec.field_invariant);
