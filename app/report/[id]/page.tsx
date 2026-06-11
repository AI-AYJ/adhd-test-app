"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ReportData = {
  id: string;
  created_at: string;
  final_risk_level: string | null;
  report: string | null;
  inattention_count: number | null;
  hyperactivity_count: number | null;
  cpt_attention: number | null;
  cpt_timeliness: number | null;
  cpt_impulsivity: number | null;
  cpt_hyperactivity: number | null;
  gaze_off_task_ratio: number | null;
  head_movement_variability: number | null;
  head_rotation_variability?: number | null;
  head_pose_forward_ratio?: number | null;
  head_attention_score_adjusted?: number | null;
  risk_score?: number | null;
  survey_risk_score?: number | null;
  behavior_risk_score?: number | null;
  baseline_visualization?: BaselineVisualization | null;
};

type StoredReview = {
  id: string;
  report_id: string | null;
  rating: number;
  content: string;
  created_at: string;
};

type MetricTone = "emerald" | "amber" | "rose" | "blue";

type Metric = {
  label: string;
  value: string;
  detail: string;
  score: number;
  tone: MetricTone;
  measured: boolean;
};

type RiskPoint = {
  id: string;
  survey_risk_score: number;
  behavior_risk_score: number;
  risk_score: number;
};

type BaselineVisualization = {
  current: RiskPoint;
  baseline: RiskPoint[];
  baseline_count: number;
  mean: {
    survey_risk_score: number;
    behavior_risk_score: number;
    risk_score: number;
  };
};

const toneClass: Record<MetricTone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  blue: "bg-blue-500",
};

const LOCAL_REVIEW_STORAGE_KEY = "fast-review-cache";
const REVIEW_STARS = [1, 2, 3, 4, 5];
const CPT_TOTAL_TRIALS = 20;

function readStoredReviews() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_REVIEW_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as StoredReview[]) : [];
  } catch {
    return [];
  }
}

