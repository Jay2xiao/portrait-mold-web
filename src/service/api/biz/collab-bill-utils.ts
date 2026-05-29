type CollabId = string | number;

export function resolveCollabBillId(result: unknown): CollabId | undefined {
  if (typeof result === 'string' || typeof result === 'number') {
    return result;
  }

  if (!result || typeof result !== 'object') {
    return undefined;
  }

  const record = result as Record<string, unknown>;
  if (typeof record.id === 'string' || typeof record.id === 'number') {
    return record.id;
  }

  const { data } = record;
  if (typeof data === 'string' || typeof data === 'number') {
    return data;
  }

  if (data && typeof data === 'object') {
    const dataRecord = data as Record<string, unknown>;
    if (typeof dataRecord.id === 'string' || typeof dataRecord.id === 'number') {
      return dataRecord.id;
    }
  }

  return undefined;
}
