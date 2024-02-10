export function useSearchParams(
  w: Window = window,
): Partial<Record<string, string>> {
  const parts = w.location.search?.split("?") ?? [];
  const searchString = parts?.[1];

  return (searchString?.split("&") || []).reduce((res, current) => {
    const [key, value] = current.split("=");
    return {
      ...res,
      [key]: decodeURIComponent(value),
    };
  }, {});
}
