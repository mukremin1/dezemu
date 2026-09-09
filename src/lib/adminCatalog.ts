import { supabase } from "@/integrations/supabase/client";
import { CLOSED_TAG, productIsClosed, withClosedTag } from "@/lib/shopVisibility";

export type AdminProductRow = {
  id: string;
  name: string;
  sku: string | null;
  slug: string;
  price: number;
  is_active: boolean;
  tags: string[] | null;
  created_at: string;
};

export type AdminProductList = {
  items: AdminProductRow[];
  total: number;
};

function sanitizeSearch(value: string) {
  return value.replace(/[%_,]/g, " ").trim();
}

function asAdminRows(rows: AdminProductRow[] | null): AdminProductRow[] {
  return (rows ?? []).map((row) => ({
    ...row,
    is_active: !productIsClosed(row),
  }));
}

export async function listAdminProducts(
  search: string,
  status: string,
  page: number,
  pageSize: number
): Promise<AdminProductList> {
  const offset = (page - 1) * pageSize;
  const safe = sanitizeSearch(search);
  let query = supabase
    .from("products")
    .select("id, name, sku, slug, price, is_active, tags, created_at", { count: "exact" })
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status === "active") query = query.or(`tags.is.null,tags.not.cs.{${CLOSED_TAG}}`);
  if (status === "closed") query = query.contains("tags", [CLOSED_TAG]);
  if (safe) query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: asAdminRows(data as AdminProductRow[]), total: count ?? 0 };
}

async function loadTags(ids: string[]) {
  const { data, error } = await supabase.from("products").select("id, tags").in("id", ids);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.id as string, (row.tags as string[] | null) ?? []]));
}

export async function setProductActive(id: string, isActive: boolean) {
  const tagsById = await loadTags([id]);
  const { error } = await supabase
    .from("products")
    .update({ tags: withClosedTag(tagsById.get(id) ?? [], !isActive) })
    .eq("id", id);
  if (error) throw error;
}

export async function setProductsActive(ids: string[], isActive: boolean) {
  if (ids.length === 0) return;
  const tagsById = await loadTags(ids);
  for (const id of ids) {
    const { error } = await supabase
      .from("products")
      .update({ tags: withClosedTag(tagsById.get(id) ?? [], !isActive) })
      .eq("id", id);
    if (error) throw error;
  }
}

export async function deleteAdminProduct(id: string): Promise<"deleted" | "closed"> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (!error) return "deleted";
  await setProductActive(id, false);
  return "closed";
}

export async function deleteAdminProducts(ids: string[]): Promise<{ deleted: number; closed: number }> {
  let deleted = 0;
  let closed = 0;
  for (const id of ids) {
    const result = await deleteAdminProduct(id);
    if (result === "deleted") deleted += 1;
    else closed += 1;
  }
  return { deleted, closed };
}
