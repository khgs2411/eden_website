# Nested Supabase Project Boundary

The class-management Supabase database, migrations, seed data, Edge Functions, and backend RPCs are treated as a separate **Supabase Project** that is nested in this repository only while the product is being proven. Consumer Websites, including Eden, must connect to it through Supabase configuration and the public product API contract rather than relying on backend source files living beside the website, so the Supabase Project can later move to its own folder or repository with minimal frontend changes.
