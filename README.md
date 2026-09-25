# packetlens

浏览器单页工作台（原生 HTML/CSS/JS，零依赖）。

## 打开

双击 `index.html`，或起一个静态服务：

    python3 -m http.server 8000

页面中 `codec` / `fieldparse` / `app` 挂在全局；Node 下走 CommonJS 导出，两端同一份代码。

## 测试

    node tests/run.js

## 场景自检

    node check_sample.js

## API

- `codec.applyAll(bytes, steps)`：按序应用 `slice` / `xor` / `delta`（delta 为模 256 相邻差分）。
- `codec.offsetMap(steps, length)`：变换后下标 → 原始下标的逐元素映射；slice 逆推平移，
  xor/delta 保持位置不变。
- `codec.budget(steps, length)`：`{ visited, limit }`，visited 为各步窗口访问量加解析扫描量，
  limit 为写死上限 32。
- `fieldparse.parseFields(bytes)`：按 `tag(1) + len(2 大端) + payload(len)` 连续解析，
  tag 高位为 1 时对其 payload 再解析一层（`nested`）；越界或长度不足立即停止。
- `fieldparse.locate(bytes, fieldIndex)`：返回截断字段的 `{ offset, reason }`
  （reason 恒为 `length_out_of_range`），字段完整或下标越界返回 `null`。
  判定标准：字段体越界，或字段恰好顶到缓冲末尾（后继连一个字段头都放不下）。
- `fieldparse.checkInvariant(fields)`：区间互不重叠且按偏移升序。
- `app.renderView(payload, view)`：只渲染视口行（`view.top` 起始行、`view.height` 行数、
  `view.width` 行宽；height 缺省覆盖全部），返回结构不变：`{ rows, fields, map }`，
  其中 `fields` 为与视口相交的字段切片。
