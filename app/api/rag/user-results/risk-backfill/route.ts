import { NextResponse } from "next/server";
import {
  buildRiskScoreSnapshot,
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
  const parsed = Number(value ?? 100);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.round(parsed), 1), 200) : 100;
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
        "created_at",
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
        "risk_score",
        "profile_type",
      ].join(","),
    )
    .or("risk_score.is.null,survey_risk_score.is.null,behavior_risk_score.is.null")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as BackfillRow[];
  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  for (const [index, row] of rows.entries()) {
    try {
      const metrics = normalizeReportMetrics(row);
      const riskScores = buildRiskScoreSnapshot(metrics);
      const profileType =
        typeof row.profile_type === "string" && row.profile_type.trim()
          ? row.profile_type
          : index < 50
            ? "baseline"
            : "user";

      const { error: updateError } = await supabase
        .from("user_results")
        .update({
          risk_scores: riskScores,
          risk_score: riskScores.total,
          survey_risk_score: riskScores.survey,
          behavior_risk_score: riskScores.behavior,
          profile_type: profileType,
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
