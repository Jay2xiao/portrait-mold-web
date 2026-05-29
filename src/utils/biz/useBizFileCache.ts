import {
  fetchFileAccessUrl,
  fetchFilesByIds,
  thumbnailFileBlob,
  type FileAssetVO
} from '@/service/api/biz/file';
import { getBlobFromResponse } from '@/utils/biz/blob';

const fileMetaCache = new Map<string, FileAssetVO>();
const thumbUrlCache = new Map<string, string>();
const metaLoadingCache = new Map<string, Promise<void>>();
const thumbLoadingCache = new Map<string, Promise<string>>();

export function parseFileIds(fileIds?: string | Array<string | number> | null) {
  if (!fileIds) return [];

  if (Array.isArray(fileIds)) {
    return fileIds.map(String).filter(Boolean);
  }

  return String(fileIds)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function unwrapArray(res: any) {
  const data = res?.data || res;

  if (Array.isArray(data)) return data;

  return data?.rows || [];
}

export async function ensureFileMetas(ids: Array<string | number>) {
  const normalizedIds = ids.map(String).filter(Boolean);
  const missingIds = normalizedIds.filter(id => !fileMetaCache.has(id));

  if (missingIds.length === 0) return;

  const key = missingIds.sort().join(',');

  if (metaLoadingCache.has(key)) {
    await metaLoadingCache.get(key);
    return;
  }

  const promise = fetchFilesByIds(key).then(res => {
    const list = unwrapArray(res) as FileAssetVO[];

    list.forEach(file => {
      if (file.id) {
        fileMetaCache.set(String(file.id), file);
      }
    });
  }).finally(() => {
    metaLoadingCache.delete(key);
  });

  metaLoadingCache.set(key, promise);

  await promise;
}

export function getCachedFiles(ids: Array<string | number>) {
  return ids
    .map(id => fileMetaCache.get(String(id)))
    .filter(Boolean) as FileAssetVO[];
}

export async function getThumbUrl(file: FileAssetVO) {
  if (!file.id) return '';

  const id = String(file.id);

  if (thumbUrlCache.has(id)) {
    return thumbUrlCache.get(id) || '';
  }

  if (thumbLoadingCache.has(id)) {
    return thumbLoadingCache.get(id)!;
  }

  const promise = (async () => {
    if (file.storageType === 'QINIU') {
      const res = await fetchFileAccessUrl(file.id!, 'THUMBNAIL');
      const data = res.data || res;
      const url = data.url || '';
      thumbUrlCache.set(id, url);
      return url;
    }

    const res = await thumbnailFileBlob(file.id!);
    const blob = getBlobFromResponse(res);
    const url = URL.createObjectURL(blob);

    thumbUrlCache.set(id, url);

    return url;
  })().finally(() => {
    thumbLoadingCache.delete(id);
  });

  thumbLoadingCache.set(id, promise);

  return promise;
}

export async function warmFileMetaCacheFromRows(rows: any[], fields: string[]) {
  const ids: string[] = [];

  rows.forEach(row => {
    fields.forEach(field => {
      ids.push(...parseFileIds(row[field]));
    });
  });

  const uniqueIds = Array.from(new Set(ids));

  if (uniqueIds.length > 0) {
    await ensureFileMetas(uniqueIds);
  }
}

export function clearBizFileThumbCache() {
  thumbUrlCache.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });

  thumbUrlCache.clear();
  fileMetaCache.clear();
}
