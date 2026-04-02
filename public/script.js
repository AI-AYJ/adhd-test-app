import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;

let demosSection = null;
let imageBlendShapes = null;
let videoBlendShapes = null;

let faceLandmarker = undefined;
let runningMode = "IMAGE";
let enableWebcamButton = undefined;
let webcamRunning = false;

let video = null;
let canvasElement = null;
let canvasCtx = null;

const videoWidth = 480;

video = document.getElementById("webcam");
canvasElement = document.getElementById("output_canvas");
canvasCtx = canvasElement?.getContext("2d");

function isSecureContext() {
  return window.isSecureContext || location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
}

function hasGetUserMedia() {
  return !!(navigator.mediaDevices?.getUserMedia);
}

function showCameraError(message) {
  console.warn(message);
  const infoEl = document.getElementById("cameraWarning") || document.createElement("div");
  infoEl.id = "cameraWarning";
  infoEl.style.cssText = "position:fixed;bottom:12px;left:12px;right:12px;padding:12px;border-radius:8px;background:#fee2e2;color:#991b1b;z-index:9999;text-align:center;font-weight:600;";
  infoEl.textContent = message;
  document.body.appendChild(infoEl);
}

if (!isSecureContext()) {
  showCameraError("경고: HTTPS가 아닌 연결에서는 카메라 권한이 거부될 수 있습니다. localhost 또는 HTTPS에서 실행하세요.");
}

if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  if (enableWebcamButton) {
    enableWebcamButton.addEventListener("click", enableCam);
  }
} else {
  showCameraError("getUserMedia()를 지원하지 않는 브라우저입니다. 최신 Chrome/Edge에서 테스트하세요.");
}

function enableCam() {
  if (!faceLandmarker) {
    console.log("Wait! faceLandmarker not loaded yet.");
    return;
  }

  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.querySelector(".mdc-button__label").textContent = "ENABLE WEBCAM";

    if (video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      video.srcObject = null;
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    return;
  } else {
    webcamRunning = true;
    enableWebcamButton.querySelector(".mdc-button__label").textContent = "DISABLE WEBCAM";
  }

  const constraints = {
    video: true,
  };

  if (!hasGetUserMedia()) {
    showCameraError("navigator.mediaDevices.getUserMedia를 사용할 수 없습니다. 브라우저 또는 보안 연결을 확인하세요.");
    return;
  }

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcamLegacy, { once: true });
  }).catch((error) => {
    console.error("enableCam getUserMedia 실패", error);
    analytics.cameraState = "denied";
    showCameraError("카메라 권한이 거부되었습니다. 브라우저에서 권한을 허용해주세요.");
  });
}

let results = undefined;
const drawingUtils = new DrawingUtils(canvasCtx);

