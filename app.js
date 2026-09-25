// app.js：视口渲染（只物化可见行，返回视口内字段切片；rows/fields/map 结构不变）
"use strict";
(function (global) {

const codec = typeof require === "function"
  ? require("./codec.js")
  : globalThis.codec;
const fieldparse = typeof require === "function"
  ? require("./fieldparse.js")
  : globalThis.fieldparse;

const { applyAll, offsetMap } = codec;
const { parseFields } = fieldparse;

function renderView(payload, view) {
  const bytes = applyAll(payload, view.steps);
  const width = view.width;
  const totalRows = Math.ceil(bytes.length / width);
  const top = view.top || 0;
  // 视口高度默认覆盖全部行（老调用方不传 height 时行为不变）
  const height = view.height === undefined ? totalRows : view.height;

  const startRow = Math.max(0, Math.min(top, totalRows));
  const rowCount = Math.max(0, Math.min(height, totalRows - startRow));
  const viewFrom = startRow * width;
  const viewTo = Math.min((startRow + rowCount) * width, bytes.length);

  const rows = [];
  for (let row = 0; row < rowCount; row += 1) {
    const offset = viewFrom + row * width;
    const line = [];
    for (let i = offset; i < Math.min(offset + width, viewTo); i += 1) {
      line.push(bytes[i].toString(16).padStart(2, "0"));
    }
    rows.push({ offset: offset, bytes: line });
  }

  const fields = parseFields(bytes).filter(
    (field) => field.from < viewTo && field.to > viewFrom
  );
  const map = offsetMap(view.steps, bytes.length);
  return { rows: rows, fields: fields, map: map };
}

const api = { renderView: renderView };
if (typeof module !== "undefined" && module.exports) module.exports = api;
if (typeof globalThis !== "undefined") globalThis.app = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
