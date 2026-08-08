#!/usr/bin/env python3
"""把 src/imgs/icon.jpeg 生成为符合 macOS 标准的圆角 App 图标。

按 Apple HIG：
  - 画布 1024×1024
  - 图标主体 824×824，四周留 ~100px 透明边距（避免在 Dock 中显得过大）
  - 圆角半径 ~185px
"""
from PIL import Image, ImageDraw

SRC = "src/imgs/icon.jpeg"
DST = "src/imgs/icon-rounded.png"
CANVAS = 1024
ART = 824          # 图标主体尺寸
RADIUS = 185       # 圆角半径
PAD = (CANVAS - ART) // 2  # = 100px 边距

img = Image.open(SRC).convert("RGBA").resize((ART, ART), Image.LANCZOS)

mask = Image.new("L", (ART, ART), 0)
ImageDraw.Draw(mask).rounded_rectangle(
    [0, 0, ART - 1, ART - 1], radius=RADIUS, fill=255
)

canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
canvas.paste(img, (PAD, PAD), mask)
canvas.save(DST)

# 验证：四角与边距区域透明，主体边缘中心有内容
assert canvas.getpixel((5, 5))[3] == 0, "四角未透明"
assert canvas.getpixel((PAD + 5, PAD + ART // 2))[3] > 0, "主体左边缘中心无内容"
print(f"生成成功: {DST} 画布 {CANVAS}x{CANVAS}, 主体 {ART}x{ART}, 边距 {PAD}px, 圆角 {RADIUS}px")
