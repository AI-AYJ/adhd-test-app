export type NormalizedReportMetrics = {
  inattention_count: number;
  hyperactivity_count: number;
  cpt_attention: number;
  cpt_timeliness: number;
  cpt_impulsivity: number;
  cpt_hyperactivity: number;
  gaze_off_task_ratio: number;
  head_movement_variability: number;
  head_pose_forward_ratio: number;
  head_pose_left_ratio: number;
  head_pose_right_ratio: number;
  head_pose_down_ratio: number;
  head_yaw_std: number;
  head_pitch_std: number;
  head_roll_std: number;
  head_rotation_variability: number;
  head_attention_score: number;
  head_attention_score_adjusted: number;
  head_pose_raw: Record<string, unknown> | null;
  final_risk_level: string;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toJsonObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function normalizeReportMetrics(body: Record<string, unknown>): NormalizedReportMetrics {
  const headRotationVariability = toNumber(
    body.head_rotation_variability ?? body.head_movement_variability,
  );

  return {
    inattention_count: toNumber(body.inattention_count),
    hyperactivity_count: toNumber(body.hyperactivity_count),
    cpt_attention: toNumber(body.cpt_attention),
    cpt_timeliness: toNumber(body.cpt_timeliness),
    cpt_impulsivity: toNumber(body.cpt_impulsivity),
    cpt_hyperactivity: toNumber(body.cpt_hyperactivity),
    gaze_off_task_ratio: toNumber(body.gaze_off_task_ratio),
    head_movement_variability: headRotationVariability,
    head_pose_forward_ratio: toNumber(body.head_pose_forward_ratio),
    head_pose_left_ratio: toNumber(body.head_pose_left_ratio),
    head_pose_right_ratio: toNumber(body.head_pose_right_ratio),
    head_pose_down_ratio: toNumber(body.head_pose_down_ratio),
    head_yaw_std: toNumber(body.head_yaw_std),
    head_pitch_std: toNumber(body.head_pitch_std),
    head_roll_std: toNumber(body.head_roll_std),
    head_rotation_variability: headRotationVariability,
    head_attention_score: toNumber(body.head_attention_score),
    head_attention_score_adjusted: toNumber(body.head_attention_score_adjusted),
    head_pose_raw: toJsonObject(body.head_pose_raw),
    final_risk_level:
      typeof body.final_risk_level === "string" && body.final_risk_level.trim()
        ? body.final_risk_level
        : "분석 완료",
  };
}

export function buildMetricProfileText(metrics: NormalizedReportMetrics) {
  return [
    "ADHD 스크리닝 지표 프로필",
    `ASRS 부주의 응답 수: ${metrics.inattention_count}`,
    `ASRS 과잉행동 및 충동성 응답 수: ${metrics.hyperactivity_count}`,
    `CPT 주의 지표: ${metrics.cpt_attention}`,
    `CPT 반응 속도 및 일관성 지표: ${metrics.cpt_timeliness}`,
    `CPT 충동성 지표: ${metrics.cpt_impulsivity}`,
    `CPT 과잉행동 보조 지표: ${metrics.cpt_hyperactivity}`,
    `시선 이탈 비율: ${metrics.gaze_off_task_ratio}`,
    `머리 움직임 변동성: ${metrics.head_movement_variability}`,
    `머리 회전 변동성: ${metrics.head_rotation_variability}`,
    `정면 유지 비율: ${metrics.head_pose_forward_ratio}`,
    `보정 집중도: ${metrics.head_attention_score_adjusted}`,
    `좌측 회전 비율: ${metrics.head_pose_left_ratio}`,
    `우측 회전 비율: ${metrics.head_pose_right_ratio}`,
    `하방 회전 비율: ${metrics.head_pose_down_ratio}`,
    `시스템 1차 참고 위험도: ${metrics.final_risk_level}`,
  ].join("\n");
}

export function buildMetricEmbeddingInput(metrics: NormalizedReportMetrics) {
  return `task: sentence similarity | query: ${buildMetricProfileText(metrics)}`;
}
