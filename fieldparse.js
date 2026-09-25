// fieldparse.js：长度前缀字段解析（基线：只解第一个字段，越界不报）
"use strict";

function parseFields(bytes) {
  // 字段布局：tag(1) + len(2 大端) + payload(len)
  const out = [];
  if (bytes.length < 3) return out;
  const tag = bytes[0];
  const len = (bytes[1] << 8) | bytes[2];
  const payload = bytes.slice(3, 3 + len);
  out.push({ tag: tag, length: len, from: 0, to: 3 + payload.length, nested: [] });
  return out;
}

function locate(bytes, fieldIndex) {
  // 基线：不定位错误，永远返回 null
  return null;
}

module.exports = { parseFields, locate };
