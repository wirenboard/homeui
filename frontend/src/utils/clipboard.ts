export const copyToClipboard = (text: string) => {
  if (navigator?.clipboard?.writeText && window.isSecureContext) {
    navigator.clipboard.writeText(text);
  } else {
    const area = document.createElement('textarea');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    area.value = text;

    document.body.appendChild(area);
    area.focus();
    area.select();

    document.execCommand('copy');
    document.body.removeChild(area);
  }
};
