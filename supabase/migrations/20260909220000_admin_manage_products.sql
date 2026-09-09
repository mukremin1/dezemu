-- Admins must see closed products to reopen them. Public SELECT still only returns is_active = true.
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
CREATE POLICY "Admins can view all products"
ON public.products
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE OR REPLACE FUNCTION public.admin_list_products(
  p_search text DEFAULT '',
  p_status text DEFAULT 'all',
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := trim(both from coalesce(p_search, ''));
  status_filter text := lower(coalesce(p_status, 'all'));
  v_limit integer := LEAST(GREATEST(coalesce(p_limit, 20), 1), 50);
  v_offset integer := GREATEST(coalesce(p_offset, 0), 0);
  v_total integer := 0;
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Giriş gerekli';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Yetkisiz';
  END IF;

  q := regexp_replace(q, '[%_,]', ' ', 'g');

  SELECT count(*)::integer
  INTO v_total
  FROM public.products
  WHERE
    (
      status_filter = 'all'
      OR (status_filter IN ('active', 'acik', 'açık') AND is_active = true)
      OR (status_filter IN ('closed', 'inactive', 'kapali', 'kapalı') AND is_active = false)
    )
    AND (
      q = ''
      OR name ILIKE '%' || q || '%'
      OR coalesce(sku, '') ILIKE '%' || q || '%'
    );

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'sku', p.sku,
        'slug', p.slug,
        'price', p.price,
        'is_active', p.is_active,
        'created_at', p.created_at
      )
      ORDER BY p.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM (
    SELECT id, name, sku, slug, price, is_active, created_at
    FROM public.products
    WHERE
      (
        status_filter = 'all'
        OR (status_filter IN ('active', 'acik', 'açık') AND is_active = true)
        OR (status_filter IN ('closed', 'inactive', 'kapali', 'kapalı') AND is_active = false)
      )
      AND (
        q = ''
        OR name ILIKE '%' || q || '%'
        OR coalesce(sku, '') ILIKE '%' || q || '%'
      )
    ORDER BY created_at DESC
    OFFSET v_offset
    LIMIT v_limit
  ) p;

  RETURN jsonb_build_object('total', v_total, 'items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_products(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_products(text, text, integer, integer) TO authenticated;
