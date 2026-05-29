// 将对象序列化为 JSON 文件并触发浏览器下载。
export const downloadJSON = (data: unknown, fileName: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.json`;
  link.click();
  URL.revokeObjectURL(url);
};
