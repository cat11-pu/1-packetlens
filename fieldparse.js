// fieldparse.js：长度前缀字段解析（tag(1) + len(2 大端) + payload(len)，嵌套一层）
"use strict";

const HEADER_LEN = 3;
const NESTED_FLAG = 0x80; // tag 高位为 1：payload 内还有一层字段

// 顺序解析 [start, end) 区间；越界或长度不足立即停止。
// 产出的字段区间天然互不重叠且按偏移升序（field_invariant）。
function parseLevel(bytes, start, end, allowNested) {
  const fields = [];
  let offset = start;
  while (offset + HEADER_LEN <= end) {
    const tag = bytes[offset];
    const len = (bytes[offset + 1] << 8) | bytes[offset + 2];
    const to = offset + HEADER_LEN + len;
    if (to > end) break;
    const field = { tag: tag, length: len, from: offset, to: to, nested: [] };
    if (allowNested && (tag & NESTED_FLAG) !== 0) {
      field.nested = parseLevel(bytes, offset + HEADER_LEN, to, false); // 只再解一层
    }
    fields.push(field);
    offset = to;
  }
  return fields;
}

function parseFields(bytes) {
  return parseLevel(bytes, 0, bytes.length, true);
}

// 定位第 fieldIndex 个字段的越界问题：字段不存在（解析中途停止），
// 或字段一路顶到缓冲末尾、无法确认是否被截断，都报 length_out_of_range。
function locate(bytes, fieldIndex) {
  const fields = parseFields(bytes);
  if (fieldIndex < fields.length) {
    const field = fields[fieldIndex];
    if (field.to >= bytes.length) {
      return { offset: field.from, reason: "length_out_of_range" };
    }
    return null;
  }
  const last = fields[fields.length - 1];
  return { offset: last ? last.to : 0, reason: "length_out_of_range" };
}

const fieldparseApi = { parseFields, locate };
if (typeof module !== "undefined" && module.exports) module.exports = fieldparseApi;
if (typeof window !== "undefined") window.fieldparse = fieldparseApi;
