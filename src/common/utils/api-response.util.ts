export function buildResponse<T>(data: T, message = 'Success') {
  return {
    success: true,
    message,
    data,
    serverTime: new Date().toISOString(),
  };
}

export function buildPaginatedResponse<T>(
  items: T[],
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  message = 'Success',
) {
  return buildResponse(
    {
      items,
      meta,
    },
    message,
  );
}
