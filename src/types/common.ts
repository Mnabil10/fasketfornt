export type PagedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type PaginatedQuery = {
  page?: number;
  pageSize?: number;
};

export type Timestamped = {
  createdAt?: string;
  updatedAt?: string;
};

export type FileResource = {
  url: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
};
