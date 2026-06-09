-- Sync schema: add columns, tables, indexes, and RLS policies that were added
-- directly to the database but never captured in migration files.

-- 1. PROFILES table (missing from migrations entirely)
create table if not exists public.profiles (
  user_id text primary key,
  avg_sale_value numeric default 100,
  business_name text,
  agency_branding jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy if not exists "Users manage own profile" on public.profiles
  for all using ((auth.uid())::text = user_id);

-- 2. ASSISTANTS - add missing columns
alter table public.assistants add column if not exists tone text default 'professional';
alter table public.assistants add column if not exists widget_color text default '#00d4ff';

-- 3. CONVERSATIONS - add missing columns
alter table public.conversations add column if not exists session_id text;
alter table public.conversations add column if not exists visitor_name text;
alter table public.conversations add column if not exists visitor_email text;
alter table public.conversations add column if not exists message_count integer default 0;
alter table public.conversations add column if not exists channel text default 'widget';
alter table public.conversations add column if not exists phone_number text;
alter table public.conversations add column if not exists platform text default 'widget';

-- 4. MESSAGES - add missing columns
alter table public.messages add column if not exists message_id text;

-- 5. LEADS - add missing columns
alter table public.leads add column if not exists conversation_id integer references public.conversations(id) on delete set null;
alter table public.leads alter column email drop not null;

-- 6. APPOINTMENTS - add missing columns
alter table public.appointments add column if not exists conversation_id integer references public.conversations(id) on delete set null;
alter table public.appointments add column if not exists name text;
alter table public.appointments add column if not exists email text;
alter table public.appointments add column if not exists phone text;
alter table public.appointments add column if not exists service text;

-- 7. SUBSCRIPTIONS - add missing columns
alter table public.subscriptions add column if not exists messages_used integer default 0;
alter table public.subscriptions add column if not exists messages_limit integer default 100;
alter table public.subscriptions add column if not exists assistants_limit integer default 1;
alter table public.subscriptions add column if not exists leads_limit integer default 50;
alter table public.subscriptions add column if not exists features text[] default '{}';
alter table public.subscriptions add column if not exists renews_at timestamptz;
alter table public.subscriptions add column if not exists whatsapp_enabled boolean default false;
alter table public.subscriptions add column if not exists whatsapp_phone_number_id text;
alter table public.subscriptions add column if not exists whatsapp_business_account_id text;
alter table public.subscriptions add column if not exists whatsapp_access_token text;
alter table public.subscriptions add column if not exists whatsapp_webhook_verify_token text;
alter table public.subscriptions add column if not exists whatsapp_phone_number text;

-- 8. KNOWLEDGE - add missing columns
alter table public.knowledge add column if not exists source_url text;
alter table public.knowledge alter column user_id drop not null;

-- 9. MARKETPLACE TEMPLATES - add missing columns
alter table public.marketplace_templates add column if not exists user_id text;
alter table public.marketplace_templates add column if not exists assistant_id integer references public.assistants(id) on delete set null;
alter table public.marketplace_templates add column if not exists title text;
alter table public.marketplace_templates add column if not exists industry text;
alter table public.marketplace_templates add column if not exists installs integer default 0;
alter table public.marketplace_templates add column if not exists rating numeric default 0;
alter table public.marketplace_templates alter column name drop not null;

-- 10. REFERRAL CLICKS - sync with actual DB schema
-- The current DB has different columns than migration 002. Use IF NOT EXISTS to avoid conflicts.
alter table public.referral_clicks add column if not exists referrer text;
alter table public.referral_clicks add column if not exists page_url text;
alter table public.referral_clicks add column if not exists ip_address text;
alter table public.referral_clicks add column if not exists user_agent text;

-- 11. INDEXES
create index if not exists idx_assistants_user_id on public.assistants (user_id);
create index if not exists idx_conversations_user_id on public.conversations (user_id);
create index if not exists idx_conversations_assistant_id on public.conversations (assistant_id);
create index if not exists idx_conversations_session_id on public.conversations (session_id);
create index if not exists idx_conversations_created_at on public.conversations (created_at desc);
create index if not exists idx_messages_conversation_id on public.messages (conversation_id);
create index if not exists idx_leads_user_id on public.leads (user_id);
create index if not exists idx_leads_assistant_id on public.leads (assistant_id);
create index if not exists idx_appointments_user_id on public.appointments (user_id);
create index if not exists idx_appointments_assistant_id on public.appointments (assistant_id);
create index if not exists idx_knowledge_user_id on public.knowledge (user_id);
create index if not exists idx_knowledge_assistant_id on public.knowledge (assistant_id);
create index if not exists idx_subscriptions_user_id on public.subscriptions (user_id);
create index if not exists idx_marketplace_templates_user_id on public.marketplace_templates (user_id);
create index if not exists idx_marketplace_templates_installs on public.marketplace_templates (installs desc);

-- 12. RLS POLICIES (idempotent)
-- PROFILES
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users manage own profile') then
    create policy "Users manage own profile" on public.profiles
      for all using ((auth.uid())::text = user_id);
  end if;
end $$;

-- ASSISTANTS - authenticated users policy
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'assistants' and policyname = 'Users can manage their own assistants') then
    create policy "Users can manage their own assistants" on public.assistants
      for all to authenticated using ((auth.uid())::text = user_id) with check ((auth.uid())::text = user_id);
  end if;
