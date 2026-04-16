/* *
 * @param w 容器宽度
 * @param h 容器高度
 * @param text 文本内容
 * @return 计算得到的字体大小，确保文本在容器内适当显示
 */

export const getDynamicFontSize = (w: number, h: number, text: string): number => {
  const availableW = Math.max(10, w - 24);
  const availableH = Math.max(10, h - 24);

  if (!text) return Math.min(availableW / 3, availableH / 1.5, 24);

  let minSize = 12;
  let maxSize = Math.min(availableW, availableH, 120);
  let bestSize = 12;

  const checkFits = (size: number) => {
    const lineHeight = size * 1.2;
    let currentLineW = 0;
    let lineCount = 1;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        lineCount++;
        currentLineW = 0;
        continue;
      }

      const isWideChar = /[^\x00-\xff]/.test(text[i]);
      const charW = isWideChar ? size : size * 0.55;

      if (charW > availableW) return false;

      if (currentLineW + charW > availableW) {
        lineCount++;
        currentLineW = charW;
      } else {
        currentLineW += charW;
      }
    }

    return (lineCount * lineHeight) <= availableH;
  };

  for (let i = 0; i < 15; i++) {
    const mid = (minSize + maxSize) / 2;
    if (checkFits(mid)) {
      bestSize = mid;
      minSize = mid;
    } else {
      maxSize = mid;
    }
  }

  return Math.max(12, Math.min(bestSize, 120));
};