export const CLOSED_TAG = "kapali";

export function productIsClosed(product: { is_active?: boolean | null; tags?: string[] | null }) {
  if (product.is_active === false) return true;
  return (product.tags ?? []).includes(CLOSED_TAG);
}

export function applyVisibleProducts<T>(query: T): T {
  return (query as { eq: Function; or: Function })
    .eq("is_active", true)
    .or(`tags.is.null,tags.not.cs.{${CLOSED_TAG}}`) as T;
}

export function withClosedTag(tags: string[] | null, closed: boolean) {
  const next = (tags ?? []).filter((tag) => tag !== CLOSED_TAG);
  if (closed) next.push(CLOSED_TAG);
  return next.length ? next : null;
}
