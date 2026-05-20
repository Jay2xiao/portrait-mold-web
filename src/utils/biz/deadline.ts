export function deadlineText(deadlineTime?: string, timeoutFlag?: string) {
  if (!deadlineTime) return '-';

  const deadline = new Date(deadlineTime).getTime();
  const now = Date.now();

  if (timeoutFlag === '1') {
    return `已超时`;
  }

  const diff = deadline - now;

  if (diff <= 0) {
    return `已到期`;
  }

  const minutes = Math.floor(diff / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;

  if (hours > 0) {
    return `剩余 ${hours}小时${remainMinutes}分钟`;
  }

  return `剩余 ${remainMinutes}分钟`;
}

export function deadlineTagType(deadlineTime?: string, timeoutFlag?: string) {
  if (!deadlineTime) return 'default';

  if (timeoutFlag === '1') return 'error';

  const diff = new Date(deadlineTime).getTime() - Date.now();

  if (diff <= 0) return 'error';

  if (diff <= 60 * 60 * 1000) return 'warning';

  return 'success';
}
