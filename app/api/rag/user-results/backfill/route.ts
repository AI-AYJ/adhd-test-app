import { NextResponse } from "next/server";
import { requestGEMINIEmbedding } from "@/lib/gemini";
import {
  buildMetricEmbeddingInput,
  normalizeReportMetrics,
} from "@/lib/screeningProfile";
import { supabase } from "@/lib/supabase";

type BackfillRow = Record<string, unknown> & {
  id: string;
};

function authorizeBackfill(req: Request) {
  const configuredToken = process.env.RAG_BACKFILL_TOKEN?.trim();

  if (!configuredToken) {
    return {
      ok: false,
      status: 503,
      error: "Missing environment variable RAG_BACKFILL_TOKEN",
    };
  }

  const { searchParams } = new URL(req.url);
  const providedToken =
    req.headers.get("x-rag-backfill-token")?.trim() || searchParams.get("token")?.trim();

  if (providedToken !== configuredToken) {
    return {
      ok: false,
      status: 401,
      error: "Invalid backfill token",
    };
  }

  return { ok: true, status: 200, error: "" };
}

function normalizeLimit(value: unknown) {
  const parsed = Number(value ?? 20);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.round(parsed), 1), 50) : 20;
}

export async function POST(req: Request) {
  const auth = authorizeBackfill(req);

  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const limit = normalizeLimit(body.limit);

  const { data, error } = await supabase
    .from("user_results")
    .select(
      [
        "id",
        "inattention_count",
        "hyperactivity_count",
        "cpt_attention",
        "cpt_timeliness",
        "cpt_impulsivity",
        "cpt_hyperactivity",
        "gaze_off_task_ratio",
        "head_movement_variability",
        "head_pose_forward_ratio",
        "head_pose_left_ratio",
        "head_pose_right_ratio",
        "head_pose_down_ratio",
        "head_yaw_std",
        "head_pitch_std",
        "head_roll_std",
        "head_rotation_variability",
        "head_attention_score",
        "head_attention_score_adjusted",
        "head_pose_raw",
        "final_risk_level",
        "report",
      ].join(","),
    )
    .is("embedding", null)
    .not("report", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as BackfillRow[];
  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  for (const row of rows) {
    try {
      const metrics = normalizeReportMetrics(row);
      const embedding = await requestGEMINIEmbedding(buildMetricEmbeddingInput(metrics));
      const { error: updateError } = await supabase
        .from("user_results")
        .update({
          metric_snapshot: metrics,
          embedding,
          embedding_model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
        })
        .eq("id", row.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      results.push({ id: row.id, success: true });
    } catch (err) {
      results.push({
        id: row.id,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    success: true,
    requested: limit,
    matched: rows.length,
    updated: results.filter((result) => result.success).length,
    failed: results.filter((result) => !result.success).length,
    results,
  });
}
