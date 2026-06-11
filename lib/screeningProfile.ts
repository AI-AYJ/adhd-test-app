export type NormalizedReportMetrics = {
  inattention_count: number | null;
  hyperactivity_count: number | null;
  cpt_attention: number | null;
  cpt_timeliness: number | null;
  cpt_impulsivity: number | null;
  cpt_hyperactivity: number | null;
  gaze_off_task_ratio: number | null;
  head_movement_variability: number | null;
  head_pose_forward_ratio: number | null;
  head_pose_left_ratio: number | null;
  head_pose_right_ratio: number | null;
  head_pose_down_ratio: number | null;
  head_yaw_std: number | null;
  head_pitch_std: number | null;
  head_roll_std: number | null;
  head_rotation_variability: number | null;
  head_attention_score: number | null;
  head_attention_score_adjusted: number | null;
  head_pose_raw: Record<string, unknown> | null;
  final_risk_level: string;
};

export type RiskScoreSnapshot = {
  inattention: number | null;
  hyperactivity: number | null;
  omission: number | null;
  impulsivity: number | null;
  gaze: number | null;
  movement: number | null;
  survey: number | null;
  behavior: number | null;
  total: number | null;
};

const CPT_TOTAL_TRIALS = 20;

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isMeasuredNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function toJsonObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function normalizeReportMetrics(body: Record<string, unknown>): NormalizedReportMetrics {
  const headRotationVariability = toNumberOrNull(
    body.head_rotation_variability ?? body.head_movement_variability,
  );

  return {
    inattention_count: toNumberOrNull(body.inattention_count),
    hyperactivity_count: toNumberOrNull(body.hyperactivity_count),
    cpt_attention: toNumberOrNull(body.cpt_attention),
    cpt_timeliness: toNumberOrNull(body.cpt_timeliness),
    cpt_impulsivity: toNumberOrNull(body.cpt_impulsivity),
    cpt_hyperactivity: toNumberOrNull(body.cpt_hyperactivity),
    gaze_off_task_ratio: toNumberOrNull(body.gaze_off_task_ratio),
    head_movement_variability: headRotationVariability,
    head_pose_forward_ratio: toNumberOrNull(body.head_pose_forward_ratio),
    head_pose_left_ratio: toNumberOrNull(body.head_pose_left_ratio),
    head_pose_right_ratio: toNumberOrNull(body.head_pose_right_ratio),
    head_pose_down_ratio: toNumberOrNull(body.head_pose_down_ratio),
    head_yaw_std: toNumberOrNull(body.head_yaw_std),
    head_pitch_std: toNumberOrNull(body.head_pitch_std),
    head_roll_std: toNumberOrNull(body.head_roll_std),
    head_rotation_variability: headRotationVariability,
    head_attention_score: toNumberOrNull(body.head_attention_score),
    head_attention_score_adjusted: toNumberOrNull(body.head_attention_score_adjusted),
    head_pose_raw: toJsonObject(body.head_pose_raw),
    final_risk_level:
      typeof body.final_risk_level === "string" && body.final_risk_level.trim()
        ? body.final_risk_level
        : "분석 완료",
  };
}

function formatMetricValue(value: number | null) {
  return value === null ? "측정 실패" : String(value);
}

