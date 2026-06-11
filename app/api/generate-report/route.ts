import { NextResponse } from "next/server";
import { requestGEMINIEmbedding, requestGEMINILLM } from "@/lib/gemini";
import { ADHD_REPORT_SYSTEM_PROMPT } from "@/lib/prompts/adhdReportSystemPrompt";
import {
  buildMetricEmbeddingInput,
  buildMetricProfileText,
  buildRiskScoreSnapshot,
  normalizeReportMetrics,
  type NormalizedReportMetrics,
} from "@/lib/screeningProfile";
import { supabase, supabaseUrl } from "@/lib/supabase";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  choices?: Array<{
    message?: { content?: string };
    text?: string;
  }>;
  text?: string;
  content?: string;
  output_text?: string;
};

type RagMatch = {
  title?: string | null;
  content?: string | null;
  source?: string | null;
  page_start?: number | null;
  section?: string | null;
  similarity?: number | null;
};

type SimilarReportMatch = {
  id?: string | null;
  final_risk_level?: string | null;
  report?: string | null;
  metric_snapshot?: Record<string, unknown> | null;
  similarity?: number | null;
  inattention_count?: number | null;
  hyperactivity_count?: number | null;
  cpt_attention?: number | null;
  cpt_timeliness?: number | null;
  cpt_impulsivity?: number | null;
  cpt_hyperactivity?: number | null;
  gaze_off_task_ratio?: number | null;
  head_movement_variability?: number | null;
  head_rotation_variability?: number | null;
  head_pose_forward_ratio?: number | null;
  head_attention_score_adjusted?: number | null;
};

function getKoreanTimestamp() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace("T", " ").replace("Z", "");
}

function buildRagQuery(metrics: NormalizedReportMetrics) {
  return buildMetricProfileText(metrics);
}

function formatRetrievedContext(matches: RagMatch[]) {
  return matches
    .filter((match) => match.content)
    .map((match, index) => {
      const title = match.title || "참고 문서";
      const page = match.page_start ? `, p.${match.page_start}` : "";
      const section = match.section ? `, ${match.section}` : "";
      const source = match.source ? `, ${match.source}` : "";
      return `[${index + 1}] ${title}${page}${section}${source}\n${match.content}`;
    })
    .join("\n\n");
}

async function retrieveRagContext(metrics: NormalizedReportMetrics) {
  const queryEmbedding = await requestGEMINIEmbedding(buildRagQuery(metrics));
  const { data, error } = await supabase.rpc("match_rag_documents", {
    query_embedding: queryEmbedding,
    match_count: 5,
    match_threshold: 0.2,
    filter_category: null,
  });

  if (error) {
    console.error("RAG retrieval failed in /api/generate-report:", error);
    return "";
  }

  return formatRetrievedContext((data ?? []) as RagMatch[]);
}

