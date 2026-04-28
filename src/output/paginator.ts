export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function renderPagination(meta: PaginationMeta): string {
  return `Page ${meta.page} of ${meta.totalPages} (${meta.total} total records, ${meta.limit} per page)`;
}