export function buildMetricProfileText(metrics: NormalizedReportMetrics) {
  return [
    "ADHD 스크리닝 지표 프로필",
    `ASRS 부주의 응답 수: ${formatMetricValue(metrics.inattention_count)}`,
    `ASRS 과잉행동 및 충동성 응답 수: ${formatMetricValue(metrics.hyperactivity_count)}`,
    `CPT 주의 지표: ${formatMetricValue(metrics.cpt_attention)}`,
    `CPT 반응 속도 및 일관성 지표: ${formatMetricValue(metrics.cpt_timeliness)}`,
    `CPT 충동성 지표: ${formatMetricValue(metrics.cpt_impulsivity)}`,
    `CPT 과잉행동 보조 지표: ${formatMetricValue(metrics.cpt_hyperactivity)}`,
    `시선 이탈 비율: ${formatMetricValue(metrics.gaze_off_task_ratio)}`,
    `머리 움직임 변동성: ${formatMetricValue(metrics.head_movement_variability)}`,
    `머리 회전 변동성: ${formatMetricValue(metrics.head_rotation_variability)}`,
    `정면 유지 비율: ${formatMetricValue(metrics.head_pose_forward_ratio)}`,
    `보정 집중도: ${formatMetricValue(metrics.head_attention_score_adjusted)}`,
    `좌측 회전 비율: ${formatMetricValue(metrics.head_pose_left_ratio)}`,
    `우측 회전 비율: ${formatMetricValue(metrics.head_pose_right_ratio)}`,
    `하방 회전 비율: ${formatMetricValue(metrics.head_pose_down_ratio)}`,
    `시스템 1차 참고 위험도: ${metrics.final_risk_level}`,
  ].join("\n");
}

export function buildMetricEmbeddingInput(metrics: NormalizedReportMetrics) {
  return `task: sentence similarity | query: ${buildMetricProfileText(metrics)}`;
}

export function buildRiskScoreSnapshot(metrics: NormalizedReportMetrics): RiskScoreSnapshot {
  const cptHitCount = metrics.cpt_attention;
  const cptOmitCount = metrics.inattention_count;
  const cptTargetCount =
    isMeasuredNumber(cptHitCount) && isMeasuredNumber(cptOmitCount)
      ? cptHitCount + cptOmitCount
      : null;
  const cptNonTargetCount =
    cptTargetCount === null ? null : Math.max(0, CPT_TOTAL_TRIALS - cptTargetCount);

  const inattention = isMeasuredNumber(metrics.inattention_count)
    ? clamp((metrics.inattention_count / 9) * 100)
    : null;
  const hyperactivity = isMeasuredNumber(metrics.hyperactivity_count)
    ? clamp((metrics.hyperactivity_count / 9) * 100)
    : null;
  const omission =
    cptTargetCount !== null && cptTargetCount > 0 && isMeasuredNumber(cptOmitCount)
      ? clamp((cptOmitCount / cptTargetCount) * 100)
      : null;
  const impulsivity =
    cptNonTargetCount !== null &&
    cptNonTargetCount > 0 &&
    isMeasuredNumber(metrics.cpt_impulsivity)
      ? clamp((metrics.cpt_impulsivity / cptNonTargetCount) * 100)
      : null;
  const gaze = isMeasuredNumber(metrics.gaze_off_task_ratio)
    ? clamp(metrics.gaze_off_task_ratio)
    : null;
  const movement =
    isMeasuredNumber(metrics.head_rotation_variability) &&
    isMeasuredNumber(metrics.head_pose_forward_ratio) &&
    isMeasuredNumber(metrics.head_attention_score_adjusted)
      ? clamp(
          Math.round(
            metrics.head_rotation_variability * 2.8 +
              Math.max(0, 85 - metrics.head_pose_forward_ratio) * 0.7 +
              Math.max(0, 75 - metrics.head_attention_score_adjusted) * 0.6,
          ),
        )
      : null;
  const survey = averageMeasuredScores([inattention, hyperactivity]);
  const behavior = averageMeasuredScores([omission, impulsivity, gaze, movement]);
  const total = averageMeasuredScores([
    inattention,
    hyperactivity,
    omission,
    impulsivity,
    gaze,
    movement,
  ]);

  return {
    inattention: roundMeasuredScore(inattention),
    hyperactivity: roundMeasuredScore(hyperactivity),
    omission: roundMeasuredScore(omission),
    impulsivity: roundMeasuredScore(impulsivity),
    gaze: roundMeasuredScore(gaze),
    movement: roundMeasuredScore(movement),
    survey,
    behavior,
    total,
  };
}

function roundMeasuredScore(value: number | null) {
  return value === null ? null : Math.round(value);
}

function averageMeasuredScores(values: Array<number | null>) {
  const measured = values.filter(isMeasuredNumber);
  if (!measured.length) return null;

  return Math.round(measured.reduce((sum, value) => sum + value, 0) / measured.length);
}
