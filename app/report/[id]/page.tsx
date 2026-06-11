"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ReportData = {
  id: string;
  created_at: string;
  final_risk_level: string | null;
  report: string | null;
  inattention_count: number;
  hyperactivity_count: number;
  cpt_attention: number;
  cpt_timeliness: number;
  cpt_impulsivity: number;
  cpt_hyperactivity: number;
  gaze_off_task_ratio: number;
  head_movement_variability: number;
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
    report.head_rotation_variability ?? report.head_movement_variability ?? 0;
  const headForwardRatio = report.head_pose_forward_ratio ?? 0;
  const headAdjustedAttention = report.head_attention_score_adjusted ?? 0;
  const cptHitCount = report.cpt_attention ?? 0;
  const cptOmitCount = report.inattention_count ?? 0;
  const cptTargetCount = cptHitCount + cptOmitCount;
  const cptNonTargetCount = Math.max(0, CPT_TOTAL_TRIALS - cptTargetCount);

  const inattentionRisk = clamp((report.inattention_count / 9) * 100);
  const hyperactivityRisk = clamp((report.hyperactivity_count / 9) * 100);
  const omissionRisk = cptTargetCount > 0
    ? clamp((cptOmitCount / cptTargetCount) * 100)
    : 0;
  const impulsivityRisk = cptNonTargetCount > 0
    ? clamp((report.cpt_impulsivity / cptNonTargetCount) * 100)
    : 0;
  const gazeRisk = clamp(report.gaze_off_task_ratio);
  const movementRisk = clamp(
    Math.round(
      headRotationVariability * 2.8 +
        Math.max(0, 85 - headForwardRatio) * 0.7 +
        Math.max(0, 75 - headAdjustedAttention) * 0.6,
    ),
  );

  return [
    {
      label: "부주의 경향",
      value: `${report.inattention_count}개`,
      detail: "설문에서 주의 유지나 산만함과 관련된 응답 수입니다.",
      score: inattentionRisk,
      tone: getTone(inattentionRisk),
    },
    {
      label: "과잉행동·충동성",
      value: `${report.hyperactivity_count}개`,
      detail: "설문에서 안절부절못함이나 충동 반응과 관련된 응답 수입니다.",
      score: hyperactivityRisk,
      tone: getTone(hyperactivityRisk),
    },
    {
      label: "주의 지속성",
      value: `누락 ${Math.round(omissionRisk)}%`,
      detail: `CPT 목표 자극 ${cptTargetCount}회 중 ${cptOmitCount}회를 놓친 비율입니다.`,
      score: omissionRisk,
      tone: getTone(omissionRisk),
    },
    {
      label: "반응 조절",
      value: `오경보 ${Math.round(impulsivityRisk)}%`,
      detail: `CPT 비표적 자극 ${cptNonTargetCount}회 중 ${report.cpt_impulsivity}회 반응한 비율입니다.`,
      score: impulsivityRisk,
      tone: getTone(impulsivityRisk),
    },
    {
      label: "시선 이탈",
      value: percent(report.gaze_off_task_ratio),
      detail: "과제 영역 밖으로 시선이 벗어난 비율입니다.",
      score: gazeRisk,
      tone: getTone(gazeRisk),
    },
    {
      label: "머리 자세 변동성",
      value:
        headForwardRatio > 0
          ? `V ${Math.round(headRotationVariability)} / 정면 ${Math.round(headForwardRatio)}%`
          : `${Math.round(headRotationVariability)}`,
      detail:
        headForwardRatio > 0
          ? `머리 회전 변동성, 정면 유지 비율, 보정 집중도 ${Math.round(headAdjustedAttention)}를 함께 반영했습니다.`
          : "검사 중 머리 움직임의 변동성을 보여주는 보조 지표입니다.",
      score: movementRisk,
      tone: getTone(movementRisk),
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
            {getConcernLabel(metric.score)}
          </p>
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${toneClass[metric.tone]}`}
          style={{ width: `${clamp(metric.score)}%` }}
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

  const left = 52;
  const top = 24;
  const plotWidth = 292;
  const plotHeight = 188;
  const right = left + plotWidth;
  const bottom = top + plotHeight;
  const toX = (value: number) => left + (toPlotValue(value) / 100) * plotWidth;
  const toY = (value: number) => top + ((100 - toPlotValue(value)) / 100) * plotHeight;
  const current = visualization.current;
  const mean = visualization.mean;
  const currentX = toX(current.behavior_risk_score);
  const currentY = toY(current.survey_risk_score);
  const meanX = toX(mean.behavior_risk_score);
  const meanY = toY(mean.survey_risk_score);

  return (
    <section className="fast-report-panel mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500">
            Baseline Map
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            표본 50명 대비 현재 위치
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            검은 점은 기존 표본 데이터, 노란 점은 현재 결과입니다. 빨간 기준선은 표본 평균이며
            의학적 진단 기준이 아니라 현재 데이터 안에서의 상대 위치를 보여줍니다.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-500">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">표본</p>
            <p className="mt-1 text-lg font-black text-slate-950">{visualization.baseline_count}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">설문</p>
            <p className="mt-1 text-lg font-black text-slate-950">{current.survey_risk_score}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">수행</p>
            <p className="mt-1 text-lg font-black text-slate-950">{current.behavior_risk_score}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
        <svg
          viewBox="0 0 380 258"
          role="img"
          aria-label="표본 50명 대비 설문 위험도와 디지털 수행 위험도 산점도"
          className="h-auto w-full bg-white"
        >
          <rect x={left} y={top} width={plotWidth} height={plotHeight} fill="#f8fafc" />
          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={`grid-${tick}`}>
              <line
                x1={toX(tick)}
                y1={top}
                x2={toX(tick)}
                y2={bottom}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <line
                x1={left}
                y1={toY(tick)}
                x2={right}
                y2={toY(tick)}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            </g>
          ))}
          <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#0f172a" strokeWidth="2" />
          <line x1={left} y1={top} x2={left} y2={bottom} stroke="#0f172a" strokeWidth="2" />
          <line
            x1={left}
            y1={meanY}
            x2={right}
            y2={meanY}
            stroke="#ef4444"
            strokeDasharray="5 5"
            strokeWidth="1.5"
            opacity="0.8"
          />
          <line
            x1={meanX}
            y1={top}
            x2={meanX}
            y2={bottom}
            stroke="#ef4444"
            strokeDasharray="5 5"
            strokeWidth="1.5"
            opacity="0.8"
          />

          {visualization.baseline.map((point, index) => (
            <circle
              key={`${point.id}-${index}`}
              cx={toX(point.behavior_risk_score)}
              cy={toY(point.survey_risk_score)}
              r="3.2"
              fill="#0f172a"
              opacity="0.24"
            />
          ))}

          <circle cx={currentX} cy={currentY} r="12" fill="#facc15" opacity="0.25" />
          <circle cx={currentX} cy={currentY} r="7" fill="#facc15" stroke="#0f172a" strokeWidth="2" />
          <text
            x={Math.min(currentX + 12, right - 44)}
            y={Math.max(currentY - 12, top + 14)}
            fill="#0f172a"
            fontSize="11"
            fontWeight="800"
          >
            현재
          </text>

          <text x={left - 12} y={top + 8} textAnchor="end" fill="#475569" fontSize="11" fontWeight="800">
            설문 위험도
          </text>
          <text x={right} y={bottom + 28} textAnchor="end" fill="#475569" fontSize="11" fontWeight="800">
            디지털 수행 위험도
          </text>
          <text x={left} y={bottom + 18} textAnchor="middle" fill="#94a3b8" fontSize="10">
            0
          </text>
          <text x={right} y={bottom + 18} textAnchor="middle" fill="#94a3b8" fontSize="10">
            100
          </text>
          <text x={left - 14} y={bottom + 3} textAnchor="end" fill="#94a3b8" fontSize="10">
            0
          </text>
          <text x={left - 14} y={top + 4} textAnchor="end" fill="#94a3b8" fontSize="10">
            100
          </text>
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-950 opacity-40" />
          표본 데이터
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-amber-700">
          <span className="h-2.5 w-2.5 rounded-full border border-slate-950 bg-amber-300" />
          현재 결과
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-2 text-rose-600">
          <span className="h-px w-5 border-t border-dashed border-rose-500" />
          표본 평균선
        </span>
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
        const res = await fetch(`/api/analyze?id=${encodeURIComponent(id)}`);
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
    if (!metrics.length) return 0;
    return Math.round(metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length);
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
