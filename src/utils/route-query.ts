export function routeQueryString(value: any) {
  if (Array.isArray(value)) {
    return value[0] ? String(value[0]) : '';
  }

  if (value === undefined || value === null) {
    return '';
  }

  return String(value);
}

export function routeQueryBoolean(value: any) {
  if (Array.isArray(value)) {
    return value[0] === 'true' || value[0] === '1';
  }

  return value === true || value === 'true' || value === '1';
}

export function normalizeRouteQuery(query?: Record<string, any>) {
  const result: Record<string, string> = {};

  if (!query) {
    return result;
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (typeof value === 'boolean') {
      result[key] = value ? 'true' : 'false';
      return;
    }

    if (typeof value === 'number') {
      result[key] = String(value);
      return;
    }

    result[key] = String(value);
  });

  return result;
}
