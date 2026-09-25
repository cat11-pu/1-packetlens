// codec.js：变换链与偏移映射（基线：整段物化，无偏移映射）
"use strict";

function applyAll(bytes, steps) {
  // 基线：每步都产出一份新数组，映射信息丢失
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

function offsetMap(steps, length) {
  // 基线：不维护映射，只回一个恒等表
  const map = [];
  for (let i = 0; i < length; i += 1) map.push(i);
  return map;
}

function budget(steps, length) {
  // 基线：报"访问了全部字节"
  return { visited: steps.length * length, limit: length * 4 };
}

module.exports = { applyAll, offsetMap, budget };
