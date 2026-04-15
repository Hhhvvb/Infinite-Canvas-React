/* *
 * @param w 容器宽度
 * @param h 容器高度
 * @param text 文本内容
 * @return 计算得到的字体大小，确保文本在容器内适当显示
 */

// src/utils/layout.ts

/**
 * 工业级文本自适应算法：虚拟排版 + 二分查找
 */
export const getDynamicFontSize = (w: number, h: number, text: string): number => {
  // 1. 减去 padding 占用的安全区域
  const availableW = Math.max(10, w - 24);
  const availableH = Math.max(10, h - 24);

  if (!text) return Math.min(availableW / 3, availableH / 1.5, 24);

  // 2. 二分查找的上下界
  let minSize = 12;
  let maxSize = Math.min(availableW, availableH, 120); // 字号绝不能大到超过盒子本身
  let bestSize = 12;

  // 3. 核心：虚拟排版模拟器，用来测试某个字号下，文本是否能装进盒子里
  const checkFits = (size: number) => {
    const lineHeight = size * 1.2;
    let currentLineW = 0;
    let lineCount = 1;

    for (let i = 0; i < text.length; i++) {
      // 遇到显式回车，直接换行
      if (text[i] === '\n') {
        lineCount++;
        currentLineW = 0;
        continue;
      }

      // 精细区分字符宽度：非 ASCII 字符（中文、Emoji 等）较宽，英文/数字较窄
      const isWideChar = /[^\x00-\xff]/.test(text[i]);
      const charW = isWideChar ? size : size * 0.55;

      // 如果单字已经比整个盒子还宽，这个字号绝对不行
      if (charW > availableW) return false;

      // 模拟折行：如果当前行加上这个字超过了可用宽度，就折到下一行
      if (currentLineW + charW > availableW) {
        lineCount++;
        currentLineW = charW; // 新的一行的第一个字
      } else {
        currentLineW += charW;
      }
    }

    // 最终判断：排出来的总高度是否小于等于可用高度
    return (lineCount * lineHeight) <= availableH;
  };

  // 4. 执行二分查找（循环 15 次足以在像素级精确收敛）
  for (let i = 0; i < 15; i++) {
    const mid = (minSize + maxSize) / 2;
    if (checkFits(mid)) {
      bestSize = mid;  // 这个字号能装下，记录下来
      minSize = mid;   // 尝试挑战更大的字号
    } else {
      maxSize = mid;   // 装不下，必须把字号调小
    }
  }

  // 5. 限制极值
  return Math.max(12, Math.min(bestSize, 120));
};