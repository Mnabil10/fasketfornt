export function buildQueryParams<T extends Record<string, any> | undefined>(params?: T) {
  if (!params) return undefined;
  const query: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;
      query[key] = trimmed;
      continue;
    }
    query[key] = value;
  }

  if (Object.prototype.hasOwnProperty.call(query, "pageSize")) {
    query.limit = query.pageSize;
    delete query.pageSize;
  }

  return query;
}
