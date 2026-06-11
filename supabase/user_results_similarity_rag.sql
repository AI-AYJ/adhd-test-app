create extension if not exists vector;

alter table public.user_results
  add column if not exists metric_snapshot jsonb,
  add column if not exists embedding vector(768),
  add column if not exists embedding_model text;

create index if not exists user_results_embedding_ivfflat_idx
  on public.user_results
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 10)
  where embedding is not null;

create or replace function public.match_similar_user_reports(
  query_embedding vector(768),
  match_count int default 4,
  match_threshold double precision default 0.15,
  exclude_result_id uuid default null
)
returns table (
  id uuid,
  created_at text,
  final_risk_level text,
  report text,
  metric_snapshot jsonb,
  similarity double precision,
  inattention_count double precision,
  hyperactivity_count double precision,
  cpt_attention double precision,
  cpt_timeliness double precision,
  cpt_impulsivity double precision,
  cpt_hyperactivity double precision,
  gaze_off_task_ratio double precision,
  head_movement_variability double precision,
  head_rotation_variability double precision,
  head_pose_forward_ratio double precision,
  head_attention_score_adjusted double precision
)
language sql
stable
as $$
  select
    ur.id,
    ur.created_at::text,
    ur.final_risk_level,
    ur.report,
    ur.metric_snapshot,
    1 - (ur.embedding <=> query_embedding) as similarity,
    ur.inattention_count::double precision,
    ur.hyperactivity_count::double precision,
    ur.cpt_attention::double precision,
    ur.cpt_timeliness::double precision,
    ur.cpt_impulsivity::double precision,
    ur.cpt_hyperactivity::double precision,
    ur.gaze_off_task_ratio::double precision,
    ur.head_movement_variability::double precision,
    coalesce(ur.head_rotation_variability, ur.head_movement_variability)::double precision,
    ur.head_pose_forward_ratio::double precision,
    ur.head_attention_score_adjusted::double precision
  from public.user_results ur
  where ur.embedding is not null
    and ur.report is not null
    and char_length(trim(ur.report)) > 0
    and (exclude_result_id is null or ur.id <> exclude_result_id)
    and 1 - (ur.embedding <=> query_embedding) >= match_threshold
  order by ur.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 8);
$$;
