// codec.js：变换链与偏移映射（逐元素传递，不再物化丢失映射）
"use strict";
(function (global) {

// 写死的单轮访问预算上限（视口化解析的预算天花板）
const LIMIT = 32;

// 标准 Array.prototype.slice 下标归一化
function clampIndex(value, size) {
  if (value === undefined || value === null) return size;
  if (value < 0) return Math.max(size + value, 0);
  return Math.min(value, size);
}

function applyAll(bytes, steps) {
  let out = bytes.slice();
  for (const step of steps) {
    if (step.op === "slice") {
      out = out.slice(step.from, step.to);
    } else if (step.op === "xor") {
      out = out.map((b) => b ^ step.key);
    } else if (step.op === "delta") {
      const next = out.slice();
      for (let i = out.length - 1; i > 0; i -= 1) {
        next[i] = (out[i] - out[i - 1] + 256) % 256;
      }
      out = next;
    }
  }
  return out;
}

// 模拟每一步之后的字节窗口长度（预算用，不依赖真实报文）
function windowAfter(steps, length) {
  let size = length;
  for (const step of steps) {
    if (step.op === "slice") {
      const from = clampIndex(step.from, size);
      const to = clampIndex(step.to, size);
      size = Math.max(0, to - from);
    }
    // xor / delta 不改变长度
  }
  return size;
}

// offsetMap 只拿得到变换后的长度，因此从恒等映射出发逆向传递：
// slice 的逆变换是整体平移 from；xor / delta 只改值不改位置。
function offsetMap(steps, length) {
  const map = [];
  for (let i = 0; i < length; i += 1) map.push(i);
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const step = steps[i];
    if (step.op === "slice") {
      const from = step.from || 0;
      for (let j = 0; j < map.length; j += 1) map[j] += from;
    }
    // xor / delta：逐元素位置不变，映射原样传递
  }
  return map;
}

function budget(steps, length) {
  let size = length;
  let visited = 0;
  for (const step of steps) {
    if (step.op === "slice") {
      const from = clampIndex(step.from, size);
      const to = clampIndex(step.to, size);
      size = Math.max(0, to - from);
      visited += size; // 只拷贝窗口内的字节
    } else {
      visited += size; // xor / delta 逐字节访问当前窗口
    }
  }
  visited += size; // fieldparse 顺序扫描变换后的字节
  return { visited: visited, limit: LIMIT };
}

const api = { applyAll, offsetMap, budget, windowAfter, LIMIT };
if (typeof module !== "undefined" && module.exports) module.exports = api;
if (typeof globalThis !== "undefined") globalThis.codec = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
