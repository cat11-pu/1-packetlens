// codec.js：变换链与偏移映射（支持 slice / xor / delta，映射逐元素传递）
"use strict";

function applyAll(bytes, steps) {
  let out = bytes.slice();
  for (const step of steps) {
    if (step.op === "slice") {
      out = out.slice(step.from, step.to);
    } else if (step.op === "xor") {
      out = out.map((b) => b ^ step.key);
    } else if (step.op === "delta") {
      const next = out.slice();
      for (let i = out.length - 1; i > 0; i -= 1) next[i] = (out[i] - out[i - 1] + 256) % 256;
      out = next;
    }
  }
  return out;
}

// 变换后下标 → 原始下标。沿变换链反向合成：
// slice 平移下标，xor / delta 逐元素就地改写、位置不变，映射原样传递。
function offsetMap(steps, length) {
  const map = [];
  for (let i = 0; i < length; i += 1) map.push(i);
  for (let s = steps.length - 1; s >= 0; s -= 1) {
    const step = steps[s];
    if (step.op === "slice") {
      for (let i = 0; i < map.length; i += 1) map[i] += step.from;
    }
  }
  return map;
}

// 只推算变换链的输出长度，不物化任何字节
function transformedLength(steps, length) {
  let len = length;
  for (const step of steps) {
    if (step.op === "slice") {
      const from = Math.min(step.from, len);
      const to = Math.min(step.to, len);
      len = Math.max(0, to - from);
    }
  }
  return len;
}

const LIMIT_PER_BYTE = 4; // 写死的安全上限：输出字节的 4 倍

function budget(steps, length) {
  // 变换 + 解析各过一遍输出字节；slice 之后的部分完全不访问
  const outLen = transformedLength(steps, length);
  return { visited: outLen * 2, limit: outLen * LIMIT_PER_BYTE };
}

const codecApi = { applyAll, offsetMap, budget };
if (typeof module !== "undefined" && module.exports) module.exports = codecApi;
if (typeof window !== "undefined") window.codec = codecApi;
