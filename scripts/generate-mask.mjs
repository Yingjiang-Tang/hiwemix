// 从 1x.jpg 提取红色车身区域，生成黑白遮罩 PNG
// 红色判定：R 显著高于 G/B，且亮度足够
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "public", "1x.jpg");
const OUT = join(__dirname, "..", "public", "car-mask.png");
const TARGET_WIDTH = 1920; // 缩放到 1920px 宽，性能和精度平衡

async function main() {
  const { data, info } = await sharp(SRC)
    .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  console.log(`Image: ${width}x${height}, channels: ${channels}`);

  // 提取红色像素 → 白色，其他 → 黑色
  const mask = Buffer.alloc(width * height, 0); // 单通道 8bit

  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    // 红色判定：R > 150, R - G > 40, R - B > 40
    if (r > 150 && r - g > 40 && r - b > 40) {
      mask[i] = 255;
    }
  }

  await sharp(mask, {
    raw: { width, height, channels: 1 },
  })
    .png()
    .toFile(OUT);

  console.log(`Mask saved: ${OUT} (${width}x${height})`);

  // 统计命中像素
  const hitCount = mask.filter((v) => v === 255).length;
  console.log(`Hit pixels: ${hitCount} / ${width * height} (${((hitCount / (width * height)) * 100).toFixed(1)}%)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
