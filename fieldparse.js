// fieldparse.js：长度前缀字段解析（连续解析 + 一层嵌套 + 越界定位）
"use strict";
(function (global) {

// 字段布局：tag(1) + len(2 大端) + payload(len)
const HEAD = 3;

function readField(bytes, offset) {
  const tag = bytes[offset];
  const len = (bytes[offset + 1] << 8) | bytes[offset + 2];
  const from = offset;
  const to = offset + HEAD + len;
  return { tag: tag, length: len, from: from, to: to };
}

function parseRegion(bytes, limitOffset) {
  const out = [];
  let offset = 0;
  while (offset + HEAD <= limitOffset) {
    const field = readField(bytes, offset);
    if (field.to > limitOffset) break; // 越界或长度不足：立即停止
    field.nested = (field.tag & 0x80)
      ? parseRegion(bytes.slice(offset + HEAD, field.to), field.length)
      : [];
    out.push(field);
    offset = field.to;
  }
  return out;
}

function parseFields(bytes) {
  return parseRegion(bytes, bytes.length);
}

// locate：字段必须“完整且其后还放得下一个后继字段头（3 字节）”，
// 否则该字段即截断字段，报 length_out_of_range。
function locate(bytes, fieldIndex) {
  let offset = 0;
  let index = 0;
  while (offset + HEAD <= bytes.length) {
    const field = readField(bytes, offset);
    if (field.to > bytes.length || field.to + HEAD > bytes.length) {
      return index === fieldIndex
        ? { offset: offset, reason: "length_out_of_range" }
        : null;
    }
    if (index === fieldIndex) return null; // 该字段完整，非截断字段
    offset = field.to;
    index += 1;
  }
  if (index === fieldIndex) return { offset: offset, reason: "length_out_of_range" };
  return null;
}

// 不变量：字段区间互不重叠且按偏移严格升序
function checkInvariant(fields) {
  for (let i = 1; i < fields.length; i += 1) {
    if (fields[i].from <= fields[i - 1].from) return false;
    if (fields[i].from < fields[i - 1].to) return false;
  }
  return true;
}

const api = { parseFields, locate, checkInvariant };
if (typeof module !== "undefined" && module.exports) module.exports = api;
if (typeof globalThis !== "undefined") globalThis.fieldparse = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
