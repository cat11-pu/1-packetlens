// app.js：渲染（只物化可见视口的行，返回 rows/fields/map，结构不变）
"use strict";

const codec = (typeof module !== "undefined" && module.exports) ? require("./codec.js") : window.codec;
const fieldparse = (typeof module !== "undefined" && module.exports) ? require("./fieldparse.js") : window.fieldparse;

// view: { steps, width, scroll?, height? }
//   scroll 起始行（默认 0），height 视口高度（行数，缺省渲染全部）
function renderView(payload, view) {
  const steps = view.steps || [];
  const bytes = codec.applyAll(payload, steps);
  const fields = fieldparse.parseFields(bytes);
  const width = view.width;
  const totalRows = Math.ceil(bytes.length / width);
  const firstRow = Math.max(0, Math.min(view.scroll || 0, totalRows));
  const height = view.height == null ? totalRows : Math.max(0, view.height);
  const lastRow = Math.min(firstRow + height, totalRows);

  const rows = [];
  for (let row = firstRow; row < lastRow; row += 1) {
    const offset = row * width;
    const line = [];
    for (let i = offset; i < Math.min(offset + width, bytes.length); i += 1) {
      line.push(bytes[i].toString(16).padStart(2, "0"));
    }
    rows.push({ offset: offset, bytes: line });
  }

  // 当前视口字节区间内的字段切片
  const viewFrom = firstRow * width;
  const viewTo = Math.min(bytes.length, lastRow * width);
  const visible = fields.filter((f) => f.from < viewTo && f.to > viewFrom);

  return { rows: rows, fields: visible, map: codec.offsetMap(steps, bytes.length) };
}

const appApi = { renderView };
if (typeof module !== "undefined" && module.exports) module.exports = appApi;
if (typeof window !== "undefined") window.app = appApi;
