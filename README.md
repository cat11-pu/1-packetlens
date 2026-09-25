# packetlens

浏览器单页工作台（原生 HTML/CSS/JS，零依赖）。

## 打开

双击 `index.html`，或起一个静态服务：

    python3 -m http.server 8000

## 测试

    node tests/run.js

## 场景自检

    node check_sample.js

## API 速览

- `codec.applyAll(bytes, steps)`：应用 `slice` / `xor` / `delta` 变换链。
- `codec.offsetMap(steps, length)`：变换后下标 → 原始下标（逐元素）。
- `codec.budget(steps, length)`：`{ visited, limit }`，只统计视口实际访问的字节。
- `fieldparse.parseFields(bytes)`：`tag(1) + len(2 大端) + payload(len)` 顺序解析，tag 高位为 1 时 payload 再嵌套解析一层；越界即停。
- `fieldparse.locate(bytes, fieldIndex)`：越界字段的原始偏移与原因（`length_out_of_range`）。
- `app.renderView(payload, { steps, width, scroll?, height? })`：只渲染视口行，返回 `{ rows, fields, map }`。
