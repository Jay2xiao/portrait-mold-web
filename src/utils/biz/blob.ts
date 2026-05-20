export function getBlobFromResponse(res: any): Blob {
  if (res instanceof Blob) {
    return res;
  }

  if (res?.data instanceof Blob) {
    return res.data;
  }

  return new Blob([res]);
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

export function isImageFile(file: any) {
  const contentType = file?.contentType || '';
  const ext = (file?.fileExt || '').toLowerCase();

  if (contentType.startsWith('image/')) {
    return true;
  }

  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
}

export function isVideoFile(file: any) {
  const contentType = file?.contentType || '';
  const ext = (file?.fileExt || '').toLowerCase();

  if (contentType.startsWith('video/')) {
    return true;
  }

  return ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(ext);
}

