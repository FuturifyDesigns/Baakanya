# Baakanya

Document automation for Botswana: career documents, invoices and quotations, and private in-browser PDF conversion.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The production app is connected to its browser-safe Supabase project configuration. For another environment, override the project URL and anon key in `.env.local`, then run `supabase/schema.sql` in the Supabase SQL editor. After the owner's account exists, add its user ID and email to `public.admin_users` from the SQL editor.

Never place a Supabase personal access token or service-role key in Vite environment variables. Every `VITE_` variable is bundled into public browser code.

The deployment workflow publishes the production build after changes reach `main`.