function saveStoredReview(review: StoredReview) {
  if (typeof window === "undefined") return;

  const previous = readStoredReviews();
  const next = [
    review,
    ...previous.filter(
      (item) => item.id !== review.id && item.report_id !== review.report_id,
    ),
  ].slice(0, 50);

  window.localStorage.setItem(LOCAL_REVIEW_STORAGE_KEY, JSON.stringify(next));
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function isMeasuredNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function measuredValue(value: number | null | undefined, fallback = 0) {
  return isMeasuredNumber(value) ? value : fallback;
}

function getTone(score: number): MetricTone {
  if (score >= 70) return "rose";
  if (score >= 40) return "amber";
  return "emerald";
}

function getConcernLabel(score: number) {
  if (score >= 70) return "높은 주의";
  if (score >= 40) return "관찰 필요";
  return "양호 범위";
}

function buildMetrics(report: ReportData): Metric[] {
  const headRotationVariability =
    report.head_rotation_variability ?? report.head_movement_variability ?? null;
  const headForwardRatio = report.head_pose_forward_ratio ?? null;
  const headAdjustedAttention = report.head_attention_score_adjusted ?? null;
  const inattentionCount = measuredValue(report.inattention_count);
  const hyperactivityCount = measuredValue(report.hyperactivity_count);
  const cptHitCount = measuredValue(report.cpt_attention);
  const cptOmitCount = inattentionCount;
  const cptImpulsivityCount = measuredValue(report.cpt_impulsivity);
  const cptTargetCount = cptHitCount + cptOmitCount;
  const cptNonTargetCount = Math.max(0, CPT_TOTAL_TRIALS - cptTargetCount);
  const gazeValue = measuredValue(report.gaze_off_task_ratio);
  const headRotationValue = measuredValue(headRotationVariability);
  const headForwardValue = measuredValue(headForwardRatio);
  const headAdjustedAttentionValue = measuredValue(headAdjustedAttention);
  const inattentionMeasured = isMeasuredNumber(report.inattention_count);
  const hyperactivityMeasured = isMeasuredNumber(report.hyperactivity_count);
  const omissionMeasured = inattentionMeasured && isMeasuredNumber(report.cpt_attention);
  const impulsivityMeasured = isMeasuredNumber(report.cpt_impulsivity);
  const gazeMeasured = isMeasuredNumber(report.gaze_off_task_ratio);
  const movementMeasured =
    isMeasuredNumber(headRotationVariability) &&
    isMeasuredNumber(headForwardRatio) &&
    isMeasuredNumber(headAdjustedAttention);

  const inattentionRisk = inattentionMeasured
    ? clamp((inattentionCount / 9) * 100)
    : 0;
  const hyperactivityRisk = hyperactivityMeasured
    ? clamp((hyperactivityCount / 9) * 100)
    : 0;
  const omissionRisk = omissionMeasured && cptTargetCount > 0
    ? clamp((cptOmitCount / cptTargetCount) * 100)
    : 0;
  const impulsivityRisk = impulsivityMeasured && cptNonTargetCount > 0
    ? clamp((cptImpulsivityCount / cptNonTargetCount) * 100)
    : 0;
  const gazeRisk = gazeMeasured ? clamp(gazeValue) : 0;
  const movementRisk = movementMeasured
    ? clamp(
        Math.round(
          headRotationValue * 2.8 +
            Math.max(0, 85 - headForwardValue) * 0.7 +
            Math.max(0, 75 - headAdjustedAttentionValue) * 0.6,
        ),
      )
    : 0;

  return [
    {
      label: "부주의 경향",
      value: inattentionMeasured ? `${inattentionCount}개` : "측정 실패",
      detail: "설문에서 주의 유지나 산만함과 관련된 응답 수입니다.",
      score: inattentionRisk,
      tone: inattentionMeasured ? getTone(inattentionRisk) : "blue",
      measured: inattentionMeasured,
    },
    {
      label: "과잉행동·충동성",
      value: hyperactivityMeasured ? `${hyperactivityCount}개` : "측정 실패",
      detail: "설문에서 안절부절못함이나 충동 반응과 관련된 응답 수입니다.",
      score: hyperactivityRisk,
      tone: hyperactivityMeasured ? getTone(hyperactivityRisk) : "blue",
      measured: hyperactivityMeasured,
    },
    {
      label: "주의 지속성",
      value: omissionMeasured ? `누락 ${Math.round(omissionRisk)}%` : "측정 실패",
      detail: omissionMeasured
        ? `CPT 목표 자극 ${cptTargetCount}회 중 ${cptOmitCount}회를 놓친 비율입니다.`
        : "CPT 목표 자극 반응 데이터가 충분하지 않아 산출하지 못했습니다.",
      score: omissionRisk,
      tone: omissionMeasured ? getTone(omissionRisk) : "blue",
      measured: omissionMeasured,
    },
    {
      label: "반응 조절",
      value: impulsivityMeasured ? `오경보 ${Math.round(impulsivityRisk)}%` : "측정 실패",
      detail: impulsivityMeasured
        ? `CPT 비표적 자극 ${cptNonTargetCount}회 중 ${cptImpulsivityCount}회 반응한 비율입니다.`
        : "CPT 비표적 자극 반응 데이터가 충분하지 않아 산출하지 못했습니다.",
      score: impulsivityRisk,
      tone: impulsivityMeasured ? getTone(impulsivityRisk) : "blue",
      measured: impulsivityMeasured,
    },
    {
      label: "시선 이탈",
      value: gazeMeasured ? percent(gazeValue) : "측정 실패",
      detail: "과제 영역 밖으로 시선이 벗어난 비율입니다.",
      score: gazeRisk,
      tone: gazeMeasured ? getTone(gazeRisk) : "blue",
      measured: gazeMeasured,
    },
    {
      label: "머리 자세 변동성",
      value: movementMeasured ? `정면 ${Math.round(headForwardValue)}%` : "측정 실패",
      detail: movementMeasured
        ? `머리 회전 변동성, 정면 유지 비율, 보정 집중도 ${Math.round(headAdjustedAttentionValue)}를 함께 반영했습니다.`
        : "머리 자세 데이터가 충분하지 않아 산출하지 못했습니다.",
      score: movementRisk,
      tone: movementMeasured ? getTone(movementRisk) : "blue",
      measured: movementMeasured,
    },
  ];
}

function MetricBar({ metric }: { metric: Metric }) {
  return (
    <div className="fast-report-metric rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-950">{metric.label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{metric.detail}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-slate-950">{metric.value}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500">
            {metric.measured ? getConcernLabel(metric.score) : "미완료"}
          </p>
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${metric.measured ? toneClass[metric.tone] : "bg-slate-300"}`}
          style={{ width: `${metric.measured ? clamp(metric.score) : 100}%` }}
        />
      </div>
    </div>
  );
}

function toPlotValue(value: number) {
  return clamp(Number.isFinite(value) ? value : 0);
}

function BaselinePositionScatter({
  visualization,
}: {
  visualization?: BaselineVisualization | null;
}) {
  if (!visualization || !visualization.baseline.length) {
    return null;
  }

  const current = visualization.current;
  const mean = visualization.mean;
  const baselineCount = visualization.baseline.length;
  const lowerOrEqualCount = visualization.baseline.filter(
    (point) => point.risk_score <= current.risk_score,
  ).length;
  const percentile = Math.round((lowerOrEqualCount / Math.max(1, baselineCount)) * 100);
  const curveLeft = 42;
  const curveTop = 22;
  const curveWidth = 636;
  const curveHeight = 218;
  const curveBottom = curveTop + curveHeight;
  const densityBins = [
    { label: "0", min: 0, max: 10 },
    { label: "10", min: 11, max: 20 },
    { label: "20", min: 21, max: 30 },
    { label: "30", min: 31, max: 40 },
    { label: "40", min: 41, max: 50 },
    { label: "50", min: 51, max: 60 },
    { label: "60", min: 61, max: 70 },
    { label: "70", min: 71, max: 80 },
    { label: "80", min: 81, max: 90 },
    { label: "90", min: 91, max: 100 },
  ].map((bin) => ({
    ...bin,
    count: visualization.baseline.filter((point) => {
      const score = toPlotValue(point.risk_score);
      return score >= bin.min && score <= bin.max;
    }).length,
  }));
  const densityCounts = densityBins.map((bin) => bin.count);
  const maxDensity = Math.max(...densityCounts, 1);
  const curvePoints = densityCounts.map((count, index) => {
    const x = curveLeft + (index / Math.max(1, densityCounts.length - 1)) * curveWidth;
    const y = curveBottom - (count / maxDensity) * (curveHeight - 18);
    return { x, y, count };
  });
  const curvePath = curvePoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${curvePath} L ${curveLeft + curveWidth} ${curveBottom} L ${curveLeft} ${curveBottom} Z`;
  const currentX = curveLeft + (toPlotValue(current.risk_score) / 100) * curveWidth;
  const currentBinIndex = Math.min(
    densityCounts.length - 1,
    Math.max(0, Math.floor(toPlotValue(current.risk_score) / 10)),
  );
  const currentDensityY = curvePoints[currentBinIndex]?.y ?? curveBottom;
  const meanX = curveLeft + (toPlotValue(mean.risk_score) / 100) * curveWidth;

  return (
    <section className="fast-report-panel mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-500">
                Baseline
              </p>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-500">
                표본 {visualization.baseline_count}명
              </span>
            </div>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">
              표본 대비 위치
            </h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
              표본 50명의 최종 점수 구간 분포를 곡선으로 보여줍니다. 노란 마커는 현재 결과의
              위치입니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:w-[420px]">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                최종 점수
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">
                {current.risk_score}
                <span className="ml-1 text-xs font-bold text-slate-400">
                  평균 {mean.risk_score}
                </span>
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                표본 내 위치
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">
                {percentile}
                <span className="ml-1 text-xs font-bold text-slate-400">%</span>
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                기준 인원
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">
                {baselineCount}
                <span className="ml-1 text-xs font-bold text-slate-400">명</span>
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
            <svg
              viewBox="0 0 720 300"
              role="img"
              aria-label="표본 최종 점수 밀도 곡선과 현재 결과 위치"
              className="h-auto w-full bg-white"
            >
              <rect x="0" y="0" width="720" height="300" fill="#ffffff" />
              {[0, 25, 50, 75, 100].map((tick) => {
                const x = curveLeft + (tick / 100) * curveWidth;

                return (
                  <g key={`density-grid-${tick}`}>
                    <line
                      x1={x}
                      y1={curveTop}
                      x2={x}
                      y2={curveBottom}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                    />
                    <text x={x} y={curveBottom + 24} textAnchor="middle" fill="#94a3b8" fontSize="10">
                      {tick}
                    </text>
                  </g>
                );
              })}
              <line
                x1={curveLeft}
                y1={curveBottom}
                x2={curveLeft + curveWidth}
                y2={curveBottom}
                stroke="#334155"
                strokeWidth="1.6"
              />
              <path d={areaPath} fill="#dbeafe" opacity="0.62" />
              <path d={curvePath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
              {curvePoints.map((point, index) => (
                <circle
                  key={`density-point-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="2.8"
                  fill="#2563eb"
                  opacity="0.42"
                />
              ))}
              <line
                x1={meanX}
                y1={curveTop + 10}
                x2={meanX}
                y2={curveBottom}
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth="1.6"
                opacity="0.72"
              />
              <line
                x1={currentX}
                y1={curveBottom}
                x2={currentX}
                y2={Math.min(currentDensityY - 10, curveBottom - 40)}
                stroke="#facc15"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx={currentX} cy={Math.min(currentDensityY - 16, curveBottom - 48)} r="15" fill="#facc15" opacity="0.28" />
              <circle
                cx={currentX}
                cy={Math.min(currentDensityY - 16, curveBottom - 48)}
                r="8"
                fill="#facc15"
                stroke="#0f172a"
                strokeWidth="2"
              />
              <text x={curveLeft} y={curveTop + 10} fill="#64748b" fontSize="11" fontWeight="800">
                표본 밀도
              </text>
              <text x={curveLeft + curveWidth} y={curveBottom + 42} textAnchor="end" fill="#64748b" fontSize="11" fontWeight="800">
                최종 점수
              </text>
            </svg>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-5 rounded-full bg-blue-200" />
              표본 분포
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <span className="h-2 w-2 rounded-full border border-slate-900 bg-amber-300" />
              현재 위치
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-500">
              <span className="h-px w-5 border-t border-dashed border-rose-400" />
              표본 평균
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ReportDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/analyze?id=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || `서버 오류: ${res.status}`);
        }

        setReport(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      void loadReport();
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setReviewSubmitted(readStoredReviews().some((review) => review.report_id === id));
  }, [id]);

  const metrics = useMemo(() => (report ? buildMetrics(report) : []), [report]);
  const totalScore = useMemo(() => {
    const measuredMetrics = metrics.filter((metric) => metric.measured);
    if (!measuredMetrics.length) return 0;

    return Math.round(
      measuredMetrics.reduce((sum, metric) => sum + metric.score, 0) / measuredMetrics.length,
    );
  }, [metrics]);
  const trimmedReviewContent = reviewContent.trim();

  const submitReview = async () => {
    setReviewError(null);
    setReviewNotice(null);

    if (!trimmedReviewContent) {
      setReviewError("리뷰 내용을 입력해 주세요.");
      return;
    }

    setReviewSubmitting(true);

    const fallbackReview: StoredReview = {
      id: `local-${Date.now()}`,
      report_id: id,
      rating: reviewRating,
      content: trimmedReviewContent.slice(0, 500),
      created_at: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: id,
          rating: reviewRating,
          content: trimmedReviewContent,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "리뷰 저장에 실패했습니다.");
      }

      const savedReview = (json.data ?? fallbackReview) as StoredReview;
      saveStoredReview(savedReview);
      setReviewNotice("리뷰가 저장되었습니다. 홈 하단 리뷰 영역에 반영됩니다.");
      setReviewSubmitted(true);
      setReviewOpen(false);
    } catch (err) {
      console.error("Review submission failed; saved locally instead:", err);
      saveStoredReview(fallbackReview);
      setReviewNotice("리뷰가 저장되었습니다. 홈 하단 리뷰 영역에 반영됩니다.");
      setReviewSubmitted(true);
      setReviewOpen(false);
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fast-report-page min-h-screen px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          리포트를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="fast-report-page min-h-screen px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">
          <p className="font-black">오류 발생</p>
          <p className="mt-2">{error || "리포트를 찾을 수 없습니다."}</p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-full bg-rose-600 px-5 py-3 text-sm font-black text-white transition hover:bg-rose-700"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fast-report-page min-h-screen text-slate-900">
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:py-12">
        <section className="fast-report-hero rounded-[2.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="fast-report-eyebrow text-xs font-black uppercase tracking-[0.28em] text-blue-600">
                ADHD Screening Report
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                주의 특성 종합 리포트
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                이 리포트는 설문, CPT 수행, 시선 추적, 머리 자세 지표를 함께 본 선별검사 결과입니다.
                의료적 진단을 확정하는 자료가 아니라 행동 특성을 참고하기 위한 보조 자료입니다.
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-500">
                검사일: {new Date(report.created_at).toLocaleString("ko-KR")}
              </p>
            </div>

            <div className="fast-report-score-card min-w-[220px] rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                종합 위험도
              </p>
              <p className="mt-3 text-4xl font-black text-slate-950">{totalScore}</p>
              <p className="mt-1 text-sm font-bold text-slate-600">
                {report.final_risk_level || getConcernLabel(totalScore)}
              </p>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full rounded-full ${toneClass[getTone(totalScore)]}`}
                  style={{ width: `${totalScore}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <MetricBar key={metric.label} metric={metric} />
          ))}
        </section>

        <BaselinePositionScatter visualization={report.baseline_visualization} />

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <article className="fast-report-panel rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.26em] text-blue-600">
                  LLM Clinical Summary
                </p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                  해석 요약
                </h2>
              </div>
            </div>
            <div className="fast-report-prose mt-6 space-y-4 text-[15px] leading-8 text-slate-700 [&_p]:mb-4 [&_strong]:text-slate-950">
              {report.report ? (
                <div dangerouslySetInnerHTML={{ __html: report.report }} />
              ) : (
                <p className="text-slate-500">리포트 내용이 없습니다.</p>
              )}
            </div>
          </article>

          <aside className="fast-report-panel fast-report-side-panel rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
              해석 안내
            </p>
            <h2 className="mt-3 text-xl font-black text-slate-950">다음 단계</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <p>
                검사 결과는 당일 컨디션, 조명, 카메라 위치, 수행 환경의 영향을 받을 수 있습니다.
              </p>
              <p>
                일상 기능에서의 어려움이 함께 보인다면 정신건강의학과 전문의나 임상심리 전문가와의
                추가 평가를 권장합니다.
              </p>
              <p>
                설문 결과, 과제 수행, 학교나 직장 상황, 과거력까지 함께 보아야 더 정확한 해석이
                가능합니다.
              </p>
            </div>
          </aside>
        </section>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-50"
          >
            새 검사 시작
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            리포트 인쇄
          </button>
        </div>

        <section className="fast-report-panel mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
                Review
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                검사 경험 리뷰
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                별점과 짧은 후기를 남기면 홈 화면 하단 리뷰 카드에 반영됩니다.
              </p>
            </div>

            {!reviewOpen && !reviewSubmitted ? (
              <button
                type="button"
                onClick={() => setReviewOpen(true)}
                className="inline-flex items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300"
              >
                리뷰 적기
              </button>
            ) : null}
          </div>

          {reviewOpen ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div>
                <p className="text-sm font-black text-slate-900">별점 선택</p>
                <div className="mt-3 flex gap-2">
                  {REVIEW_STARS.map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      aria-label={`${star}점 선택`}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border text-2xl transition ${
                        star <= reviewRating
                          ? "border-amber-300 bg-amber-100 text-amber-500"
                          : "border-slate-200 bg-white text-slate-300 hover:border-amber-200 hover:text-amber-400"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-black text-slate-900">리뷰 내용</span>
                <textarea
                  value={reviewContent}
                  onChange={(event) => setReviewContent(event.target.value.slice(0, 500))}
                  rows={5}
                  className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  placeholder="검사 과정이나 결과 확인 경험을 적어주세요."
                />
              </label>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-slate-400">
                  {trimmedReviewContent.length} / 500
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewOpen(false);
                      setReviewError(null);
                    }}
                    className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={submitReview}
                    disabled={reviewSubmitting}
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {reviewSubmitting ? "저장 중..." : "리뷰 저장"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {reviewError ? (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
              {reviewError}
            </p>
          ) : null}

          {reviewNotice ? (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              {reviewNotice}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
