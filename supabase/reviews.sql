create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.user_results(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 500),
  created_at timestamp with time zone not null default now()
);

create index if not exists reviews_rating_created_at_idx
  on public.reviews (rating, created_at desc);