function sanitizeReportText(text: string, maxLength = 900) {
  const normalized = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function formatSimilarity(value: unknown) {
  const similarity = Number(value);
  return Number.isFinite(similarity) ? `${Math.round(similarity * 100)}%` : "계산 불가";
}

function readMetric(match: SimilarReportMatch, key: keyof NormalizedReportMetrics) {
  const snapshotValue = match.metric_snapshot?.[key];
  const directValue = match[key as keyof SimilarReportMatch];
  const value = snapshotValue ?? directValue;
  return value === null || value === undefined || value === "" ? "없음" : String(value);
}

function formatSimilarReportContext(matches: SimilarReportMatch[]) {
  return matches
    .filter((match) => typeof match.report === "string" && match.report.trim())
    .map((match, index) => {
      return `[유사 리포트 ${index + 1}]
유사도: ${formatSimilarity(match.similarity)}
시스템 1차 참고 위험도: ${match.final_risk_level || "없음"}
지표 요약:
- ASRS 부주의 응답 수: ${readMetric(match, "inattention_count")}
- ASRS 과잉행동 및 충동성 응답 수: ${readMetric(match, "hyperactivity_count")}
- CPT 주의 지표: ${readMetric(match, "cpt_attention")}
- CPT 반응 속도 및 일관성 지표: ${readMetric(match, "cpt_timeliness")}
- CPT 충동성 지표: ${readMetric(match, "cpt_impulsivity")}
- CPT 과잉행동 보조 지표: ${readMetric(match, "cpt_hyperactivity")}
- 시선 이탈 비율: ${readMetric(match, "gaze_off_task_ratio")}
- 머리 움직임 변동성: ${readMetric(match, "head_movement_variability")}
- 머리 회전 변동성: ${readMetric(match, "head_rotation_variability")}
- 정면 유지 비율: ${readMetric(match, "head_pose_forward_ratio")}
- 보정 집중도: ${readMetric(match, "head_attention_score_adjusted")}
기존 리포트 핵심 내용:
${sanitizeReportText(match.report || "")}`;
    })
    .join("\n\n");
}

function getSimilarReportMatchConfig() {
  const matchCount = Number(process.env.SIMILAR_REPORT_MATCH_COUNT ?? 4);
  const matchThreshold = Number(process.env.SIMILAR_REPORT_MATCH_THRESHOLD ?? 0.15);

  return {
    matchCount: Number.isFinite(matchCount) ? Math.min(Math.max(Math.round(matchCount), 1), 8) : 4,
    matchThreshold: Number.isFinite(matchThreshold) ? matchThreshold : 0.15,
  };
}

async function retrieveSimilarReportContext(metrics: NormalizedReportMetrics) {
  const metricEmbedding = await requestGEMINIEmbedding(buildMetricEmbeddingInput(metrics));
  const { matchCount, matchThreshold } = getSimilarReportMatchConfig();

  const { data, error } = await supabase.rpc("match_similar_user_reports", {
    query_embedding: metricEmbedding,
    match_count: matchCount,
    match_threshold: matchThreshold,
    exclude_result_id: null,
  });

  if (error) {
    console.error("Similar report retrieval failed in /api/generate-report:", error);
    return { context: "", embedding: metricEmbedding };
  }

  return {
    context: formatSimilarReportContext((data ?? []) as SimilarReportMatch[]),
    embedding: metricEmbedding,
  };
}

function buildReportPrompt(
  metrics: NormalizedReportMetrics,
  retrievedContext: string,
  similarReportContext: string,
) {
  return `다음 입력을 바탕으로 ADHD 스크리닝 리포트를 작성해 주세요.

현재 사용자 입력:
${JSON.stringify(metrics, null, 2)}

논문/해석 기준 RAG 참고 문맥:
${retrievedContext || "없음"}

유사한 과거 리포트 참고 문맥:
${similarReportContext || "없음"}

주의:
- 현재 사용자 입력을 가장 우선하세요.
- 입력에 없는 값은 만들지 마세요.
- RAG 참고 문맥이 있으면 우선 반영하되, 진단처럼 표현하지 마세요.
- 유사한 과거 리포트는 해석 일관성을 높이는 내부 참고 자료로만 사용하세요.
- 최종 리포트에서 "유사 리포트", "과거 사례", "참고 사례"를 직접 언급하지 마세요.
- 과거 리포트 문장을 그대로 복사하지 마세요.
- 모든 문단은 <p>...</p> HTML 형식으로 작성하세요.
- 사용자를 ADHD로 진단하지 말고, 선별검사 결과와 가능성 중심으로 설명하세요.
- 머리 회전 변동성은 과제 중 자세 변화의 일관성을 보여주는 보조 지표로 설명하세요.
- 정면 유지 비율이 낮거나 보정 집중도가 낮으면 과제 중 주의가 흔들렸을 가능성을 부드럽게 설명하세요.
- head_rotation_variability가 12 이상이거나, head_pose_forward_ratio가 80 미만이거나, head_attention_score_adjusted가 65 미만이면 머리 자세 기반 집중 상태를 안정적이거나 높은 수준이라고 표현하지 마세요.
- 위 조건에 해당하면 머리 방향 변화가 잦았고 과제 몰입이 흔들렸을 가능성을 명시하세요.
- 문장은 차분하고 불안감을 과도하게 주지 않는 톤으로 작성하세요.
- 마지막 문단에는 이 결과가 진단이 아니라 선별검사 결과이며, 필요 시 전문의 상담이 필요하다는 점을 포함하세요.`;
}

function extractTextFromLLMResponse(data: GeminiResponse) {
  return (
    data?.candidates?.[0]?.content?.parts?.map((part) => part?.text ?? "").join("") ||
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    data?.text ||
    data?.content ||
    data?.output_text ||
    ""
  );
}

function ensureHtmlParagraphs(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("LLM response did not include report text.");
  }

  if (/<p[\s>]/i.test(trimmed)) {
    return trimmed;
  }

  return trimmed
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("");
}

async function generateReportWithLLM(metrics: NormalizedReportMetrics) {
  const [retrievedContext, similarReportResult] = await Promise.all([
    retrieveRagContext(metrics),
    retrieveSimilarReportContext(metrics),
  ]);
  const prompt = buildReportPrompt(metrics, retrievedContext, similarReportResult.context);
  const data = await requestGEMINILLM({
    prompt,
    systemInstruction: ADHD_REPORT_SYSTEM_PROMPT,
    model: process.env.GEMINI_LLM_MODEL ?? "gemini-2.5-flash",
    temperature: 0.45,
    max_tokens: 4200,
    topK: 40,
    topP: 0.9,
  });

  return {
    report: ensureHtmlParagraphs(extractTextFromLLMResponse(data)),
    metricEmbedding: similarReportResult.embedding,
  };
}

export async function POST(req: Request) {
  let stage = "parse-request";

  try {
    const body = (await req.json()) as Record<string, unknown>;
    stage = "normalize-metrics";
    const metrics = normalizeReportMetrics(body);
    const riskScores = buildRiskScoreSnapshot(metrics);

    stage = "generate-report";
    const generated = await generateReportWithLLM(metrics);

    stage = "save-report";
    const { data, error } = await supabase
      .from("user_results")
      .insert({
        created_at: getKoreanTimestamp(),
        ...metrics,
        report: generated.report,
        metric_snapshot: metrics,
        risk_scores: riskScores,
        risk_score: riskScores.total,
        survey_risk_score: riskScores.survey,
        behavior_risk_score: riskScores.behavior,
        profile_type: "user",
        embedding: generated.metricEmbedding,
        embedding_model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error in /api/generate-report:", error);
      return NextResponse.json(
        { success: false, stage, error: error.message, details: error, supabaseUrl },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data, id: data?.id });
  } catch (err) {
    console.error(`Error in /api/generate-report at ${stage}:`, err);
    return NextResponse.json(
      { success: false, stage, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