async function predictWebcamLegacy() {
  const ratio = video.videoHeight / video.videoWidth;

  video.style.width = videoWidth + "px";
  video.style.height = videoWidth * ratio + "px";

  canvasElement.style.width = videoWidth + "px";
  canvasElement.style.height = videoWidth * ratio + "px";
  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;

  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await faceLandmarker.setOptions({ runningMode });
  }

  const startTimeMs = performance.now();

  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    results = faceLandmarker.detectForVideo(video, startTimeMs);
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (results && results.faceLandmarks) {
    for (const landmarks of results.faceLandmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_TESSELATION,
        { color: "#C0C0C070", lineWidth: 1 }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
        { color: "#FF3030" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
        { color: "#FF3030" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
        { color: "#30FF30" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
        { color: "#30FF30" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
        { color: "#E0E0E0" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LIPS,
        { color: "#E0E0E0" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
        { color: "#FF3030" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
        { color: "#30FF30" }
      );
    }
  }

  canvasCtx.restore();

  drawBlendShapes(videoBlendShapes, results?.faceBlendshapes || []);

  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcamLegacy);
  }
}

function drawBlendShapes(el, blendShapes) {
  if (!blendShapes || !blendShapes.length) {
    el.innerHTML = "";
    return;
  }

  let htmlMaker = "";

  blendShapes[0].categories.forEach((shape) => {
    htmlMaker += `
      <li class="blend-shapes-item">
        <span class="blend-shapes-label">${shape.displayName || shape.categoryName}</span>
        <span class="blend-shapes-value" style="width: calc(${shape.score * 100}% - 140px)">
          ${shape.score.toFixed(4)}
        </span>
      </li>
    `;
  });

  el.innerHTML = htmlMaker;
}


        const questionsPart1 = [
            "마무리해야 하는 세부 작업에서 실수가 생기거나 세부 사항을 놓치는 편이다.",
            "여러 단계를 거쳐야 하는 일을 체계적으로 계획하고 정리하기 어렵다.",
            "약속, 마감, 제출일처럼 일상적인 해야 할 일을 자주 잊는다.",
            "시간이 오래 걸리는 과제는 시작 자체를 미루거나 다른 일로 빠지기 쉽다.",
            "지루하거나 반복적인 일을 할 때 집중이 쉽게 흐트러진다.",
            "오래 집중해야 하는 일을 하다가 다른 생각으로 자주 새어 나간다.",
            "상대가 직접 이야기하고 있어도 끝까지 주의를 유지하기 어렵다.",
            "열쇠, 휴대폰, 지갑처럼 자주 쓰는 물건을 어디에 뒀는지 자주 잊는다.",
            "주변 소리나 움직임 같은 자극 때문에 하던 일에서 쉽게 벗어난다."
        ];

        const questionsPart2 = [
            "앉아 있어야 하는 상황에서도 손발을 계속 움직이거나 자세를 자주 바꾼다.",
            "가만히 있기보다 계속 뭔가를 하고 움직여야 할 것 같은 느낌이 든다.",
            "회의나 수업처럼 앉아 있어야 할 때 중간에 일어나고 싶어진다.",
            "몸이 계속 긴장되거나 불편해서 쉽게 진정되지 않는 편이다.",
            "쉬는 시간에도 편하게 쉬기보다 계속 뭔가를 하게 된다.",
            "대화 중 말이 많아지거나 상대보다 더 많이 이야기하게 되는 편이다.",
            "상대가 말을 끝내기 전에 먼저 답하거나 끼어드는 경우가 있다.",
            "순서를 기다려야 하는 상황에서 끝까지 기다리기 어렵다.",
            "다른 사람이 하는 일이나 대화에 끼어들거나 방해하는 경우가 있다."
        ];

        const likertLabels = ["전혀 없음", "거의 없음", "가끔", "자주", "매우 자주"];
        const circleUIClasses = ["w-16 h-16 md:w-20 md:h-20", "w-12 h-12 md:w-16 md:h-16", "w-10 h-10 md:w-12 md:h-12", "w-12 h-12 md:w-16 md:h-16", "w-16 h-16 md:w-20 md:h-20"];

        const dom = {
            stepIndicator: document.getElementById("stepIndicator"),
            progressBar: document.getElementById("progressBar"),
            step1: document.getElementById("step1"),
            step2: document.getElementById("step2"),
            step3: document.getElementById("step3"),
            part1Questions: document.getElementById("part1-questions"),
            part2Questions: document.getElementById("part2-questions"),
            nextBtn: document.getElementById("nextBtn"),
            prevBtn: document.getElementById("prevBtn"),
            submitBtn: document.getElementById("submitBtn"),
            restartSummaryBtn: document.getElementById("restartSummaryBtn"),
            summaryIntro: document.getElementById("summaryIntro"),
            summaryCards: document.getElementById("summaryCards"),
            summaryHighlights: document.getElementById("summaryHighlights"),
            toggleAdminBtn: document.getElementById("toggleAdminBtn"),
            adminPanel: document.getElementById("adminPanel"),
            adminStatusText: document.getElementById("adminStatusText"),
            refreshAdminBtn: document.getElementById("refreshAdminBtn"),
            adminWebcam: document.getElementById("adminWebcam"),
            adminOverlay: document.getElementById("adminOverlay"),
            adminCameraState: document.getElementById("adminCameraState"),
            adminFacePresence: document.getElementById("adminFacePresence"),
            adminAttentionState: document.getElementById("adminAttentionState"),
            adminAwayRatio: document.getElementById("adminAwayRatio"),
            adminHeadMotion: document.getElementById("adminHeadMotion"),
            adminEuler: document.getElementById("adminEuler"),
            adminQuestionId: document.getElementById("adminQuestionId"),
            adminQuestionMeta: document.getElementById("adminQuestionMeta"),
            adminRawMetrics: document.getElementById("adminRawMetrics"),
            webcam: document.getElementById("webcam"),
            startCptBtn: document.getElementById("startCptBtn")
        };

        const totalQuestions = questionsPart1.length + questionsPart2.length;
        const questionRows = [];
        let currentStep = 1;

        function createRunningStat() {
            return { count: 0, mean: 0, m2: 0 };
        }

        function pushStat(stat, value) {
            stat.count += 1;
            const delta = value - stat.mean;
            stat.mean += delta / stat.count;
            stat.m2 += delta * (value - stat.mean);
        }

        function statStd(stat) {
            if (stat.count < 2) return 0;
            return Math.sqrt(stat.m2 / (stat.count - 1));
        }

        function clamp(value, min, max) {
            return Math.min(max, Math.max(min, value));
        }

        function ratio(numerator, denominator) {
            return denominator > 0 ? numerator / denominator : 0;
        }

        function formatMs(ms) {
            return `${(ms / 1000).toFixed(1)}초`;
        }

        function averagePoint(landmarks, indices) {
            const total = indices.reduce((acc, index) => {
                acc.x += landmarks[index].x;
                acc.y += landmarks[index].y;
                return acc;
            }, { x: 0, y: 0 });

            return { x: total.x / indices.length, y: total.y / indices.length };
        }

        function normalizeRatio(value, min, max) {
            return ((value - min) / Math.max(0.0001, max - min) - 0.5) * 2;
        }

        function estimateGaze(landmarks) {
            const leftIris = averagePoint(landmarks, [468, 469, 470, 471, 472]);
            const rightIris = averagePoint(landmarks, [473, 474, 475, 476, 477]);

            const leftHorizontal = normalizeRatio(leftIris.x, Math.min(landmarks[33].x, landmarks[133].x), Math.max(landmarks[33].x, landmarks[133].x));
            const rightHorizontal = normalizeRatio(rightIris.x, Math.min(landmarks[362].x, landmarks[263].x), Math.max(landmarks[362].x, landmarks[263].x));
            const leftVertical = normalizeRatio(leftIris.y, Math.min(landmarks[159].y, landmarks[145].y), Math.max(landmarks[159].y, landmarks[145].y));
            const rightVertical = normalizeRatio(rightIris.y, Math.min(landmarks[386].y, landmarks[374].y), Math.max(landmarks[386].y, landmarks[374].y));

            return {
                horizontal: (leftHorizontal + rightHorizontal) / 2,
                vertical: (leftVertical + rightVertical) / 2
            };
        }

        function matrixToEuler(matrix) {
            const m00 = matrix[0];
            const m10 = matrix[4];
            const m20 = matrix[8];
            const m21 = matrix[9];
            const m22 = matrix[10];
            const m11 = matrix[5];
            const sy = Math.sqrt(m00 * m00 + m10 * m10);

            let pitch;
            let yaw;
            let roll;

            if (sy > 1e-6) {
                pitch = Math.atan2(m21, m22);
                yaw = Math.atan2(-m20, sy);
                roll = Math.atan2(m10, m00);
            } else {
                pitch = Math.atan2(-matrix[6], m11);
                yaw = Math.atan2(-m20, sy);
                roll = 0;
            }

            const toDeg = (radian) => radian * (180 / Math.PI);
            return { pitch: toDeg(pitch), yaw: toDeg(yaw), roll: toDeg(roll) };
        }

        function metricBucket(score) {
            if (score >= 75) return { tone: "안정적", color: "text-emerald-600" };
            if (score >= 45) return { tone: "보통", color: "text-amber-500" };
            return { tone: "주의 필요", color: "text-rose-600" };
        }

        function questionMetricTemplate(question, part, index) {
            return {
                id: index + 1,
                part,
                question,
                activationCount: 0,
                visibleMs: 0,
                attentiveMs: 0,
                awayMs: 0,
                firstVisibleAt: null,
                answerValue: null,
                responseMs: null,
                rapidResponse: false,
                yaw: createRunningStat(),
                pitch: createRunningStat(),
                roll: createRunningStat()
            };
        }

        function createAnalytics() {
            return {
                startedAt: new Date().toISOString(),
                activeQuestionIndex: null,
                lastSurveyTick: null,
                cameraState: "idle",
                cameraStartedAt: null,
                face: {
                    totalSamples: 0,
                    presentSamples: 0,
                    attentiveSamples: 0,
                    awaySamples: 0,
                    missingSamples: 0,
                    yaw: createRunningStat(),
                    pitch: createRunningStat(),
                    roll: createRunningStat()
                },
                questions: [
                    ...questionsPart1.map((question, index) => questionMetricTemplate(question, 1, index)),
                    ...questionsPart2.map((question, index) => questionMetricTemplate(question, 2, questionsPart1.length + index))
                ]
            };
        }

        let analytics = createAnalytics();
        let webcamStream = null;
        let latestFaceSample = null;
        let lastVideoTime = -1;
        let cameraRequestStarted = false;
        let adminPanelOpen = false;
        let adminDrawingUtils = null;

        function renderQuestions(containerId, questions, startIndex) {
            const container = document.getElementById(containerId);
            questions.forEach((question, index) => {
                const questionIndex = startIndex + index;
                const row = document.createElement("div");
                row.className = "question-row transition-all duration-300 rounded-3xl -mx-6 px-6 py-12 flex flex-col items-center gap-12 text-center";
                row.dataset.questionIndex = String(questionIndex);
                row.innerHTML = `
                    <p class="text-2xl md:text-3xl font-bold text-slate-800 leading-tight max-w-4xl tracking-tight">
                        <span class="text-blue-600/30 mr-2 font-black italic">Q${questionIndex + 1}.</span>${question}
                    <div class="flex items-end justify-between w-full max-w-3xl px-4">
                        ${[0, 1, 2, 3, 4].map((value) => `
                            <div class="flex flex-col items-center group flex-1">
                                <label class="relative flex flex-col items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="q${questionIndex}"
                                        value="${value}"
                                        data-question-index="${questionIndex}"
                                        class="circle-radio v${value} absolute opacity-0 w-full h-full cursor-pointer z-20"
                                    >
                                    <div class="circle-ui ${circleUIClasses[value]} rounded-full border-[3px] border-gray-100 transition-all duration-500 mb-6 bg-white flex items-center justify-center">
                                        <span class="text-xl font-black text-slate-200 v-text transition-colors duration-500">${value}</span>
                                    </div>
                                    <div class="text-center transition-all duration-300">
                                        <p class="text-xs md:text-sm font-bold text-slate-300 label-text transition-colors duration-300 whitespace-nowrap uppercase tracking-tighter">${likertLabels[value]}</p>
                                    </div>
                                </label>
                            </div>
                        `).join("")}
                    </div>
                `;
                container.appendChild(row);
                questionRows.push(row);
            });
        }

        function getVisibleRows() {
            const activeContainer = currentStep === 1 ? dom.step1 : currentStep === 2 ? dom.step2 : null;
            if (!activeContainer) return [];

            return questionRows
                .filter((row) => activeContainer.contains(row))
                .map((row) => {
                    const rect = row.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    const visibleTop = Math.max(0, rect.top);
                    const visibleBottom = Math.min(viewportHeight, rect.bottom);
                    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
                    const visibilityRatio = visibleHeight / Math.max(1, rect.height);
                    const centerDistance = Math.abs((rect.top + rect.height / 2) - viewportHeight / 2);
                    return { row, score: visibilityRatio * 1000 - centerDistance, visibilityRatio };
                })
                .filter((item) => item.visibilityRatio > 0.28)
                .sort((a, b) => b.score - a.score);
        }

        function setActiveQuestion(now) {
            const visibleRows = getVisibleRows();
            const nextIndex = visibleRows.length ? Number(visibleRows[0].row.dataset.questionIndex) : null;

            if (analytics.activeQuestionIndex === nextIndex) return;

            analytics.activeQuestionIndex = nextIndex;
            questionRows.forEach((row) => {
                row.classList.toggle("is-active-question", Number(row.dataset.questionIndex) === nextIndex);
            });

            if (nextIndex !== null) {
                const metric = analytics.questions[nextIndex];
                metric.activationCount += 1;
                metric.firstVisibleAt ??= now;
            }
        }

        function getCurrentQuestionMetric() {
            return analytics.activeQuestionIndex === null ? null : analytics.questions[analytics.activeQuestionIndex];
        }

        function updateProgress() {
            const answeredCount = analytics.questions.filter((metric) => metric.answerValue !== null).length;
            const percentage = (answeredCount / totalQuestions) * 100;
            dom.progressBar.style.width = `${percentage}%`;
            dom.nextBtn.disabled = analytics.questions.filter((metric) => metric.part === 1 && metric.answerValue !== null).length < questionsPart1.length;
            dom.submitBtn.disabled = analytics.questions.filter((metric) => metric.part === 2 && metric.answerValue !== null).length < questionsPart2.length;
        }

        function refreshChoiceVisuals(name) {
            document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
                const label = input.closest("label");
                const labelText = label.querySelector(".label-text");
                const vText = label.querySelector(".v-text");
                if (input.checked) {
                    labelText.classList.replace("text-slate-300", "text-slate-900");
                    vText.classList.replace("text-slate-200", "text-white");
                } else {
                    labelText.classList.replace("text-slate-900", "text-slate-300");
                    vText.classList.replace("text-white", "text-slate-200");
                }
            });
        }

        function onAnswerChange(event) {
            ensureCameraStarted();

            const input = event.target;
            const questionIndex = Number(input.dataset.questionIndex);
            const metric = analytics.questions[questionIndex];
            const now = performance.now();

            metric.answerValue = Number(input.value);
            if (metric.responseMs === null) {
                const origin = metric.firstVisibleAt ?? now;
                metric.responseMs = Math.max(0, now - origin);
                metric.rapidResponse = metric.responseMs < 2500 || metric.attentiveMs < 1200;
            }

            refreshChoiceVisuals(input.name);
            updateProgress();
        }

        function setAdminPanel(open) {
            adminPanelOpen = open;
            dom.adminPanel.classList.toggle("admin-panel-hidden", !open);
            dom.toggleAdminBtn.textContent = open ? "관리자용 측정 확인 숨기기" : "관리자용 측정 확인 보기";

            if (open && webcamStream) {
                dom.adminWebcam.srcObject = webcamStream;
                dom.adminWebcam.play().catch(() => {});
            }

            if (!open) {
                const ctx = dom.adminOverlay.getContext("2d");
                ctx.clearRect(0, 0, dom.adminOverlay.width, dom.adminOverlay.height);
            }

            renderAdminPanel();
        }

        function resizeAdminOverlay() {
            dom.adminOverlay.width = dom.adminWebcam.videoWidth || dom.webcam.videoWidth || 640;
            dom.adminOverlay.height = dom.adminWebcam.videoHeight || dom.webcam.videoHeight || 480;
        }

        function renderAdminPanel() {
            const metrics = aggregateMetrics();
            const currentMetric = getCurrentQuestionMetric();
            const currentEuler = latestFaceSample?.euler ?? { yaw: 0, pitch: 0, roll: 0 };
            const cameraLabelMap = {
                idle: "대기",
                active: "활성",
                denied: "권한 거부",
                unavailable: "준비 실패"
            };

            dom.adminCameraState.textContent = cameraLabelMap[analytics.cameraState] ?? analytics.cameraState;
            dom.adminFacePresence.textContent = `얼굴 검출률 ${Math.round(metrics.facePresenceRatio * 100)}%`;

            if (!latestFaceSample || !latestFaceSample.present) {
                dom.adminAttentionState.textContent = "얼굴 미검출";
            } else if (latestFaceSample.attentive) {
                dom.adminAttentionState.textContent = "정면 주시";
            } else {
                dom.adminAttentionState.textContent = "이탈 감지";
            }

            dom.adminAwayRatio.textContent = `이탈 비율 ${Math.round(metrics.awayRatio * 100)}%`;
            dom.adminHeadMotion.textContent = `${metrics.headMotionStd.toFixed(1)}°`;
            dom.adminEuler.textContent = `yaw ${currentEuler.yaw.toFixed(1)} / pitch ${currentEuler.pitch.toFixed(1)} / roll ${currentEuler.roll.toFixed(1)}`;

            if (currentMetric) {
                dom.adminQuestionId.textContent = `Q${currentMetric.id}`;
                dom.adminQuestionMeta.textContent = `체류 ${formatMs(currentMetric.visibleMs)} / 응답 ${currentMetric.responseMs === null ? "-" : formatMs(currentMetric.responseMs)}`;
            } else {
                dom.adminQuestionId.textContent = "Q-";
                dom.adminQuestionMeta.textContent = "체류 0초 / 응답 -";
            }

            dom.adminStatusText.textContent = latestFaceSample?.present
                ? "실시간 얼굴 랜드마크와 각도 추정값이 들어오고 있습니다."
                : "현재 얼굴이 잡히지 않거나 카메라 데이터가 없습니다.";

            dom.adminRawMetrics.innerHTML = [
                `총 샘플 수: ${analytics.face.totalSamples}`,
                `얼굴 검출 샘플: ${analytics.face.presentSamples}`,
                `정면 주시 샘플: ${analytics.face.attentiveSamples}`,
                `비주시/이탈 샘플: ${analytics.face.awaySamples + analytics.face.missingSamples}`,
                `빠른 응답 문항: ${metrics.rapidCount}개`,
                `문항 재방문 횟수: ${metrics.revisitTotal}회`,
                `평균 응답 시간: ${(metrics.averageResponseMs / 1000).toFixed(1)}초`,
                `yaw 표준편차: ${statStd(analytics.face.yaw).toFixed(2)}°`,
                `pitch 표준편차: ${statStd(analytics.face.pitch).toFixed(2)}°`,
                `roll 표준편차: ${statStd(analytics.face.roll).toFixed(2)}°`
            ].map((item) => `<div class="rounded-2xl bg-white px-4 py-3 border border-slate-100">${item}</div>`).join("");
        }

        function setStep(step) {
            currentStep = step;
            dom.step1.classList.toggle("active", step === 1);
            dom.step2.classList.toggle("active", step === 2);
            dom.step3.classList.toggle("active", step === 3);
            dom.stepIndicator.textContent = `STEP ${step} / 3`;
            window.scrollTo({ top: 0, behavior: "smooth" });
            setActiveQuestion(performance.now());
        }

        async function createFaceLandmarker() {
            try {
                const filesetResolver = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                );

                faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                        delegate: "GPU"
                    },
                    outputFaceBlendshapes: true,
                    outputFacialTransformationMatrixes: true,
                    runningMode: "VIDEO",
                    numFaces: 1
                });
            } catch (error) {
                console.error(error);
                analytics.cameraState = "unavailable";
            }
        }

        async function ensureCameraStarted() {
            if (cameraRequestStarted || !faceLandmarker) return;
            cameraRequestStarted = true;

            if (!hasGetUserMedia()) {
                analytics.cameraState = "unavailable";
                showCameraError("카메라 API가 지원되지 않거나 권한이 없어 카메라를 시작할 수 없습니다.");
                return;
            }

            try {
                webcamStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "user",
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    },
                    audio: false
                });

                dom.webcam.srcObject = webcamStream;
                await dom.webcam.play();
                dom.adminWebcam.srcObject = webcamStream;
                if (adminPanelOpen) {
                    dom.adminWebcam.play().catch(() => {});
                }
                webcamRunning = true;
                analytics.cameraState = "active";
                analytics.cameraStartedAt = new Date().toISOString();
                requestAnimationFrame(predictWebcam);
            } catch (error) {
                console.error(error);
                analytics.cameraState = "denied";
            }
        }

        function stopCamera() {
            webcamRunning = false;
            if (webcamStream) {
                webcamStream.getTracks().forEach((track) => track.stop());
                webcamStream = null;
            }
            dom.webcam.srcObject = null;
            dom.adminWebcam.srcObject = null;
            const ctx = dom.adminOverlay.getContext("2d");
            ctx.clearRect(0, 0, dom.adminOverlay.width, dom.adminOverlay.height);
        }

        function drawAdminOverlay(result) {
            const ctx = dom.adminOverlay.getContext("2d");
            if (!adminPanelOpen) {
                ctx.clearRect(0, 0, dom.adminOverlay.width, dom.adminOverlay.height);
                return;
            }

            resizeAdminOverlay();
            ctx.clearRect(0, 0, dom.adminOverlay.width, dom.adminOverlay.height);

            if (!result?.faceLandmarks?.length) return;

            adminDrawingUtils ??= new DrawingUtils(ctx);

            result.faceLandmarks.forEach((landmarks) => {
                adminDrawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
                    color: "#94a3b855",
                    lineWidth: 1
                });
                adminDrawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, {
                    color: "#10b981",
                    lineWidth: 1.5
                });
                adminDrawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, {
                    color: "#3b82f6",
                    lineWidth: 1.5
                });
                adminDrawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, {
                    color: "#10b981",
                    lineWidth: 1.5
                });
                adminDrawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, {
                    color: "#3b82f6",
                    lineWidth: 1.5
                });
            });
        }

        function ingestFaceResult(result, now) {
            const face = analytics.face;
            face.totalSamples += 1;

            if (!result?.faceLandmarks?.length) {
                face.missingSamples += 1;
                latestFaceSample = { ts: now, present: false, attentive: false };
                return;
            }

            const landmarks = result.faceLandmarks[0];
            const matrix = result.facialTransformationMatrixes?.[0]?.data ?? null;
            const gaze = estimateGaze(landmarks);
            const euler = matrix ? matrixToEuler(matrix) : { yaw: 0, pitch: 0, roll: 0 };
            const forward = Math.abs(euler.yaw) < 18 && Math.abs(euler.pitch) < 16;
            const gazeCentered = Math.abs(gaze.horizontal) < 0.42 && Math.abs(gaze.vertical) < 0.55;
            const attentive = forward && gazeCentered;

            face.presentSamples += 1;
            face.attentiveSamples += attentive ? 1 : 0;
            face.awaySamples += attentive ? 0 : 1;
            pushStat(face.yaw, euler.yaw);
            pushStat(face.pitch, euler.pitch);
            pushStat(face.roll, euler.roll);

            const currentMetric = getCurrentQuestionMetric();
            if (currentMetric) {
                pushStat(currentMetric.yaw, euler.yaw);
                pushStat(currentMetric.pitch, euler.pitch);
                pushStat(currentMetric.roll, euler.roll);
            }

            latestFaceSample = { ts: now, present: true, attentive, euler, gaze, forward };
        }

        async function predictWebcam() {
            if (!webcamRunning || !faceLandmarker) return;

            if (lastVideoTime !== dom.webcam.currentTime) {
                lastVideoTime = dom.webcam.currentTime;
                const now = performance.now();
                const result = faceLandmarker.detectForVideo(dom.webcam, now);
                ingestFaceResult(result, now);
                drawAdminOverlay(result);
                if (adminPanelOpen) {
                    renderAdminPanel();
                }
            }

            requestAnimationFrame(predictWebcam);
        }

        function surveyLoop(now) {
            if (analytics.lastSurveyTick === null) analytics.lastSurveyTick = now;
            const delta = now - analytics.lastSurveyTick;
            analytics.lastSurveyTick = now;

            setActiveQuestion(now);

            const metric = getCurrentQuestionMetric();
            if (metric) {
                metric.visibleMs += delta;
                if (latestFaceSample && now - latestFaceSample.ts < 600) {
                    if (latestFaceSample.attentive) {
                        metric.attentiveMs += delta;
                    } else {
                        metric.awayMs += delta;
                    }
                }
            }

            requestAnimationFrame(surveyLoop);
        }

        function aggregateMetrics() {
            const answered = analytics.questions.filter((metric) => metric.answerValue !== null);
            const responseTotal = answered.reduce((sum, metric) => sum + (metric.responseMs ?? 0), 0);
            const visibleTotal = analytics.questions.reduce((sum, metric) => sum + metric.visibleMs, 0);
            const attentiveTotal = analytics.questions.reduce((sum, metric) => sum + metric.attentiveMs, 0);
            const awayTotal = analytics.questions.reduce((sum, metric) => sum + metric.awayMs, 0);
            const rapidCount = answered.filter((metric) => metric.rapidResponse).length;
            const revisitTotal = analytics.questions.reduce((sum, metric) => sum + Math.max(0, metric.activationCount - 1), 0);

            return {
                answeredCount: answered.length,
                averageResponseMs: ratio(responseTotal, answered.length || 1),
                attentionRatio: ratio(attentiveTotal, visibleTotal || 1),
                awayRatio: ratio(awayTotal, visibleTotal || 1),
                facePresenceRatio: ratio(analytics.face.presentSamples, analytics.face.totalSamples || 1),
                rapidCount,
                revisitTotal,
                headMotionStd: statStd(analytics.face.yaw) + statStd(analytics.face.pitch)
            };
        }

        function buildFriendlySummary() {
            const metrics = aggregateMetrics();

            const focusScore = Math.round(clamp(metrics.attentionRatio * 100, 0, 100));
            const responseBase = 100 - clamp(((metrics.averageResponseMs / 1000) - 2.5) * 18, 0, 100);
            const responsePenalty = metrics.rapidCount * 8;
            const responseScore = Math.round(clamp(responseBase - responsePenalty, 0, 100));
            const stabilityScore = Math.round(clamp(100 - metrics.headMotionStd * 4.5, 0, 100));
            const distractionScore = Math.round(clamp(100 - ((metrics.awayRatio * 70) + (metrics.revisitTotal * 3)), 0, 100));

            const cards = [
                {
                    title: "집중 유지",
                    score: focusScore,
                    hint: `${Math.round(metrics.attentionRatio * 100)}% 정도에서 문항 중심 시선이 유지됐어요.`,
                    desc: "문항을 보는 동안 시선과 얼굴이 얼마나 안정적으로 유지됐는지 요약한 값입니다."
                },
                {
                    title: "응답 속도",
                    score: responseScore,
                    hint: `평균 응답 시간은 ${(metrics.averageResponseMs / 1000).toFixed(1)}초였어요.`,
                    desc: "너무 빠르게 고르거나, 거의 보지 않고 넘긴 문항이 많으면 점수가 내려갑니다."
                },
                {
                    title: "움직임 안정성",
                    score: stabilityScore,
                    hint: `설문 중 머리 움직임 변동성은 ${metrics.headMotionStd.toFixed(1)}° 수준이었어요.`,
                    desc: "고개 움직임이 크고 잦을수록 읽는 과정의 안정성이 낮게 반영됩니다."
                },
                {
                    title: "화면 이탈",
                    score: distractionScore,
                    hint: `${Math.round(metrics.awayRatio * 100)}% 구간에서 문항 바깥 주의 분산이 감지됐어요.`,
                    desc: "문항에서 자주 벗어나거나 같은 문항을 여러 번 다시 보는 흐름을 반영합니다."
                }
            ];

            const hardestQuestion = analytics.questions
                .slice()
                .sort((a, b) => (b.visibleMs + b.awayMs) - (a.visibleMs + a.awayMs))[0];

            const fastestQuestion = analytics.questions
                .filter((metric) => metric.responseMs !== null)
                .slice()
                .sort((a, b) => a.responseMs - b.responseMs)[0];

            const notes = [];

            if (analytics.cameraState === "denied") {
                notes.push("카메라 권한이 허용되지 않아 설문 응답 패턴 중심으로만 결과를 정리했어요.");
            } else if (metrics.facePresenceRatio < 0.35) {
                notes.push("얼굴이 화면에 잡힌 시간이 짧아서 시선 관련 결과는 참고용으로만 보는 편이 좋습니다.");
            } else {
                notes.push("카메라를 통해 읽는 흐름을 함께 봤기 때문에 문항 응답 맥락을 조금 더 입체적으로 확인할 수 있었어요.");
            }

            if (hardestQuestion) {
                notes.push(`가장 오래 머문 문항은 Q${hardestQuestion.id}였고, 총 ${formatMs(hardestQuestion.visibleMs)} 정도 확인했어요.`);
            }

            if (fastestQuestion && fastestQuestion.responseMs !== null) {
                notes.push(`가장 빠르게 답한 문항은 Q${fastestQuestion.id}였고, 응답까지 ${formatMs(fastestQuestion.responseMs)}가 걸렸어요.`);
            }

            if (metrics.rapidCount > 0) {
                notes.push(`짧은 확인 후 바로 응답한 문항이 ${metrics.rapidCount}개 있어, 일부 문항은 빠르게 판단했을 가능성이 있습니다.`);
            } else {
                notes.push("대부분의 문항에서 최소한의 읽는 시간이 확보되어 급하게 넘기는 패턴은 크지 않았어요.");
            }

            return {
                cards,
                notes,
                raw: {
                    ...metrics,
                    cameraState: analytics.cameraState
                }
            };
        }

        function renderSummary() {
            const summary = buildFriendlySummary();

            dom.summaryIntro.textContent = "응답 패턴과 설문 중 측정된 집중 흐름을 함께 정리했습니다. 이 결과는 참고용 행동 지표이며 진단 자체를 대신하지 않습니다.";

            dom.summaryCards.innerHTML = summary.cards.map((card) => {
                const bucket = metricBucket(card.score);
                return `
                    <div class="summary-card rounded-[2rem] p-7">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <p class="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">${card.title}</p>
                                <p class="mt-3 text-4xl font-black text-slate-900">${card.score}<span class="text-2xl">점</span></p>
                            </div>
                            <span class="text-sm font-black ${bucket.color}">${bucket.tone}</span>
                        </div>
                        <p class="mt-5 text-base font-bold text-slate-700 leading-7">${card.hint}</p>
                        <p class="mt-3 text-sm text-slate-500 leading-7">${card.desc}</p>
                    </div>
                `;
            }).join("");

            dom.summaryHighlights.innerHTML = summary.notes.map((note) => `
                <div class="flex items-start gap-3">
                    <span class="mt-2 h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0"></span>
                    <p>${note}</p>
                </div>
            `).join("");

            window.surveyAnalytics = {
                exportedAt: new Date().toISOString(),
                cameraState: analytics.cameraState,
                summary,
                questions: analytics.questions.map((metric) => ({
                    id: metric.id,
                    part: metric.part,
                    question: metric.question,
                    answerValue: metric.answerValue,
                    visibleMs: Number(metric.visibleMs.toFixed(1)),
                    attentiveMs: Number(metric.attentiveMs.toFixed(1)),
                    awayMs: Number(metric.awayMs.toFixed(1)),
                    responseMs: metric.responseMs === null ? null : Number(metric.responseMs.toFixed(1)),
                    rapidResponse: metric.rapidResponse,
                    revisitCount: Math.max(0, metric.activationCount - 1)
                }))
            };
        }

        function goToStep3() {
            renderSummary();
            setStep(3);
            renderAdminPanel();
        }

        function attachEvents() {
            document.querySelectorAll('input[type="radio"]').forEach((input) => {
                input.addEventListener("change", onAnswerChange);
            });

            dom.nextBtn.addEventListener("click", () => {
                ensureCameraStarted();
                setStep(2);
            });

            dom.prevBtn.addEventListener("click", () => setStep(1));
            dom.submitBtn.addEventListener("click", goToStep3);
            dom.restartSummaryBtn.addEventListener("click", () => setStep(2));
            dom.toggleAdminBtn.addEventListener("click", () => setAdminPanel(!adminPanelOpen));
            dom.refreshAdminBtn.addEventListener("click", renderAdminPanel);
            dom.startCptBtn.addEventListener("click", () => {
                stopCamera();
                alert("설문 결과는 window.surveyAnalytics 에 저장되었습니다. 다음 CPT 단계에서 이 값을 이어서 사용하면 됩니다.");
            });

            window.addEventListener("scroll", () => setActiveQuestion(performance.now()), { passive: true });
            window.addEventListener("resize", () => setActiveQuestion(performance.now()));
            window.addEventListener("beforeunload", stopCamera);
        }

        function init() {
            demosSection = document.getElementById("demos");
            imageBlendShapes = document.getElementById("image-blend-shapes");
            videoBlendShapes = document.getElementById("video-blend-shapes");

            video = document.getElementById("webcam");
            canvasElement = document.getElementById("output_canvas");
            canvasCtx = canvasElement?.getContext("2d");

            const imageContainers = document.getElementsByClassName("detectOnClick");
            for (const imageContainer of imageContainers) {
                const img = imageContainer.children[0];
                if (img) img.addEventListener("click", handleClick);
            }

            renderQuestions("part1-questions", questionsPart1, 0);
            renderQuestions("part2-questions", questionsPart2, questionsPart1.length);
            attachEvents();
            updateProgress();
            createFaceLandmarker();
            requestAnimationFrame(surveyLoop);
        }

        if (document.readyState === "loading") {
            window.addEventListener("DOMContentLoaded", init);
        } else {
            init();
        }