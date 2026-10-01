export const downloadFile = (fileName: string, type: string, data: any) => {
  const file = new File([data], fileName, { type });
  const href = URL.createObjectURL(file);
  const link = document.createElement('a');
  Object.assign(link, {
    href,
    download: fileName,
    style: 'display: none',
  });
  document.body.appendChild(link);
  link.click();
  link.remove();
  return URL.revokeObjectURL(link.href);
};
