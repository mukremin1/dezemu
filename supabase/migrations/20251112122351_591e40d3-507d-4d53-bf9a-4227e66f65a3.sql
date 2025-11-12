-- Fix 1: Restrict profiles table to only allow users to view their own data
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Fix 2: Require authentication for order creation
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;

CREATE POLICY "Authenticated users can create orders" ON orders
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND customer_email = (current_setting('request.jwt.claims'::text, true)::json ->> 'email'::text)
  );

-- Fix 3: Require authentication for order items creation  
DROP POLICY IF EXISTS "Anyone can create order items" ON order_items;

CREATE POLICY "Authenticated users can create order items" ON order_items
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);