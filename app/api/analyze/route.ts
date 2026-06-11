import { NextResponse } from "next/server";
import {
  buildRiskScoreSnapshot,
  normalizeReportMetrics,
} from "@/lib/screeningProfile";
import { supabase } from "@/lib/supabase";

function toNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNonEmptyString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function toJsonObject(value: unknown) {
  return value && typeof value === "object" ? value : null;
}

function getKoreanTimestamp() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace("T", " ").replace("Z", "");
}

function buildAnalyzePayload(body: Record<string, unknown>) {
  const metrics = normalizeReportMetrics({
    ...body,
    final_risk_level: toNonEmptyString(body.final_risk_level, "분석 대기"),
  });
  const riskScores = buildRiskScoreSnapshot(metrics);

  return {
    created_at: getKoreanTimestamp(),
    ...metrics,
    head_pose_raw: toJsonObject(body.head_pose_raw),
    risk_scores: riskScores,
    risk_score: riskScores.total,
    survey_risk_score: riskScores.survey,
    behavior_risk_score: riskScores.behavior,
    profile_type: "user",
    report: toNonEmptyString(body.report, "리포트 생성 대기 중"),
  };
}

function toRiskPoint(row: Record<string, unknown>) {
  const fallbackScores = buildRiskScoreSnapshot(normalizeReportMetrics(row));
  const surveyRiskScore = toNumber(row.survey_risk_score, fallbackScores.survey ?? 0);
  const behaviorRiskScore = toNumber(row.behavior_risk_score, fallbackScores.behavior ?? 0);
  const riskScore = toNumber(row.risk_score, fallbackScores.total ?? 0);

  return {
    id: typeof row.id === "string" ? row.id : "",
    survey_risk_score: Math.round(surveyRiskScore),
    behavior_risk_score: Math.round(behaviorRiskScore),
    risk_score: Math.round(riskScore),
  };
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

async function buildBaselineVisualization(currentRow: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("user_results")
    .select("id, survey_risk_score, behavior_risk_score, risk_score")
    .eq("profile_type", "baseline")
    .not("survey_risk_score", "is", null)
    .not("behavior_risk_score", "is", null)
    .not("risk_score", "is", null)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("Baseline visualization retrieval failed in /api/analyze:", error);
    return null;
  }

  const baseline = ((data ?? []) as unknown as Record<string, unknown>[])
    .map(toRiskPoint)
    .filter((point) => point.id);

  if (!baseline.length) {
    return null;
  }

  const current = toRiskPoint(currentRow);
  const meanBehavior = average(baseline.map((point) => point.behavior_risk_score));
  const meanSurvey = average(baseline.map((point) => point.survey_risk_score));
  const meanTotal = average(baseline.map((point) => point.risk_score));

  return {
    current,
    baseline,
    baseline_count: baseline.length,
    mean: {
      survey_risk_score: Math.round(meanSurvey),
      behavior_risk_score: Math.round(meanBehavior),
      risk_score: Math.round(meanTotal),
    },
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabase
      .from("user_results")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.code === "PGRST116" ? 404 : 500 },
      );
    }

    const visualization = await buildBaselineVisualization(data as Record<string, unknown>);

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        baseline_visualization: visualization,
      },
    });
  }

  const { data, error } = await supabase
    .from("user_results")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const payload = buildAnalyzePayload(body);

    const { data, error } = await supabase
      .from("user_results")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error in /api/analyze:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data, id: data?.id });
  } catch (err) {
    console.error("Unexpected error in /api/analyze POST:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
