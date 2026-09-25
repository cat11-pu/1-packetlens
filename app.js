// app.js：渲染（基线：把全部行塞进 DOM）
"use strict";

const { applyAll, offsetMap } = require("./codec.js");
const { parseFields } = require("./fieldparse.js");

function renderView(payload, view) {
  const bytes = applyAll(payload, view.steps);
  const fields = parseFields(bytes);
  const rows = [];
  for (let offset = 0; offset < bytes.length; offset += view.width) {
    const line = [];
    for (let i = offset; i < Math.min(offset + view.width, bytes.length); i += 1) {
      line.push(bytes[i].toString(16).padStart(2, "0"));
    }
    rows.push({ offset: offset, bytes: line });
  }
  return { rows: rows, fields: fields, map: offsetMap(view.steps, bytes.length) };
}

module.exports = { renderView };
