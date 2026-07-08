-- Adds private recruiter-portfolio profile settings to each user's existing
-- Mystic Lore profile row. Project-level settings already live in the projects
-- metadata JSON and do not require a separate schema change.

alter table public.profiles
  add column if not exists portfolio_profile jsonb not null default '{}'::jsonb;

comment on column public.profiles.portfolio_profile is
  'Private PortfolioProfile settings used to prepare a future public recruiter view.';
