# Shared Supabase Product Scoping

The class-management product uses one shared Supabase backend for multiple product websites. We scope data with `products`, public `product_key` values, and shared tables carrying `product_id`, including a combined `product_users(product_id, user_id, role)` access table, instead of creating separate Supabase projects or separate physical tables per product. This keeps migrations, Edge Functions, and verification centralized while preserving per-product permissions through Edge Function checks, transactional database logic, and RLS defense in depth.
