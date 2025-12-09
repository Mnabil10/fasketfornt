const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

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

  // Normalize pagination keys
  if (Object.prototype.hasOwnProperty.call(query, "pageSize")) {
    query.limit = query.pageSize;
    delete query.pageSize;
  }

  if (typeof query.limit === "string" || typeof query.limit === "number") {
    const numeric = Number(query.limit);
    if (!Number.isNaN(numeric) && numeric > 0) {
      query.limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(numeric)));
    } else {
      delete query.limit;
    }
  }

  if (typeof query.page === "string" || typeof query.page === "number") {
    const numeric = Number(query.page);
    query.page = Number.isNaN(numeric) ? 1 : Math.max(1, Math.floor(numeric));
  }

  // Ensure a sensible default limit when paginating
  if (query.page && !query.limit) {
    query.limit = DEFAULT_LIMIT;
  }

  return query;
}