end $$;

-- CONVERSATIONS - anon insert
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'Anyone can insert conversations') then
    create policy "Anyone can insert conversations" on public.conversations
      for insert to anon, authenticated with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'Anyone can read public conversations') then
    create policy "Anyone can read public conversations" on public.conversations
      for select to anon, authenticated using (true);
  end if;
end $$;

-- MESSAGES - anon insert
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'Anyone can insert messages') then
    create policy "Anyone can insert messages" on public.messages
      for insert to anon, authenticated with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'Anyone can read messages') then
    create policy "Anyone can read messages" on public.messages
      for select to anon, authenticated using (true);
  end if;
end $$;

-- KNOWLEDGE - authenticated policies
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knowledge' and policyname = 'Users can only see their own knowledge') then
    create policy "Users can only see their own knowledge" on public.knowledge
      for select to authenticated using ((auth.uid())::text = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knowledge' and policyname = 'Users can only insert their own knowledge') then
    create policy "Users can only insert their own knowledge" on public.knowledge
      for insert to authenticated with check ((auth.uid())::text = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'knowledge' and policyname = 'Users can only delete their own knowledge') then
    create policy "Users can only delete their own knowledge" on public.knowledge
      for delete to authenticated using ((auth.uid())::text = user_id);
  end if;
end $$;

-- LEADS - authenticated policies
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'leads' and policyname = 'Users can only see their own leads') then
    create policy "Users can only see their own leads" on public.leads
      for select to authenticated using ((auth.uid())::text = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'leads' and policyname = 'Users can only insert their own leads') then
    create policy "Users can only insert their own leads" on public.leads
      for insert to authenticated with check ((auth.uid())::text = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'leads' and policyname = 'Users can only update their own leads') then
    create policy "Users can only update their own leads" on public.leads
      for update to authenticated using ((auth.uid())::text = user_id) with check ((auth.uid())::text = user_id);
  end if;
end $$;

-- APPOINTMENTS - authenticated policies
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'appointments' and policyname = 'Users can only see their own appointments') then
    create policy "Users can only see their own appointments" on public.appointments
      for select to authenticated using ((auth.uid())::text = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'appointments' and policyname = 'Users can only insert their own appointments') then
    create policy "Users can only insert their own appointments" on public.appointments
      for insert to authenticated with check ((auth.uid())::text = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'appointments' and policyname = 'Users can only update their own appointments') then
    create policy "Users can only update their own appointments" on public.appointments
      for update to authenticated using ((auth.uid())::text = user_id) with check ((auth.uid())::text = user_id);
  end if;
end $$;

-- SUBSCRIPTIONS - authenticated
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'Users can view their own subscription') then
    create policy "Users can view their own subscription" on public.subscriptions
      for select to authenticated using ((auth.uid())::text = user_id);
  end if;
end $$;

-- REFERRAL CLICKS - authenticated insert
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'referral_clicks' and policyname = 'Anyone can insert referral clicks') then
    create policy "Anyone can insert referral clicks" on public.referral_clicks
      for insert to anon, authenticated with check (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'referral_clicks' and policyname = 'Users can view their own referral clicks') then
    create policy "Users can view their own referral clicks" on public.referral_clicks
      for select to authenticated using ((auth.uid())::text = (select assistants.user_id from assistants where assistants.id = referral_clicks.assistant_id));
  end if;
end $$;

-- MARKETPLACE TEMPLATES
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'marketplace_templates' and policyname = 'Users can manage their own templates') then
    create policy "Users can manage their own templates" on public.marketplace_templates
      for all to authenticated using ((auth.uid())::text = user_id) with check ((auth.uid())::text = user_id);
  end if;
end $$;
