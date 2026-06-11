import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;

let demosSection = null;
let imageBlendShapes = null;
let videoBlendShapes = null;

// WebGazer dot visualization can be disabled to keep gaze tracking purely background.
const SHOW_WEBGAZER_DOT = false;

let faceLandmarker = undefined;
let runningMode = "IMAGE";
let enableWebcamButton = undefined;
let webcamRunning = false;
let webgazerBooting = false;
let webgazerRunning = false;

let video = null;
let canvasElement = null;
let canvasCtx = null;

const videoWidth = 480;

const CPT_TARGET = Object.freeze({
    id: "heart-3",
    rank: "3",
    suit: "heart",
    count: 3,
    isTarget: true
});
const CPT_DISTRACTORS = Object.freeze([
    { id: "club-a", rank: "A", suit: "club", count: 1, isTarget: false },
    { id: "heart-2", rank: "2", suit: "heart", count: 2, isTarget: false },
    { id: "heart-4", rank: "4", suit: "heart", count: 4, isTarget: false },
    { id: "spade-a", rank: "A", suit: "spade", count: 1, isTarget: false },
    { id: "diamond-5", rank: "5", suit: "diamond", count: 5, isTarget: false }
]);
const CPT_CARD_SUITS = Object.freeze({
    heart: { symbol: "♥", label: "하트" },
    diamond: { symbol: "♦", label: "다이아몬드" },
    club: { symbol: "♣", label: "클로버" },
    spade: { symbol: "♠", label: "스페이드" }
});
const CPT_VISUAL_DISTRACTORS = Object.freeze([
    { icon: "★", hue: "22 95% 58%" },
    { icon: "●", hue: "196 84% 62%" },
    { icon: "◆", hue: "38 92% 64%" },
    { icon: "▲", hue: "212 89% 58%" },
    { icon: "✦", hue: "332 75% 58%" }
]);
const CPT_BLOCK_TRIALS = 5;
const CPT_TOTAL_TRIALS = CPT_BLOCK_TRIALS * 4;
const CPT_STIMULUS_MS = 200;
const CPT_RESPONSE_WINDOW_MS = 800;
const CPT_ISI_RANGE = [1000, 1500];

let cptWebcamStream = null;
let cptWebcamRunning = false;
let cptUsesSharedSurveyStream = false;
let cptLastVideoTime = -1;
let cptGameState = "IDLE";
let cptCurrentBlock = 1;
let cptTrialInBlock = 0;
let cptOverallTrialCount = 0;
let cptCurrentStimulus = null;
let cptStimulusStartTime = 0;
let cptResponded = false;
let cptAudioCtx = null;
let cptDataLog = [];
let cptEventHistory = [];
let cptMetrics = null;

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

function disableWebGazerMouseLearning(instance) {
  if (typeof instance?.removeMouseEventListeners === "function") {
    instance.removeMouseEventListeners();
  }
}

async function startWebGazer(staticStream = null) {
  if (webgazerRunning || webgazerBooting) return;

  const instance = window.webgazer;
  if (!instance) {
    console.warn("WebGazer script is not available yet.");
    webgazerState.status = "error";
    webgazerState.lastError = "script_missing";
    return;
  }

  webgazerBooting = true;
  webgazerState.status = "booting";

  try {
    if (instance.params) {
      // Mirror Mediapipe URL path to the public folder where wasm and config are served.
      // This avoids missing /mediapipe/face_mesh_solution_wasm_bin.js 404 errors.
      instance.params.faceMeshSolutionPath = "/mediapipe";
      console.log("WebGazer faceMeshSolutionPath set to", instance.params.faceMeshSolutionPath);
    }

    instance.setGazeListener(handleWebGazerPrediction);
    if (typeof instance.setTracker === "function") {
      instance.setTracker("TFFacemesh");
    }
    if (typeof instance.setRegression === "function") {
      instance.setRegression("ridge");
    }
    instance.saveDataAcrossSessions(false);
    if (staticStream && typeof instance.setStaticVideo === "function") {
      instance.setStaticVideo(staticStream);
    }

    if (typeof instance.showVideoPreview === "function") {
      instance.showVideoPreview(false);
    } else {
      if (typeof instance.showVideo === "function") {
        instance.showVideo(false);
      }
      if (typeof instance.showFaceOverlay === "function") {
        instance.showFaceOverlay(false);
      }
      if (typeof instance.showFaceFeedbackBox === "function") {
        instance.showFaceFeedbackBox(false);
      }
    }
    if (typeof instance.showPredictionPoints === "function") {
      instance.showPredictionPoints(false);
    }

    await instance.begin(() => {
      console.warn("WebGazer stream was not initialized.");
    });
    disableWebGazerMouseLearning(instance);
    webgazerRunning = true;
    webgazerState.status = "active";
    webgazerState.startedAt ??= new Date().toISOString();
  } catch (error) {
    console.error("WebGazer failed to start", error);
    webgazerState.status = "error";
    webgazerState.lastError = error?.message ?? "unknown_error";
  } finally {
    webgazerBooting = false;
    renderWebGazerAdmin();
    renderCptWebGazerLive();
    renderAdminLiveDebug();
    renderCalibrationOverlay();
  }
}

function stopWebGazer() {
  const instance = window.webgazer;
  if (!instance) return;

    try {
      if (typeof instance.end === "function") {
        instance.end();
      } else if (typeof instance.pause === "function") {
        instance.pause();
      }
    } catch (error) {
      const message = error?.message ?? "";
      const isBenignCleanupError =
        error instanceof TypeError && message.includes("remove");

      if (!isBenignCleanupError) {
        console.warn("WebGazer cleanup skipped", error);
      }

      if (typeof instance.pause === "function") {
        try {
          instance.pause();
        } catch {
          // WebGazer is already being torn down by the page lifecycle.
        }
      }
    } finally {
    webgazerRunning = false;
    webgazerBooting = false;
    webgazerState.status = "stopped";
    hideLiveGazeDot();
    renderWebGazerAdmin();
    renderCptWebGazerLive();
    renderCptWebGazerResults();
    renderAdminLiveDebug();
    renderCalibrationOverlay();
  }
}

if (!isSecureContext()) {
  showCameraError("寃쎄퀬: HTTPS媛 ?꾨땶 ?곌껐?먯꽌??移대찓??沅뚰븳??嫄곕??????덉뒿?덈떎. localhost ?먮뒗 HTTPS?먯꽌 ?ㅽ뻾?섏꽭??");
}

if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  if (enableWebcamButton) {
    enableWebcamButton.addEventListener("click", enableCam);
  }
} else {
  showCameraError("getUserMedia()瑜?吏?먰븯吏 ?딅뒗 釉뚮씪?곗??낅땲?? 理쒖떊 Chrome/Edge?먯꽌 ?뚯뒪?명븯?몄슂.");
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
    showCameraError("navigator.mediaDevices.getUserMedia瑜??ъ슜?????놁뒿?덈떎. 釉뚮씪?곗? ?먮뒗 蹂댁븞 ?곌껐???뺤씤?섏꽭??");
    return;
  }

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcamLegacy, { once: true });
  }).catch((error) => {
    console.error("enableCam getUserMedia ?ㅽ뙣", error);
    analytics.cameraState = "denied";
    showCameraError("移대찓??沅뚰븳??嫄곕??섏뿀?듬땲?? 釉뚮씪?곗??먯꽌 沅뚰븳???덉슜?댁＜?몄슂.");
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


        /* const questionsPart1 = [
            "留덈Т由ы빐???섎뒗 ?몃? ?묒뾽?먯꽌 ?ㅼ닔媛 ?앷린嫄곕굹 ?몃? ?ы빆???볦튂???몄씠??",
            "?щ윭 ?④퀎瑜?嫄곗퀜???섎뒗 ?쇱쓣 泥닿퀎?곸쑝濡?怨꾪쉷?섍퀬 ?뺣━?섍린 ?대졄??",
            "?쎌냽, 留덇컧, ?쒖텧?쇱쿂???쇱긽?곸씤 ?댁빞 ???쇱쓣 ?먯＜ ?딅뒗??",
            "?쒓컙???ㅻ옒 嫄몃━??怨쇱젣???쒖옉 ?먯껜瑜?誘몃（嫄곕굹 ?ㅻⅨ ?쇰줈 鍮좎?湲??쎈떎.",
            "吏猷⑦븯嫄곕굹 諛섎났?곸씤 ?쇱쓣 ????吏묒쨷???쎄쾶 ?먰듃?ъ쭊??",
            "?ㅻ옒 吏묒쨷?댁빞 ?섎뒗 ?쇱쓣 ?섎떎媛 ?ㅻⅨ ?앷컖?쇰줈 ?먯＜ ?덉뼱 ?섍컙??",
            "?곷?媛 吏곸젒 ?댁빞湲고븯怨??덉뼱???앷퉴吏 二쇱쓽瑜??좎??섍린 ?대졄??",
            "?댁뇿, ?대??? 吏媛묒쿂???먯＜ ?곕뒗 臾쇨굔???대뵒????붿? ?먯＜ ?딅뒗??",
            "二쇰? ?뚮━???吏곸엫 媛숈? ?먭레 ?뚮Ц???섎뜕 ?쇱뿉???쎄쾶 踰쀬뼱?쒕떎."
        ];

        const questionsPart2 = [
            "?됱븘 ?덉뼱???섎뒗 ?곹솴?먯꽌???먮컻??怨꾩냽 ?吏곸씠嫄곕굹 ?먯꽭瑜??먯＜ 諛붽씔??",
            "媛留뚰엳 ?덇린蹂대떎 怨꾩냽 萸붽?瑜??섍퀬 ?吏곸뿬????寃?媛숈? ?먮굦???좊떎.",
            "?뚯쓽???섏뾽泥섎읆 ?됱븘 ?덉뼱??????以묎컙???쇱뼱?섍퀬 ?띠뼱吏꾨떎.",
            "紐몄씠 怨꾩냽 湲댁옣?섍굅??遺덊렪?댁꽌 ?쎄쾶 吏꾩젙?섏? ?딅뒗 ?몄씠??",
            "?щ뒗 ?쒓컙?먮룄 ?명븯寃??ш린蹂대떎 怨꾩냽 萸붽?瑜??섍쾶 ?쒕떎.",
            "???以?留먯씠 留롮븘吏嫄곕굹 ?곷?蹂대떎 ??留롮씠 ?댁빞湲고븯寃??섎뒗 ?몄씠??",
            "?곷?媛 留먯쓣 ?앸궡湲??꾩뿉 癒쇱? ?듯븯嫄곕굹 ?쇱뼱?쒕뒗 寃쎌슦媛 ?덈떎.",
            "?쒖꽌瑜?湲곕떎?ㅼ빞 ?섎뒗 ?곹솴?먯꽌 ?앷퉴吏 湲곕떎由ш린 ?대졄??",
            "?ㅻⅨ ?щ엺???섎뒗 ?쇱씠????붿뿉 ?쇱뼱?ㅺ굅??諛⑺빐?섎뒗 寃쎌슦媛 ?덈떎."
        ];

        const likertLabels = ["전혀 없음", "거의 없음", "가끔", "자주", "매우 자주"];
        const circleUIClasses = ["w-16 h-16 md:w-20 md:h-20", "w-12 h-12 md:w-16 md:h-16", "w-10 h-10 md:w-12 md:h-12", "w-12 h-12 md:w-16 md:h-16", "w-16 h-16 md:w-20 md:h-20"];

        */

        const questionsPart1 = [
            "?댁빞 ???쇱쓣 嫄곗쓽 ?앸궦 ?곹깭?먯꽌, 蹂닿퀬???뺣━??留덈Т由?媛숈? ?몃? ?묒뾽???앷퉴吏 ?꾨즺?섏? 紐삵븯怨??④꺼?먮뒗 寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "?щ윭 ?④퀎媛 ?꾩슂???쇱쓣 ???? ?댁빞 ???쒖꽌瑜??뺣━?섍굅??泥닿퀎?곸쑝濡?怨꾪쉷???몄슦?????대젮????먮겮??寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "?뚯쓽 ?쇱젙, ?쎌냽, ?쒖텧 湲고븳 ???쇱긽?곸씤 ?댁빞 ???쇱쓣 ?딆뼱踰꾨━??寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "?ㅻ옖 ?쒓컙 ?앷컖???꾩슂??怨쇱젣???쇱쓣 ?욌몢怨? ?쒖옉 ?먯껜瑜?誘몃（嫄곕굹 ?ㅻⅨ ?쇱쓣 癒쇱? ?섍쾶 ?섎뒗 寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "吏猷⑦븯嫄곕굹 諛섎났?곸씤 ?낅Т(?? ?⑥닚 ?낅젰, ?숈젣 ??瑜????? 二쇱쓽 遺議깆쑝濡??ㅼ닔瑜??섍굅???뺤씤???볦튂??寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "?ㅻ옖 ?쒓컙 諛섎났?섎뒗 ?묒뾽?????? 吏묒쨷???먰듃?ъ졇 ?ㅻⅨ ?앷컖???섍굅???댁쭞???섍쾶 ?섎뒗 寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "?곷?諛⑹씠 ?덉븵?먯꽌 吏곸젒 ?댁빞湲고븯怨??덉쓬?먮룄, 留먯쓽 ?댁슜???앷퉴吏 吏묒쨷?댁꽌 ?ｊ린 ?대젮??寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "?댁뇿, 吏媛? ?대??곗쿂???먯＜ ?ъ슜?섎뒗 臾쇨굔???대뵒???먯뿀?붿? 湲곗뼲?섏? 紐삵븯嫄곕굹 李얜뒗 ???쒓컙???ㅻ옒 嫄몃━??寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "二쇰? ?뚯쓬, ?щ엺 ?吏곸엫, ?ㅻ쭏?명룿 ?뚮┝ ???몃? ?먭레 ?뚮Ц???섎뜕 ?쇱뿉???쎄쾶 吏묒쨷??源⑥???寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?"
        ];

        const questionsPart2 = [
            "?섏뾽, ?뚯쓽, ?湲??곹솴泥섎읆 ?ㅻ옒 ?됱븘 ?덉뼱?????? ?먯씠??諛쒖쓣 怨꾩냽 ?吏곸씠嫄곕굹 ?먯꽭瑜??먯＜ 諛붽씀??寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "?밸퀎???댁쑀媛 ?녿뒗?곕룄, 媛留뚰엳 ?덇린蹂대떎 怨꾩냽 臾댁뼵媛瑜??댁빞 ??寃?媛숈? ?먮굦???ㅼ뼱 ?吏곸씠寃??섎뒗 寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "?뚯쓽???섏뾽泥섎읆 ?먮━???됱븘 ?덉뼱???섎뒗 ?곹솴?먯꽌, 以묎컙???쇱뼱?섍굅???먮━瑜?踰쀬뼱?섍퀬 ?띠? 異⑸룞???먮겮??寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "媛留뚰엳 ?덉뼱???섎뒗 ?곹솴?먯꽌?? 紐몄쓣 怨꾩냽 ?吏곸씠嫄곕굹 遺덊렪?⑥쓣 ?먮겮?????덉젙?섏? 紐삵븳 ?곹깭媛 ?섎뒗 寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "?щ뒗 ?쒓컙?대굹 ?ъ쑀媛 ?덉쓣 ?뚯뿉?? 湲댁옣???吏 紐삵븯怨?怨꾩냽 萸붽?瑜??댁빞 ??寃?媛숈? ?먮굦???쒕뒗 寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "移쒓뎄???щ엺?ㅺ낵 ??뷀븯???곹솴?먯꽌, 留먯씠 留롮븘吏嫄곕굹 ?곷?諛⑸낫????留롮씠 ?댁빞湲고븯寃??섎뒗 寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "???以??곷?諛⑹씠 留먯쓣 ?앸궡湲??꾩뿉, ?댁슜???덉긽?섍퀬 癒쇱? 留먯쓣 ?댁뼱媛嫄곕굹 ?쇱뼱?쒕뒗 寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "以꾩쓣 ?쒓굅???쒖꽌瑜?湲곕떎?ㅼ빞 ?섎뒗 ?곹솴(?? 怨꾩궛, 諛쒗몴 ???먯꽌, 李⑤?瑜??앷퉴吏 湲곕떎由ъ? 紐삵븯怨?議곌툒?댁???寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?",
            "?ㅻⅨ ?щ엺??吏묒쨷?댁꽌 ?쇱쓣 ?섍퀬 ?덉쓣 ?? ?곷?諛⑹쓽 ?곹솴??怨좊젮?섏? ?딄퀬 留먯쓣 嫄멸굅???됰룞?쇰줈 諛⑺빐?섎뒗 寃쎌슦媛 ?쇰쭏???먯＜ ?덉뒿?덇퉴?"
        ];

        const likertLabels = ["전혀 없음", "거의 없음", "가끔", "자주", "매우 자주"];
        const circleUIClasses = ["w-16 h-16 md:w-20 md:h-20", "w-12 h-12 md:w-16 md:h-16", "w-10 h-10 md:w-12 md:h-12", "w-12 h-12 md:w-16 md:h-16", "w-16 h-16 md:w-20 md:h-20"];

        const dom = {};

        const domIdMap = {
            part1Questions: "part1-questions",
            part2Questions: "part2-questions",
            cptTotalProgress: "cpt-total-progress",
            cptIndicatorGaze: "cpt-indicator-gaze",
            cptIndicatorHead: "cpt-indicator-head",
            cptLiveAttentive: "cpt-live-attentive",
            cptBarAttentive: "cpt-bar-attentive",
            cptLiveYaw: "cpt-live-yaw",
            cptYawCursor: "cpt-yaw-cursor",
            cptLiveWebgazerState: "cpt-live-webgazer-state",
            cptLiveWebgazerSamples: "cpt-live-webgazer-samples",
            cptLiveWebgazerCoords: "cpt-live-webgazer-coords",
            cptResWebgazerState: "cpt-res-webgazer-state",
            cptResWebgazerPhase: "cpt-res-webgazer-phase",
            cptResWebgazerSamples: "cpt-res-webgazer-samples",
            cptResWebgazerRaw: "cpt-res-webgazer-raw",
            cptResWebgazerCoords: "cpt-res-webgazer-coords",
            cptResWebgazerTime: "cpt-res-webgazer-time",
            cptResWebgazerViewport: "cpt-res-webgazer-viewport",
            cptResWebgazerWindow: "cpt-res-webgazer-window",
            cptResWebgazerCoverage: "cpt-res-webgazer-coverage",
            cptResWebgazerMetrics: "cpt-res-webgazer-metrics",
            cptResWebgazerRecent: "cpt-res-webgazer-recent",
            cptWebgazerCanvas: "cptWebgazerCanvas",
            cptResultsModal: "cpt-results-modal",
            cptResTimestamp: "cpt-res-timestamp",
            cptResOmissionRate: "cpt-res-omission-rate",
            cptResCommissionRate: "cpt-res-commission-rate",
            cptResRtSd: "cpt-res-rt-sd",
            cptResDistraction: "cpt-res-distraction",
            cptInterpretationText: "cpt-interpretation-text",
            cptBlockAnalysis: "cpt-block-analysis",
            cptWebcam: "cpt-webcam",
            cptOutputCanvas: "cpt-output_canvas",
            adminWebcam: "adminWebcam",
            adminOverlay: "adminOverlay",
            adminCameraState: "adminCameraState",
            adminFacePresence: "adminFacePresence",
            adminAttentionState: "adminAttentionState",
            adminAwayRatio: "adminAwayRatio",
            adminHeadMotion: "adminHeadMotion",
            adminEuler: "adminEuler",
            adminQuestionId: "adminQuestionId",
            adminQuestionMeta: "adminQuestionMeta",
            adminWebgazerPhase: "adminWebgazerPhase",
            adminWebgazerState: "adminWebgazerState",
            adminWebgazerSamples: "adminWebgazerSamples",
            adminWebgazerCoords: "adminWebgazerCoords",
            adminWebgazerTime: "adminWebgazerTime",
            adminWebgazerViewport: "adminWebgazerViewport",
            adminWebgazerCanvas: "adminWebgazerCanvas",
            environmentCheckOverlay: "environmentCheckOverlay",
            environmentWebcamPreview: "environmentWebcamPreview",
            environmentGuideOverlay: "environmentGuideOverlay",
            environmentGuideBox: "environmentGuideBox",
            environmentSummary: "environmentSummary",
            environmentLightCard: "environmentLightCard",
            environmentLightStatus: "environmentLightStatus",
            environmentLightHint: "environmentLightHint",
            environmentPositionCard: "environmentPositionCard",
            environmentPositionStatus: "environmentPositionStatus",
            environmentPositionHint: "environmentPositionHint",
            environmentSetupCard: "environmentSetupCard",
            environmentSetupStatus: "environmentSetupStatus",
            environmentSetupHint: "environmentSetupHint",
            environmentReadyBar: "environmentReadyBar",
            environmentReadyText: "environmentReadyText",
            environmentContinueBtn: "environmentContinueBtn",
            environmentCloseBtn: "environmentCloseBtn",
            environmentCameraBadge: "environmentCameraBadge",
            environmentFaceBadge: "environmentFaceBadge",
            calibrationOverlay: "calibrationOverlay",
            calibrationStage: "calibrationStage",
            calibrationWebcamPreview: "calibrationWebcamPreview",
            calibrationEngineBadge: "calibrationEngineBadge",
            calibrationFaceBadge: "calibrationFaceBadge",
            calibrationCloseBtn: "calibrationCloseBtn",
            calibrationStatusPill: "calibrationStatusPill",
            calibrationProgressText: "calibrationProgressText",
            calibrationPointsLayer: "calibrationPointsLayer",
            calibrationReviewLayer: "calibrationReviewLayer",
            calibrationIntroCard: "calibrationIntroCard",
            calibrationSummary: "calibrationSummary",
            calibrationStartBtn: "calibrationStartBtn",
            calibrationControlPanel: "calibrationControlPanel",
            calibrationControlDragHandle: "calibrationControlDragHandle",
            calibrationPanelTitle: "calibrationPanelTitle",
            calibrationStatsGrid: "calibrationStatsGrid",
            calibrationMiniSummary: "calibrationMiniSummary",
            calibrationCompletedCount: "calibrationCompletedCount",
            calibrationClickCount: "calibrationClickCount",
            calibrationResetBtn: "calibrationResetBtn",
            calibrationContinueBtn: "calibrationContinueBtn",
            calibrationInstructionText: "calibrationInstructionText",
            calibrationCursorDot: "calibrationCursorDot",
        };

        function getDomId(key) {
            return domIdMap[key] || key.replace(/([A-Z])/g, "-$1").toLowerCase();
        }

        function cacheDomElements() {
            const keys = [
                "surveyExperience","cptExperience","resultsExperience","adminExperience","webgazerLiveDot","stepIndicator","progressBar",
                "step1","step2","step3","part1Questions","part2Questions","nextBtn","prevBtn",
                "submitBtn","restartSummaryBtn","summaryIntro","summaryScreeningBreakdown","summaryCards","summaryHighlights",
                "toggleAdminBtn","adminPanel","adminStatusText","refreshAdminBtn","adminWebcam",
                "adminOverlay","adminCameraState","adminFacePresence","adminAttentionState",
                "adminAwayRatio","adminHeadMotion","adminEuler","adminQuestionId","adminQuestionMeta",
                "adminWebgazerPhase","adminWebgazerState","adminWebgazerSamples","adminWebgazerCoords",
                "adminWebgazerTime","adminWebgazerViewport","adminWebgazerCanvas","adminRawMetrics","webcam",
                "environmentCheckOverlay","environmentWebcamPreview","environmentGuideOverlay","environmentGuideBox",
                "environmentSummary","environmentLightCard","environmentLightStatus","environmentLightHint",
                "environmentPositionCard","environmentPositionStatus","environmentPositionHint",
                "environmentSetupCard","environmentSetupStatus","environmentSetupHint",
                "environmentReadyBar","environmentReadyText","environmentContinueBtn","environmentCloseBtn",
                "environmentCameraBadge","environmentFaceBadge","calibrationOverlay","calibrationStage","calibrationWebcamPreview",
                "calibrationEngineBadge","calibrationFaceBadge","calibrationCloseBtn","calibrationStatusPill",
                "calibrationProgressText","calibrationPointsLayer","calibrationReviewLayer","calibrationIntroCard","calibrationSummary",
                "calibrationStartBtn","calibrationControlPanel","calibrationControlDragHandle","calibrationPanelTitle","calibrationStatsGrid","calibrationMiniSummary","calibrationCompletedCount",
                "calibrationClickCount","calibrationResetBtn","calibrationContinueBtn","calibrationInstructionText",
                "calibrationCursorDot",
                "resultsAdminBtn","adminBackBtn",
                "adminCombinedStatus","adminCombinedPhase","adminSurveyValidCount","adminSurveyRawCount",
                "adminCptValidCount","adminCptRawCount","adminCombinedWindow","adminTotalValidCount",
                "adminSurveyCoverage","adminSurveyRate","adminSurveyCoords","adminSurveyTime",
                "adminSurveyViewport","adminSurveyWindow","adminSurveyCanvas","adminSurveyRecent",
                "adminCptCoverage","adminCptRate","adminCptCoords","adminCptTime",
                "adminCptViewport","adminCptWindow","adminCptCanvas","adminCptRecent","adminCptEvents",
                "adminDebugStatus","adminDebugPhase","adminDebugTargetCoords","adminDebugTargetLabel",
                "adminDebugPredictedCoords","adminDebugSampleAge","adminDebugError","adminDebugQuality",
                "adminDebugSurface","adminDebugTargetDot","adminDebugPredictedDot","adminDebugCenterBtn","adminDebugRandomBtn",
                "startCptBtn","cptOverlay","cptStartBtn","cptLoadingStatus","cptStimulusContent","cptTaskAoi",
                "cptFixationCross","cptInstruction","cptVisualDistractors","cptTotalProgress",
                "cptWebcam","cptOutputCanvas","cptIndicatorGaze","cptIndicatorHead","cptLiveAttentive",
                "cptBarAttentive","cptLiveYaw","cptYawCursor","cptLiveWebgazerState","cptLiveWebgazerSamples",
                "cptLiveWebgazerCoords","cptEventLog","cptCurrentTrial","cptResultsModal","cptResTimestamp",
                "cptResOmissionRate","cptResCommissionRate","cptResRtSd","cptResDistraction","cptInterpretationText",
                "cptBlockAnalysis","cptRestartBtn","cptDownloadRaw","cptWebgazerCanvas","cptResWebgazerState",
                "cptResWebgazerPhase","cptResWebgazerSamples","cptResWebgazerRaw","cptResWebgazerCoords",
                "cptResWebgazerTime","cptResWebgazerViewport","cptResWebgazerWindow","cptResWebgazerCoverage",
                "cptResWebgazerMetrics","cptResWebgazerRecent"
            ];
            keys.forEach((key) => {
                dom[key] = document.getElementById(key) ?? document.getElementById(getDomId(key));
            });

            ensureWebGazerDotMode();
        }

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
            return (ms / 1000).toFixed(1) + "초";
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
            if (score >= 75) return { tone: "\uC548\uC815", color: "text-emerald-600" };
            if (score >= 45) return { tone: "\uBCF4\uD1B5", color: "text-amber-500" };
            return { tone: "\uC8FC\uC758 \uD544\uC694", color: "text-rose-600" };
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
                environment: {
                    validity: "limited",
                    reasons: [],
                    initialViewport: getViewportSnapshot(),
                    latestViewport: getViewportSnapshot(),
                    resizeCount: 0,
                    fullscreenExitCount: 0,
                    multipleVisibleRows: false,
                    calibrationSkipped: false
                },
                questions: [
                    ...questionsPart1.map((question, index) => questionMetricTemplate(question, 1, index)),
                    ...questionsPart2.map((question, index) => questionMetricTemplate(question, 2, questionsPart1.length + index))
                ]
            };
        }

        const WEBGAZER_SAMPLE_INTERVAL_MS = 80;
        const WEBGAZER_PHASE_LIMIT = 400;

        function createWebGazerPhaseStore() {
            return {
                rawCount: 0,
                validCount: 0,
                samples: [],
                lastSample: null
            };
        }

        function createWebGazerState() {
            return {
                status: "idle",
                phase: "survey",
                startedAt: null,
                lastError: null,
                lastAcceptedAt: 0,
                calibration: createWebGazerPhaseStore(),
                survey: createWebGazerPhaseStore(),
                cpt: createWebGazerPhaseStore(),
                debug: createWebGazerPhaseStore()
            };
        }

        const ENVIRONMENT_LIGHT_THRESHOLD = 80;
        const ENVIRONMENT_READY_HOLD_MS = 900;
        const ENVIRONMENT_LIGHT_SAMPLE_MS = 220;
        const ENVIRONMENT_VIEWPORT_MIN_WIDTH = 1180;
        const ENVIRONMENT_VIEWPORT_MIN_HEIGHT = 700;
        const ENVIRONMENT_VIEWPORT_MAX_WIDTH = 2200;
        const ENVIRONMENT_VIEWPORT_MAX_HEIGHT = 1400;
        const AOI_VALIDITY_RANK = {
            valid: 0,
            limited: 1,
            excluded: 2
        };

        function createEnvironmentCheckState() {
            return {
                open: false,
                faceDetected: false,
                faceCentered: false,
                lightingOk: false,
                brightness: 0,
                lastBrightnessSampleAt: 0,
                readySince: null,
                readyToProceed: false,
                faceBounds: null,
                setup: null
            };
        }

        function getViewportSnapshot() {
            return {
                width: Math.max(0, window.innerWidth || 0),
                height: Math.max(0, window.innerHeight || 0),
                fullscreen: !!document.fullscreenElement,
                devicePixelRatio: Number((window.devicePixelRatio || 1).toFixed(2)),
                orientation: (window.innerWidth || 0) >= (window.innerHeight || 0) ? "landscape" : "portrait"
            };
        }

        function createAoiEnvironmentState() {
            const snapshot = getViewportSnapshot();
            return {
                startedAt: null,
                completedAt: null,
                initialViewport: snapshot,
                latestViewport: snapshot,
                deviceCategory: "unknown",
                validity: "limited",
                reasons: [],
                resizeCount: 0,
                fullscreenExitCount: 0,
                multipleVisibleRows: false,
                calibrationSkipped: false
            };
        }

        function getAoiValidityRank(validity = "limited") {
            return AOI_VALIDITY_RANK[validity] ?? AOI_VALIDITY_RANK.limited;
        }

        function getAoiValidityLabel(validity = "limited") {
            if (validity === "valid") return "권장 환경";
            if (validity === "excluded") return "AOI 제외";
            return "AOI 참고용";
        }

        function getAoiReasonLabel(reason) {
            const labelMap = {
                mobile_or_tablet: "모바일/태블릿 환경",
                viewport_too_small: "브라우저 화면이 너무 작음",
                viewport_too_large: "브라우저 화면이 너무 큼",
                not_fullscreen: "전체화면 아님",
                resize_detected: "검사 중 창 크기 변경",
                fullscreen_exited: "검사 중 전체화면 이탈",
                multiple_questions_visible: "한 번에 여러 문항 노출"
            };

            return labelMap[reason] ?? reason;
        }

        function getEnvironmentDeviceCategory(snapshot = getViewportSnapshot()) {
            const userAgent = navigator.userAgent || "";
            const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
            const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            const narrowShortestEdge = Math.min(snapshot.width, snapshot.height) > 0 && Math.min(snapshot.width, snapshot.height) < 700;

            if (mobileUa || (coarsePointer && narrowShortestEdge)) {
                return "mobile_or_tablet";
            }

            return "desktop_or_laptop";
        }

        function getMultipleVisibleQuestionState() {
            if (currentStep !== 1 && currentStep !== 2) return false;
            return getVisibleRows().length > 1;
        }

        function evaluateAoiEnvironment(snapshot = getViewportSnapshot(), { includeRuntime = false } = {}) {
            const reasons = [];
            let validity = "valid";
            const deviceCategory = getEnvironmentDeviceCategory(snapshot);

            if (deviceCategory === "mobile_or_tablet") {
                validity = "excluded";
                reasons.push("mobile_or_tablet");
            }

            if (snapshot.width < ENVIRONMENT_VIEWPORT_MIN_WIDTH || snapshot.height < ENVIRONMENT_VIEWPORT_MIN_HEIGHT) {
                validity = getAoiValidityRank(validity) < getAoiValidityRank("limited") ? "limited" : validity;
                reasons.push("viewport_too_small");
            }

            if (snapshot.width > ENVIRONMENT_VIEWPORT_MAX_WIDTH || snapshot.height > ENVIRONMENT_VIEWPORT_MAX_HEIGHT) {
                validity = getAoiValidityRank(validity) < getAoiValidityRank("limited") ? "limited" : validity;
                reasons.push("viewport_too_large");
            }

            if (!snapshot.fullscreen) {
                validity = getAoiValidityRank(validity) < getAoiValidityRank("limited") ? "limited" : validity;
                reasons.push("not_fullscreen");
            }

            if (includeRuntime) {
                if (aoiEnvironmentState.resizeCount > 0) {
                    validity = getAoiValidityRank(validity) < getAoiValidityRank("limited") ? "limited" : validity;
                    reasons.push("resize_detected");
                }

                if (aoiEnvironmentState.fullscreenExitCount > 0) {
                    validity = getAoiValidityRank(validity) < getAoiValidityRank("limited") ? "limited" : validity;
                    reasons.push("fullscreen_exited");
                }

                if (aoiEnvironmentState.multipleVisibleRows) {
                    validity = getAoiValidityRank(validity) < getAoiValidityRank("limited") ? "limited" : validity;
                    reasons.push("multiple_questions_visible");
                }
            }

            const uniqueReasons = Array.from(new Set(reasons));
            const primaryReason = uniqueReasons.length ? getAoiReasonLabel(uniqueReasons[0]) : "권장 환경입니다.";
            const secondaryReason = uniqueReasons.length > 1
                ? uniqueReasons.slice(1).map(getAoiReasonLabel).join(", ")
                : "";

            return {
                snapshot,
                deviceCategory,
                validity,
                reasons: uniqueReasons,
                status: getAoiValidityLabel(validity),
                hint: uniqueReasons.length
                    ? primaryReason + (secondaryReason ? ", " + secondaryReason : "")
                    : "Viewport " + snapshot.width + " x " + snapshot.height + ", 전체화면, 데스크톱/노트북 환경입니다."
            };
        }

        function syncAoiEnvironmentState({ resizeDetected = false, fullscreenExited = false } = {}) {
            if (resizeDetected) {
                aoiEnvironmentState.resizeCount += 1;
            }

            if (fullscreenExited) {
                aoiEnvironmentState.fullscreenExitCount += 1;
            }

            aoiEnvironmentState.latestViewport = getViewportSnapshot();
            aoiEnvironmentState.multipleVisibleRows = getMultipleVisibleQuestionState();

            const evaluation = evaluateAoiEnvironment(aoiEnvironmentState.latestViewport, { includeRuntime: true });
            aoiEnvironmentState.deviceCategory = evaluation.deviceCategory;
            aoiEnvironmentState.validity = evaluation.validity;
            aoiEnvironmentState.reasons = evaluation.reasons;
            analytics.environment = {
                validity: evaluation.validity,
                reasons: evaluation.reasons,
                initialViewport: aoiEnvironmentState.initialViewport,
                latestViewport: aoiEnvironmentState.latestViewport,
                resizeCount: aoiEnvironmentState.resizeCount,
                fullscreenExitCount: aoiEnvironmentState.fullscreenExitCount,
                multipleVisibleRows: aoiEnvironmentState.multipleVisibleRows,
                calibrationSkipped: aoiEnvironmentState.calibrationSkipped
            };
            return evaluation;
        }

        function getAoiEnvironmentSnapshot() {
            const evaluation = syncAoiEnvironmentState();
            return {
                validity: evaluation.validity,
                status: evaluation.status,
                reasons: evaluation.reasons,
                reasonLabels: evaluation.reasons.map(getAoiReasonLabel),
                deviceCategory: evaluation.deviceCategory,
                initialViewport: aoiEnvironmentState.initialViewport,
                latestViewport: aoiEnvironmentState.latestViewport,
                resizeCount: aoiEnvironmentState.resizeCount,
                fullscreenExitCount: aoiEnvironmentState.fullscreenExitCount,
                multipleVisibleRows: aoiEnvironmentState.multipleVisibleRows,
                calibrationSkipped: aoiEnvironmentState.calibrationSkipped,
                startedAt: aoiEnvironmentState.startedAt,
                completedAt: aoiEnvironmentState.completedAt
            };
        }

        const CALIBRATION_CLICKS_REQUIRED = 5;
        const CALIBRATION_PANEL_MARGIN = 24;
        const CALIBRATION_PANEL_TOP = 96;
        const CALIBRATION_PANEL_FALLBACK_WIDTH = 352;
        const CALIBRATION_PANEL_FALLBACK_HEIGHT = 320;
        const CALIBRATION_REVIEW_TRAIL_LIMIT = 80;
        const CALIBRATION_POINT_LAYOUT = [
            { id: "top-left", x: 18, y: 20 },
            { id: "top-center", x: 50, y: 12 },
            { id: "top-right", x: 82, y: 20 },
            { id: "middle-left", x: 10, y: 52 },
            { id: "middle-right", x: 82, y: 52 },
            { id: "bottom-left", x: 12, y: 84 },
            { id: "bottom-center", x: 50, y: 80 },
            { id: "bottom-right", x: 82, y: 84 },
            { id: "center", x: 50, y: 52 }
        ];
        const CALIBRATION_OUTER_POINT_IDS = CALIBRATION_POINT_LAYOUT
            .filter((point) => point.id !== "center")
            .map((point) => point.id);
        const CALIBRATION_TOTAL_CLICKS = CALIBRATION_POINT_LAYOUT.length * CALIBRATION_CLICKS_REQUIRED;

        function getCalibrationPanelBounds() {
            return {
                width: dom.calibrationControlPanel?.offsetWidth || Math.min(window.innerWidth - CALIBRATION_PANEL_MARGIN * 2, CALIBRATION_PANEL_FALLBACK_WIDTH),
                height: dom.calibrationControlPanel?.offsetHeight || CALIBRATION_PANEL_FALLBACK_HEIGHT
            };
        }

        function clampCalibrationPanelPosition(position) {
            const bounds = getCalibrationPanelBounds();
            return {
                x: clamp(position.x, CALIBRATION_PANEL_MARGIN, Math.max(CALIBRATION_PANEL_MARGIN, window.innerWidth - bounds.width - CALIBRATION_PANEL_MARGIN)),
                y: clamp(position.y, CALIBRATION_PANEL_MARGIN, Math.max(CALIBRATION_PANEL_MARGIN, window.innerHeight - bounds.height - CALIBRATION_PANEL_MARGIN))
            };
        }

        function getDefaultCalibrationPanelPosition() {
            return clampCalibrationPanelPosition({
                x: window.innerWidth - CALIBRATION_PANEL_FALLBACK_WIDTH - CALIBRATION_PANEL_MARGIN,
                y: CALIBRATION_PANEL_TOP
            });
        }

        function createCalibrationPointClicks() {
            return CALIBRATION_POINT_LAYOUT.reduce((acc, point) => {
                acc[point.id] = 0;
                return acc;
            }, {});
        }

        function createCalibrationState() {
            return {
                open: false,
                phase: "intro",
                preparing: false,
                engineReady: false,
                error: null,
                cursorX: window.innerWidth / 2,
                cursorY: window.innerHeight / 2,
                panelPosition: getDefaultCalibrationPanelPosition(),
                reviewTrail: [],
                pointClicks: createCalibrationPointClicks()
            };
        }

        let analytics = createAnalytics();
        let webgazerState = createWebGazerState();
        let environmentCheckState = createEnvironmentCheckState();
        let aoiEnvironmentState = createAoiEnvironmentState();
        let calibrationState = createCalibrationState();
        let webcamStream = null;
        let latestFaceSample = null;
        let lastVideoTime = -1;
        let cameraRequestStarted = false;
        let surveyPredictionLoopRunning = false;
        let adminPanelOpen = false;
        let calibrationPanelDrag = {
            active: false,
            offsetX: 0,
            offsetY: 0
        };
        let adminDrawingUtils = null;
        let environmentOverlayDrawingUtils = null;
        let environmentBrightnessCanvas = null;
        let environmentBrightnessCtx = null;
        let adminDebugTarget = {
            xRatio: 0.5,
            yRatio: 0.5,
            label: "?쇳꽣 怨좎젙"
        };

        function createCptMetrics() {
            return {
                hits: 0,
                omits: 0,
                commission: 0,
                hyperactivity: 0,
                rts: [],
                frames: 0,
                frontal: 0,
                attentive: 0,
                distracted: 0,
                blinksInStimulus: 0,
                blockStats: Array.from({ length: 4 }, () => ({
                    hits: 0,
                    distracted: 0,
                    frames: 0
                }))
            };
        }

        function getCptCanvasContext() {
            return dom.cptOutputCanvas?.getContext("2d");
        }

        function getCptBlockType(block) {
            return ["Baseline", "Visual Distraction", "Auditory Distraction", "Combined"][block - 1];
        }

        function buildCptPipLayout(count) {
            return {
                1: [1],
                2: [1, 1],
                3: [1, 1, 1],
                4: [2, 2],
                5: [2, 1, 2]
            }[count] ?? [1];
        }

        function renderCptStimulusCard(stimulus) {
            if (!dom.cptStimulusContent) return;

            if (!stimulus) {
                dom.cptStimulusContent.innerHTML = "";
                dom.cptStimulusContent.classList.remove("is-active", "is-target", "is-distractor");
                dom.cptStimulusContent.removeAttribute("data-suit");
                dom.cptStimulusContent.removeAttribute("aria-label");
                return;
            }

            const suit = CPT_CARD_SUITS[stimulus.suit] ?? CPT_CARD_SUITS.spade;
            const pipRows = buildCptPipLayout(stimulus.count).map((rowCount) => {
                const pips = Array.from({ length: rowCount }, () => '<span class="cpt-card-pip">' + suit.symbol + '</span>').join("");
                return '<div class="cpt-card-pip-row">' + pips + '</div>';
            }).join("");

            dom.cptStimulusContent.dataset.suit = stimulus.suit;
            dom.cptStimulusContent.setAttribute("aria-label", stimulus.isTarget ? "Target card" : suit.label + " card");
            dom.cptStimulusContent.classList.add("is-active");
            dom.cptStimulusContent.classList.toggle("is-target", !!stimulus.isTarget);
            dom.cptStimulusContent.classList.toggle("is-distractor", !stimulus.isTarget);
            dom.cptStimulusContent.innerHTML =
                '<div class="cpt-card-watermark">' + suit.symbol + '</div>' +
                '<div class="cpt-card-corner cpt-card-corner--top">' +
                '<span class="cpt-card-rank">' + stimulus.rank + '</span>' +
                '<span class="cpt-card-suit">' + suit.symbol + '</span>' +
                '</div>' +
                '<div class="cpt-card-center">' + pipRows + '</div>' +
                '<div class="cpt-card-corner cpt-card-corner--bottom">' +
                '<span class="cpt-card-rank">' + stimulus.rank + '</span>' +
                '<span class="cpt-card-suit">' + suit.symbol + '</span>' +
                '</div>';
        }

        function safeBlendshapeScore(blendshapes, name) {
            return blendshapes?.find((item) => item.categoryName === name)?.score ?? 0;
        }

        function applyEnvironmentTone(card, label, tone) {
            if (card) {
                card.classList.remove("border-emerald-200", "bg-emerald-50", "border-rose-200", "bg-rose-50", "border-amber-200", "bg-amber-50", "border-slate-200", "bg-slate-50");
                if (tone === "ok") {
                    card.classList.add("border-emerald-200", "bg-emerald-50");
                } else if (tone === "warn") {
                    card.classList.add("border-rose-200", "bg-rose-50");
                } else if (tone === "idle") {
                    card.classList.add("border-slate-200", "bg-slate-50");
                } else {
                    card.classList.add("border-amber-200", "bg-amber-50");
                }
            }

            if (label) {
                label.classList.remove("text-emerald-600", "text-rose-600", "text-amber-600", "text-slate-600");
                if (tone === "ok") {
                    label.classList.add("text-emerald-600");
                } else if (tone === "warn") {
                    label.classList.add("text-rose-600");
                } else if (tone === "idle") {
                    label.classList.add("text-slate-600");
                } else {
                    label.classList.add("text-amber-600");
                }
            }
        }

        function isEnvironmentCheckOpen() {
            return !!dom.environmentCheckOverlay && !dom.environmentCheckOverlay.classList.contains("hidden");
        }

        function syncEnvironmentPreviewStream() {
            if (!dom.environmentWebcamPreview) return;

            if (dom.environmentWebcamPreview.srcObject !== webcamStream) {
                dom.environmentWebcamPreview.srcObject = webcamStream;
            }

            if (!webcamStream) return;

            const startPreview = () => {
                dom.environmentWebcamPreview.play().catch(() => {});
            };

            if (dom.environmentWebcamPreview.readyState >= 1) {
                startPreview();
            } else {
                dom.environmentWebcamPreview.onloadedmetadata = startPreview;
            }
        }

        function syncCalibrationPreviewStream() {
            if (!dom.calibrationWebcamPreview) return;

            if (dom.calibrationWebcamPreview.srcObject !== webcamStream) {
                dom.calibrationWebcamPreview.srcObject = webcamStream;
            }

            if (!webcamStream) return;

            const startPreview = () => {
                dom.calibrationWebcamPreview.play().catch(() => {});
            };

            if (dom.calibrationWebcamPreview.readyState >= 1) {
                startPreview();
            } else {
                dom.calibrationWebcamPreview.onloadedmetadata = startPreview;
            }
        }

        function resetSurveyTracking() {
            analytics = createAnalytics();
            analytics.cameraState = webcamStream ? "active" : "idle";
            analytics.cameraStartedAt = webcamStream ? new Date().toISOString() : null;
            analytics.environment = getAoiEnvironmentSnapshot();
            latestFaceSample = null;
            lastVideoTime = -1;
            webgazerState.lastAcceptedAt = 0;
            webgazerState.survey = createWebGazerPhaseStore();
            setWebGazerPhase("survey");
            renderWebGazerAdmin();
        }

        function getEnvironmentBrightnessContext() {
            if (environmentBrightnessCtx) return environmentBrightnessCtx;

            environmentBrightnessCanvas = document.createElement("canvas");
            environmentBrightnessCanvas.width = 48;
            environmentBrightnessCanvas.height = 36;
            environmentBrightnessCtx = environmentBrightnessCanvas.getContext("2d", { willReadFrequently: true });
            return environmentBrightnessCtx;
        }

        function getFaceBounds(landmarks) {
            if (!landmarks?.length) return null;

            const bounds = landmarks.reduce((acc, point) => ({
                left: Math.min(acc.left, point.x),
                top: Math.min(acc.top, point.y),
                right: Math.max(acc.right, point.x),
                bottom: Math.max(acc.bottom, point.y)
            }), {
                left: 1,
                top: 1,
                right: 0,
                bottom: 0
            });

            return {
                ...bounds,
                width: bounds.right - bounds.left,
                height: bounds.bottom - bounds.top
            };
        }

        function getEnvironmentGuideBounds() {
            const shell = dom.environmentGuideBox?.parentElement;
            const shellRect = shell?.getBoundingClientRect();
            const guideRect = dom.environmentGuideBox?.getBoundingClientRect();
            if (!shellRect?.width || !shellRect?.height || !guideRect) return null;

            return {
                left: (guideRect.left - shellRect.left) / shellRect.width,
                right: (guideRect.right - shellRect.left) / shellRect.width,
                top: (guideRect.top - shellRect.top) / shellRect.height,
                bottom: (guideRect.bottom - shellRect.top) / shellRect.height
            };
        }

        function measureEnvironmentBrightness() {
            if (!dom.webcam?.videoWidth || !dom.webcam?.videoHeight) return null;

            const ctx = getEnvironmentBrightnessContext();
            if (!ctx || !environmentBrightnessCanvas) return null;

            const sourceWidth = dom.webcam.videoWidth;
            const sourceHeight = dom.webcam.videoHeight;
            const sx = sourceWidth * 0.08;
            const sy = sourceHeight * 0.04;
            const sw = sourceWidth * 0.84;
            const sh = sourceHeight * 0.26;

            ctx.clearRect(0, 0, environmentBrightnessCanvas.width, environmentBrightnessCanvas.height);
            ctx.drawImage(dom.webcam, sx, sy, sw, sh, 0, 0, environmentBrightnessCanvas.width, environmentBrightnessCanvas.height);

            const { data } = ctx.getImageData(0, 0, environmentBrightnessCanvas.width, environmentBrightnessCanvas.height);
            let total = 0;

            for (let index = 0; index < data.length; index += 4) {
                total += data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
            }

            return total / (data.length / 4);
        }

        function drawEnvironmentOverlay() {
            if (!dom.environmentGuideOverlay) return;

            const canvas = dom.environmentGuideOverlay;
            const ctx = canvas.getContext("2d");
            const shell = canvas.parentElement;
            if (!ctx || !shell) return;

            const width = Math.max(1, Math.round(shell.clientWidth));
            const height = Math.max(1, Math.round(shell.clientHeight));
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        function renderEnvironmentCheck(now = performance.now(), result = null) {
            const analytics = updateEnvironmentCheckAnalytics(now, result);
            const brightness = Math.round(environmentCheckState.brightness || 0);
            if (dom.environmentLightStatus) dom.environmentLightStatus.textContent = environmentCheckState.lightingOk ? "조명 양호" : "조명 확인 필요";
            if (dom.environmentLightHint) dom.environmentLightHint.textContent = "현재 밝기 " + brightness + "/255";
            if (dom.environmentPositionStatus) dom.environmentPositionStatus.textContent = environmentCheckState.faceCentered ? "얼굴 위치 양호" : "얼굴을 중앙에 맞춰 주세요";
            if (dom.environmentPositionHint) dom.environmentPositionHint.textContent = environmentCheckState.faceDetected ? "얼굴 전체가 안내 영역 안에 들어오게 맞춰 주세요." : "카메라 앞에 얼굴을 보여 주세요.";
            if (dom.environmentSummary) dom.environmentSummary.textContent = environmentCheckState.readyToProceed ? "검사 환경이 준비되었습니다." : "검사 환경을 확인하고 있습니다.";
            if (dom.environmentCameraBadge) dom.environmentCameraBadge.textContent = webcamRunning ? "Camera live" : "Camera preparing";
            if (dom.environmentFaceBadge) dom.environmentFaceBadge.textContent = environmentCheckState.faceDetected ? "Face detected" : "Face waiting";
            if (dom.environmentContinueBtn) dom.environmentContinueBtn.disabled = !environmentCheckState.readyToProceed;
            return analytics;
        }
        function completeEnvironmentCheck() {
            if (!environmentCheckState.readyToProceed) return;

            closeEnvironmentCheck({ keepCamera: true });
            openCalibration();
        }

        function openEnvironmentCheck() {
            if (!dom.environmentCheckOverlay) return false;

            environmentCheckState = createEnvironmentCheckState();
            dom.environmentCheckOverlay.classList.remove("hidden");
            dom.environmentCheckOverlay.setAttribute("aria-hidden", "false");
            document.body.classList.add("overflow-hidden");
            syncEnvironmentPreviewStream();
            renderEnvironmentCheck();

            Promise.resolve(ensureCameraStarted({ startWebGazer: false }))
                .then(() => {
                    syncEnvironmentPreviewStream();
                    renderEnvironmentCheck();
                })
                .catch((error) => {
                    console.error("Environment check camera start failed", error);
                    renderEnvironmentCheck();
                });

            return true;
        }

        function getCalibrationStats() {
            const totalClicks = Object.values(calibrationState.pointClicks).reduce((sum, value) => sum + value, 0);
            const completedPoints = CALIBRATION_POINT_LAYOUT.filter((point) => calibrationState.pointClicks[point.id] >= CALIBRATION_CLICKS_REQUIRED).length;
            const outerComplete = CALIBRATION_OUTER_POINT_IDS.every((pointId) => calibrationState.pointClicks[pointId] >= CALIBRATION_CLICKS_REQUIRED);

            return {
                totalClicks,
                completedPoints,
                outerComplete,
                allComplete: completedPoints === CALIBRATION_POINT_LAYOUT.length
            };
        }

        function getCalibrationPointColor(clicks) {
            if (clicks >= CALIBRATION_CLICKS_REQUIRED) return "#fde047";

            const opacity = 0.16 + clicks * 0.18;
            return "rgba(239, 68, 68, " + opacity.toFixed(2) + ")";
        }

        function applyCalibrationPanelPosition() {
            if (!dom.calibrationControlPanel) return;

            calibrationState.panelPosition = clampCalibrationPanelPosition(calibrationState.panelPosition);
            dom.calibrationControlPanel.style.left = calibrationState.panelPosition.x + "px";
            dom.calibrationControlPanel.style.top = calibrationState.panelPosition.y + "px";
        }

        function beginCalibrationPanelDrag(event) {
            if (!calibrationState.open || calibrationState.phase === "intro" || !dom.calibrationControlPanel) return;
            if (event.button !== 0) return;

            const rect = dom.calibrationControlPanel.getBoundingClientRect();
            calibrationPanelDrag.active = true;
            calibrationPanelDrag.offsetX = event.clientX - rect.left;
            calibrationPanelDrag.offsetY = event.clientY - rect.top;
            dom.calibrationControlPanel.classList.add("calibration-panel-dragging");
            event.preventDefault();
        }

        function stopCalibrationPanelDrag() {
            calibrationPanelDrag.active = false;
            dom.calibrationControlPanel?.classList.remove("calibration-panel-dragging");
        }

        function pushCalibrationReviewSample(sample) {
            calibrationState.reviewTrail.push(sample);
            if (calibrationState.reviewTrail.length > CALIBRATION_REVIEW_TRAIL_LIMIT) {
                calibrationState.reviewTrail.shift();
            }
        }

        function renderCalibrationReviewLayer() {
            if (!dom.calibrationReviewLayer) return;

            const showReview = calibrationState.open && calibrationState.phase === "review";
            dom.calibrationReviewLayer.classList.toggle("hidden", !showReview);

            if (!showReview) {
                dom.calibrationReviewLayer.innerHTML = "";
                return;
            }

            dom.calibrationReviewLayer.innerHTML = calibrationState.reviewTrail.map((sample, index) => {
                const latestClass = index === calibrationState.reviewTrail.length - 1 ? " is-latest" : "";
                return '<span class="calibration-review-dot' + latestClass + '" style="left:' + sample.x + 'px; top:' + sample.y + 'px;"></span>';
            }).join("");
        }

        function renderCalibrationPoints() {
            if (!dom.calibrationPointsLayer) return;

            if (!calibrationState.open || calibrationState.phase === "intro" || calibrationState.phase === "review") {
                dom.calibrationPointsLayer.innerHTML = "";
                return;
            }

            const stats = getCalibrationStats();
            const points = stats.outerComplete
                ? CALIBRATION_POINT_LAYOUT
                : CALIBRATION_POINT_LAYOUT.filter((point) => point.id !== "center");

            dom.calibrationPointsLayer.innerHTML = points.map((point) => {
                const clicks = calibrationState.pointClicks[point.id];
                const complete = clicks >= CALIBRATION_CLICKS_REQUIRED;
                const disabled = calibrationState.phase !== "active" || calibrationState.preparing || complete;
                const countLabel = complete ? "OK" : (clicks > 0 ? String(clicks) : "");

                return `
                    <button
                        type="button"
                        class="calibration-point ${complete ? "is-complete" : ""}"
                        data-calibration-point="${point.id}"
                        style="left:${point.x}%; top:${point.y}%; background:${getCalibrationPointColor(clicks)};"
                        ${disabled ? "disabled" : ""}
                    >
                        <span class="calibration-point-count">${countLabel}</span>
                    </button>
                `;
            }).join("");
        }

        function renderCalibrationOverlay() {
            if (!dom.calibrationOverlay) return;

            if (!calibrationState.open) {
                dom.calibrationOverlay.classList.add("hidden");
                dom.calibrationOverlay.setAttribute("aria-hidden", "true");
                if (dom.calibrationPointsLayer) dom.calibrationPointsLayer.innerHTML = "";
                dom.calibrationCursorDot?.classList.add("hidden");
                renderCalibrationReviewLayer();
                return;
            }

            const stats = getCalibrationStats();
            const engineLabel = calibrationState.preparing || webgazerBooting
                ? "Engine booting"
                : webgazerRunning
                    ? "Engine ready"
                    : "Engine idle";
            const faceLabel = latestFaceSample?.present
                ? (latestFaceSample.forward ? "Face aligned" : "Face detected")
                : "Face not found";

            let statusLabel = "Calibration required";
            let summary = "?붾㈃ 媛?μ옄由??먮뱾??癒쇱? ?ㅼ꽢 踰덉뵫 ?대┃?섍퀬, 留덉?留됱뿉 以묒븰 ?먭퉴吏 ?꾨즺?섎㈃ ?ㅼ젣 ?쒖꽑 異붿쟻???쒖옉?⑸땲??";
            let miniSummary = "?멸낸 ?먯쓣 癒쇱? ?ㅼ꽢 踰덉뵫 ?대┃??二쇱꽭??";
            let instruction = "媛??먯쓣 ?ㅼ꽢 踰덉뵫 ?대┃?섎㈃ ?몃??됱쑝濡?諛붾뚭퀬, ?멸낸 ?먯씠 ?앸굹硫?以묒븰 ?먯씠 ?섑??⑸땲??";

            if (calibrationState.error === "engine_unavailable") {
                summary = "WebGazer瑜??쒖옉?섏? 紐삵뻽?듬땲?? 移대찓??沅뚰븳怨??쇨뎬 ?꾩튂瑜??뺤씤?????ㅼ떆 ?쒕룄??二쇱꽭??";
                miniSummary = summary;
            } else if (calibrationState.preparing || webgazerBooting) {
                statusLabel = "Starting";
                summary = "蹂댁젙 ?붿쭊??以鍮꾪븯怨??덉뒿?덈떎. 移대찓?쇨? ?덉젙?붾릺硫?蹂댁젙???쒖옉?????덉뒿?덈떎.";
                miniSummary = "?쒖꽑 異붿쟻 ?붿쭊??以鍮꾪븯怨??덉뒿?덈떎.";
                instruction = "?붿쭊??以鍮꾨릺硫??멸낸 ?먮???李⑤??濡??ㅼ꽢 踰덉뵫 ?대┃??二쇱꽭??";
            } else if (calibrationState.phase === "active") {
                statusLabel = stats.outerComplete ? "Center target" : "Edge targets";
                summary = "鍮④컙 ?먯? ?대┃?좎닔濡??먯젏 吏꾪빐吏怨? ?ㅼ꽢 踰덉㎏ ?대┃?먯꽌 ?몃??됱쑝濡?怨좎젙?⑸땲??";
                miniSummary = stats.outerComplete
                    ? "醫뗭뒿?덈떎. ?댁젣 ?뺢??대뜲 ?먯쓣 ?ㅼ꽢 踰??대┃??二쇱꽭??"
                    : "?멸낸 ?먮뱾??癒쇱? 紐⑤몢 ?몃??됱쑝濡?諛붽퓭 二쇱꽭??";
                instruction = stats.outerComplete
                    ? "以묒븰 ?먯쓣 ?ㅼ꽢 踰??대┃?섎㈃ ?꾩껜 蹂댁젙???꾨즺?⑸땲??"
                    : "??긽 留덉슦?ㅻ? ?덉쑝濡??곕씪媛硫??멸낸 ?먯쓣 癒쇱? ?ㅼ꽢 踰덉뵫 ?대┃??二쇱꽭??";
            } else if (calibrationState.phase === "review") {
                statusLabel = "Tracking check";
                summary = "?뚮? 異붿쟻 ?먯씠 ?쒖꽑 ?吏곸엫???먯뿰?ㅻ읇寃??곕씪?ㅻ뒗吏 ?좉퉸 ?붾㈃???섎윭蹂대ŉ ?뺤씤??二쇱꽭??";
                miniSummary = "?붾㈃??泥쒖쿇???섎윭蹂????ㅻⅨ履쎌뿉???ㅼ떆 蹂댁젙?좎? 怨꾩냽 吏꾪뻾?좎? ?좏깮??二쇱꽭??";
                instruction = "?뚮? ?먯씠 遺덉븞?뺥븯嫄곕굹 ??쾶 ?곕씪?ㅻ㈃ ?ㅼ떆 蹂댁젙???꾨Ⅴ怨? 愿쒖갖?쇰㈃ 怨꾩냽 吏꾪뻾???뚮윭 二쇱꽭??";
            } else if (calibrationState.phase === "complete") {
                statusLabel = "Calibration done";
                summary = "紐⑤뱺 蹂댁젙 ?먯씠 ?몃??됱씠 ?섏뿀?듬땲?? ?댁젣 ?ㅻЦ?쇰줈 ?섏뼱媛 ?ㅼ젣 ?쒖꽑 異붿쟻???쒖옉?????덉뒿?덈떎.";
                miniSummary = "蹂댁젙???앸궗?듬땲?? ?ㅻЦ ?쒖옉 踰꾪듉???뚮윭 吏꾪뻾??二쇱꽭??";
                instruction = "蹂댁젙 ?꾨즺 ?곹깭?낅땲?? ?ㅻЦ???쒖옉?섎㈃ ?꾩옱 紐⑤뜽濡??쒖꽑 異붿쟻??怨꾩냽?⑸땲??";
            }

            dom.calibrationOverlay.classList.remove("hidden");
            dom.calibrationOverlay.setAttribute("aria-hidden", "false");
            if (dom.calibrationEngineBadge) dom.calibrationEngineBadge.textContent = engineLabel;
            if (dom.calibrationFaceBadge) dom.calibrationFaceBadge.textContent = faceLabel;
            if (dom.calibrationStatusPill) dom.calibrationStatusPill.textContent = statusLabel;
            if (dom.calibrationProgressText) dom.calibrationProgressText.textContent = `${stats.totalClicks} / ${CALIBRATION_TOTAL_CLICKS}`;
            if (dom.calibrationSummary) dom.calibrationSummary.textContent = summary;
            if (dom.calibrationMiniSummary) dom.calibrationMiniSummary.textContent = miniSummary;
            if (dom.calibrationInstructionText) dom.calibrationInstructionText.textContent = instruction;
            if (dom.calibrationCompletedCount) dom.calibrationCompletedCount.textContent = `${stats.completedPoints} / ${CALIBRATION_POINT_LAYOUT.length}`;
            if (dom.calibrationClickCount) dom.calibrationClickCount.textContent = `${stats.totalClicks} / ${CALIBRATION_TOTAL_CLICKS}`;
            if (dom.calibrationPanelTitle) {
                dom.calibrationPanelTitle.textContent = calibrationState.phase === "review" ? "Tracking Validation" : "Manual Calibration";
            }

            if (dom.calibrationStartBtn) {
                dom.calibrationStartBtn.disabled = calibrationState.preparing || !calibrationState.engineReady;
                dom.calibrationStartBtn.textContent = calibrationState.preparing ? "?붿쭊 ?쒖옉 以?.." : "蹂댁젙 ?쒖옉";
            }

            dom.calibrationIntroCard?.classList.toggle("hidden", calibrationState.phase !== "intro");
            if (dom.calibrationContinueBtn) {
                dom.calibrationContinueBtn.textContent = calibrationState.phase === "review" ? "怨꾩냽 吏꾪뻾" : "?ㅻЦ ?쒖옉";
            }
            dom.calibrationControlPanel?.classList.toggle("hidden", calibrationState.phase === "intro");
            dom.calibrationContinueBtn?.classList.toggle("hidden", !(calibrationState.phase === "review" || calibrationState.phase === "complete"));
            dom.calibrationStatsGrid?.classList.toggle("hidden", calibrationState.phase === "review");
            applyCalibrationPanelPosition();
            if (dom.calibrationResetBtn) {
                dom.calibrationResetBtn.disabled = calibrationState.preparing;
            }

            if (dom.calibrationCursorDot) {
                const showCursorDot = calibrationState.phase === "active";
                dom.calibrationCursorDot.classList.toggle("hidden", !showCursorDot);
                if (showCursorDot) {
                    dom.calibrationCursorDot.style.left = `${calibrationState.cursorX}px`;
                    dom.calibrationCursorDot.style.top = `${calibrationState.cursorY}px`;
                }
            }

            renderCalibrationPoints();
            renderCalibrationReviewLayer();
        }

        async function primeCalibrationModel(phase = "intro") {
            calibrationState.preparing = true;
            calibrationState.engineReady = false;
            calibrationState.error = null;
            renderCalibrationOverlay();

            if (webcamStream) {
                await startWebGazer(webcamStream);
            }

            const instance = window.webgazer;
            if (!webgazerRunning || !instance) {
                calibrationState.preparing = false;
                calibrationState.engineReady = false;
                calibrationState.error = "engine_unavailable";
                renderCalibrationOverlay();
                return false;
            }

            if (typeof instance.clearData === "function") {
                await instance.clearData();
            }

            disableWebGazerMouseLearning(instance);
            calibrationState.pointClicks = createCalibrationPointClicks();
            calibrationState.reviewTrail = [];
            calibrationState.phase = phase;
            calibrationState.preparing = false;
            calibrationState.engineReady = true;
            calibrationState.error = null;
            webgazerState.lastAcceptedAt = 0;
            webgazerState.calibration = createWebGazerPhaseStore();
            setWebGazerPhase("calibration");
            renderCalibrationOverlay();
            return true;
        }

        function openCalibration() {
            if (!dom.calibrationOverlay) return false;

            calibrationState = createCalibrationState();
            calibrationState.open = true;
            dom.calibrationOverlay.classList.remove("hidden");
            dom.calibrationOverlay.setAttribute("aria-hidden", "false");
            document.body.classList.add("overflow-hidden");
            syncCalibrationPreviewStream();
            renderCalibrationOverlay();

            Promise.resolve(ensureCameraStarted({ startWebGazer: false }))
                .then(() => {
                    syncCalibrationPreviewStream();
                    return primeCalibrationModel("intro");
                })
                .catch((error) => {
                    console.error("Calibration camera start failed", error);
                    calibrationState.preparing = false;
                    calibrationState.engineReady = false;
                    calibrationState.error = "engine_unavailable";
                    renderCalibrationOverlay();
                });

            return true;
        }

        function closeCalibration({ keepCamera = true, emitComplete = false } = {}) {
            if (!dom.calibrationOverlay) return;

            stopCalibrationPanelDrag();
            dom.calibrationOverlay.classList.add("hidden");
            dom.calibrationOverlay.setAttribute("aria-hidden", "true");
            document.body.classList.remove("overflow-hidden");
            if (dom.calibrationPointsLayer) {
                dom.calibrationPointsLayer.innerHTML = "";
            }
            calibrationState = createCalibrationState();

            if (!keepCamera) {
                stopWebGazer();
                stopCamera();
            }

            if (emitComplete) {
                window.dispatchEvent(new CustomEvent("fast:calibration-complete"));
            }
        }

        function startCalibrationSequence() {
            if (!calibrationState.open || calibrationState.preparing || !calibrationState.engineReady) return;

            calibrationState.phase = "active";
            calibrationState.error = null;
            calibrationState.cursorX = window.innerWidth / 2;
            calibrationState.cursorY = window.innerHeight / 2;
            calibrationState.reviewTrail = [];
            setWebGazerPhase("calibration");
            renderCalibrationOverlay();
        }

        async function restartCalibrationSequence() {
            if (!calibrationState.open || calibrationState.preparing) return;
            calibrationState.reviewTrail = [];
            await primeCalibrationModel("active");
        }

        function finalizeCalibrationSequence() {
            if (!calibrationState.open || (calibrationState.phase !== "complete" && calibrationState.phase !== "review")) return;

            resetSurveyTracking();
            closeCalibration({ keepCamera: true, emitComplete: true });
        }

        function handleCalibrationPointSelection(button, event = null) {
            if (!button || !calibrationState.open || calibrationState.phase !== "active" || calibrationState.preparing || !calibrationState.engineReady) {
                return;
            }

            if (event) {
                if (typeof event.button === "number" && event.button !== 0) return;
                event.preventDefault();
                event.stopPropagation();
            }

            const pointId = button.dataset.calibrationPoint;
            if (!pointId) return;

            const clicks = calibrationState.pointClicks[pointId] ?? 0;
            if (clicks >= CALIBRATION_CLICKS_REQUIRED) return;

            const rect = button.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            window.webgazer?.recordScreenPosition?.(x, y, "click");

            calibrationState.pointClicks[pointId] = Math.min(CALIBRATION_CLICKS_REQUIRED, clicks + 1);
            const stats = getCalibrationStats();
            if (stats.allComplete) {
                calibrationState.phase = "review";
                calibrationState.reviewTrail = [];
                calibrationState.panelPosition = getDefaultCalibrationPanelPosition();
            }

            renderCalibrationOverlay();
        }

        function handleCalibrationMouseMove(event) {
            if (!calibrationState.open || calibrationState.phase === "intro") return;

            calibrationState.cursorX = event.clientX;
            calibrationState.cursorY = event.clientY;

            if (calibrationPanelDrag.active) {
                calibrationState.panelPosition = clampCalibrationPanelPosition({
                    x: event.clientX - calibrationPanelDrag.offsetX,
                    y: event.clientY - calibrationPanelDrag.offsetY
                });
                applyCalibrationPanelPosition();
            }

            if (dom.calibrationCursorDot) {
                dom.calibrationCursorDot.classList.remove("hidden");
                dom.calibrationCursorDot.style.left = `${event.clientX}px`;
                dom.calibrationCursorDot.style.top = `${event.clientY}px`;
            }
        }

        function getWebGazerPhaseStore(phase = webgazerState.phase) {
            if (phase === "calibration") return webgazerState.calibration;
            if (phase === "cpt") return webgazerState.cpt;
            if (phase === "debug") return webgazerState.debug;
            return webgazerState.survey;
        }

        function setWebGazerPhase(phase) {
            webgazerState.phase = phase;
            renderWebGazerAdmin();
            renderCptWebGazerLive();
            renderAdminLiveDebug();
            renderCalibrationOverlay();
        }

        function getWebGazerStatusLabel() {
            const labelMap = {
                idle: "Idle",
                booting: "Booting",
                active: "Tracking",
                error: "Error",
                stopped: "Stopped"
            };

            return labelMap[webgazerState.status] ?? webgazerState.status;
        }

        function formatWebGazerCoords(sample) {
            if (!sample) return "x -, y -";
            return `x ${Math.round(sample.x)}, y ${Math.round(sample.y)}`;
        }

        function formatWebGazerSampleAge(sample) {
            if (!sample) return "No recent sample";
            return `${Math.round((performance.now() - sample.t) / 1000)}s ago`;
        }

        function formatWebGazerCaptureWindow(durationMs) {
            return `${(Math.max(0, durationMs) / 1000).toFixed(1)}s`;
        }

        function formatWebGazerSampleOffset(sample, firstSample) {
            if (!sample || !firstSample) return "t+0.00s";
            return `t+${((sample.t - firstSample.t) / 1000).toFixed(2)}s`;
        }

        function getWebGazerPhaseSummary(phase = webgazerState.phase) {
            const store = getWebGazerPhaseStore(phase);
            const sample = store.lastSample;
            const firstSample = store.samples[0] ?? null;
            const durationMs = firstSample && sample ? Math.max(0, sample.t - firstSample.t) : 0;
            const validRatio = Math.round((store.validCount / Math.max(1, store.rawCount)) * 100) || 0;
            const sampleRate = durationMs > 0 ? store.validCount / (durationMs / 1000) : 0;

            return {
                phase,
                store,
                sample,
                firstSample,
                durationMs,
                validRatio,
                sampleRate,
                recentSamples: store.samples.slice(-5).reverse()
            };
        }

        function updateLiveGazeDot(sample) {
            if (!SHOW_WEBGAZER_DOT || !dom.webgazerLiveDot || !sample) return;

            dom.webgazerLiveDot.classList.remove("hidden");
            dom.webgazerLiveDot.style.left = `${sample.x}px`;
            dom.webgazerLiveDot.style.top = `${sample.y}px`;
        }

        function hideLiveGazeDot() {
            if (dom.webgazerLiveDot) {
                dom.webgazerLiveDot.classList.add("hidden");
            }
        }

        function ensureWebGazerDotMode() {
            if (!SHOW_WEBGAZER_DOT && dom.webgazerLiveDot) {
                dom.webgazerLiveDot.classList.add("hidden");
            }
        }

        function pushWebGazerSample(store, sample) {
            store.samples.push(sample);
            if (store.samples.length > WEBGAZER_PHASE_LIMIT) {
                store.samples.shift();
            }
            store.lastSample = sample;
        }

        function handleWebGazerPrediction(data, elapsedTime) {
            const store = getWebGazerPhaseStore();
            store.rawCount += 1;

            if (!data || !Number.isFinite(data.x) || !Number.isFinite(data.y)) {
                return;
            }

            const now = performance.now();
            if (now - webgazerState.lastAcceptedAt < WEBGAZER_SAMPLE_INTERVAL_MS) {
                return;
            }

            const sample = {
                x: clamp(data.x, 0, window.innerWidth),
                y: clamp(data.y, 0, window.innerHeight),
                t: now,
                elapsed: elapsedTime ?? now,
                width: window.innerWidth,
                height: window.innerHeight,
                phase: webgazerState.phase
            };

            store.validCount += 1;
            webgazerState.lastAcceptedAt = now;
            pushWebGazerSample(store, sample);
            if (calibrationState.open && calibrationState.phase === "review") {
                pushCalibrationReviewSample(sample);
                renderCalibrationReviewLayer();
            }
            updateLiveGazeDot(sample);
            renderWebGazerAdmin();
            renderCptWebGazerLive();
        }

        function drawWebGazerWireframe(canvas, phase) {
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const width = Math.max(320, Math.round(canvas.clientWidth || 320));
            const height = 260;
            canvas.width = width;
            canvas.height = height;

            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.strokeStyle = "#bfdbfe";
            ctx.lineWidth = 1;
            ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

            ctx.fillStyle = "#eff6ff";
            ctx.fillRect(12, 12, width - 24, 34);

            if (phase === "survey") {
                ctx.fillStyle = "#f8fafc";
                for (let index = 0; index < 4; index += 1) {
                    ctx.fillRect(18, 60 + (index * 44), width - 36, 30);
                }
            } else {
                ctx.fillStyle = "#f8fafc";
                ctx.fillRect(18, 60, Math.round(width * 0.66), height - 78);
                ctx.fillRect(Math.round(width * 0.72), 60, width - Math.round(width * 0.72) - 18, height - 78);
                ctx.strokeStyle = "#22d3ee";
                ctx.beginPath();
                ctx.arc(Math.round(width * 0.35), Math.round(height * 0.48), 36, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        function drawWebGazerSamples(canvas, phase) {
            if (!canvas) return;

            drawWebGazerWireframe(canvas, phase);

            const ctx = canvas.getContext("2d");
            const store = getWebGazerPhaseStore(phase);
            if (!ctx || !store.samples.length) return;

            store.samples.forEach((sample, index) => {
                const alpha = 0.15 + ((index + 1) / store.samples.length) * 0.55;
                const x = (sample.x / Math.max(1, sample.width)) * canvas.width;
                const y = (sample.y / Math.max(1, sample.height)) * canvas.height;
                ctx.fillStyle = `rgba(8, 145, 178, ${alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
            });

            const lastSample = store.lastSample;
            if (lastSample) {
                const x = (lastSample.x / Math.max(1, lastSample.width)) * canvas.width;
                const y = (lastSample.y / Math.max(1, lastSample.height)) * canvas.height;
                ctx.fillStyle = "#ef4444";
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function renderWebGazerAdmin() {
            if (!dom.adminWebgazerState) return;

            const phase = webgazerState.phase === "cpt" ? "cpt" : "survey";
            const summary = getWebGazerPhaseSummary(phase);
            const { store, sample } = summary;

            dom.adminWebgazerPhase.textContent = phase.toUpperCase();
            dom.adminWebgazerState.textContent = getWebGazerStatusLabel();
            dom.adminWebgazerSamples.textContent = `${store.validCount} valid / ${store.rawCount} raw`;
            dom.adminWebgazerCoords.textContent = formatWebGazerCoords(sample);
            dom.adminWebgazerTime.textContent = formatWebGazerSampleAge(sample);
            dom.adminWebgazerViewport.textContent = sample ? `${sample.width} x ${sample.height}` : `${window.innerWidth} x ${window.innerHeight}`;
            drawWebGazerSamples(dom.adminWebgazerCanvas, phase);
        }

        function renderAdminSampleList(container, summary) {
            if (!container) return;

            const { store, recentSamples, firstSample } = summary;
            container.innerHTML = recentSamples.length
                ? recentSamples.map((entry, index) => {
                    const sampleNumber = Math.max(1, store.validCount - index);
                    return `
                        <div class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <span class="font-bold text-slate-500">Sample ${sampleNumber}</span>
                            <span class="text-slate-900">${formatWebGazerCoords(entry)}</span>
                            <span class="text-slate-500">${formatWebGazerSampleOffset(entry, firstSample)}</span>
                        </div>
                    `;
                }).join("")
                : `<div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">No stored gaze samples.</div>`;
        }

        function renderAdminPhaseSummary(summary, phase) {
            const isSurvey = phase === "survey";
            const sample = summary.sample;
            const validRatioLabel = `${summary.validRatio}% valid`;
            const rateLabel = `${summary.sampleRate.toFixed(1)} sps`;
            const rawLabel = `raw ${summary.store.rawCount} callbacks`;
            const validLabel = String(summary.store.validCount);
            const viewportLabel = sample ? `${sample.width} x ${sample.height}` : `${window.innerWidth} x ${window.innerHeight}`;
            const windowLabel = `${formatWebGazerCaptureWindow(summary.durationMs)} capture window`;

            if (isSurvey) {
                dom.adminSurveyValidCount.textContent = validLabel;
                dom.adminSurveyRawCount.textContent = rawLabel;
                dom.adminSurveyCoverage.textContent = validRatioLabel;
                dom.adminSurveyRate.textContent = rateLabel;
                dom.adminSurveyCoords.textContent = formatWebGazerCoords(sample);
                dom.adminSurveyTime.textContent = formatWebGazerSampleAge(sample);
                dom.adminSurveyViewport.textContent = viewportLabel;
                dom.adminSurveyWindow.textContent = windowLabel;
                drawWebGazerSamples(dom.adminSurveyCanvas, "survey");
                renderAdminSampleList(dom.adminSurveyRecent, summary);
                return;
            }

            dom.adminCptValidCount.textContent = validLabel;
            dom.adminCptRawCount.textContent = rawLabel;
            dom.adminCptCoverage.textContent = validRatioLabel;
            dom.adminCptRate.textContent = rateLabel;
            dom.adminCptCoords.textContent = formatWebGazerCoords(sample);
            dom.adminCptTime.textContent = formatWebGazerSampleAge(sample);
            dom.adminCptViewport.textContent = viewportLabel;
            dom.adminCptWindow.textContent = windowLabel;
            drawWebGazerSamples(dom.adminCptCanvas, "cpt");
            renderAdminSampleList(dom.adminCptRecent, summary);
        }

        function renderAdminEventHistory() {
            if (!dom.adminCptEvents) return;

            dom.adminCptEvents.innerHTML = cptEventHistory.length
                ? cptEventHistory.slice(0, 18).map((entry) => `
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <span class="font-bold text-slate-500">[${entry.time}]</span>
                        <span class="ml-3 text-slate-900">${entry.message}</span>
                    </div>
                `).join("")
                : `<div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">No stored CPT events.</div>`;
        }

        function positionAdminDebugDot(element, xRatio, yRatio, hidden = false) {
            if (!element) return;

            if (hidden) {
                element.classList.add("hidden");
                return;
            }

            element.classList.remove("hidden");
            element.style.left = `${(clamp(xRatio, 0, 1) * 100).toFixed(2)}%`;
            element.style.top = `${(clamp(yRatio, 0, 1) * 100).toFixed(2)}%`;
        }

        function getAdminDebugTargetViewportPoint() {
            const width = Math.max(1, window.innerWidth);
            const height = Math.max(1, window.innerHeight);
            return {
                x: adminDebugTarget.xRatio * width,
                y: adminDebugTarget.yRatio * height,
                width,
                height
            };
        }
        function getAdminDebugQualityLabel(errorPx) {
            if (!Number.isFinite(errorPx)) return "점을 바라보고 확인하세요.";
            if (errorPx <= 80) return "정확도가 좋습니다";
            if (errorPx <= 150) return "대체로 맞지만 오차가 있습니다";
            return "오차가 커서 보정이 필요합니다";
        }

        function setAdminDebugTarget(xRatio, yRatio, label = "직접 지정") {
            adminDebugTarget = {
                xRatio: clamp(xRatio, 0.08, 0.92),
                yRatio: clamp(yRatio, 0.08, 0.92),
                label
            };
            renderAdminLiveDebug();
        }

        function randomizeAdminDebugTarget() {
            setAdminDebugTarget(
                0.12 + (Math.random() * 0.76),
                0.14 + (Math.random() * 0.72),
                "랜덤 목표"
            );
        }

        function renderAdminLiveDebug() {
            if (!dom.adminDebugStatus) return;

            positionAdminDebugDot(dom.adminDebugTargetDot, adminDebugTarget.xRatio, adminDebugTarget.yRatio);

            const target = getAdminDebugTargetViewportPoint();
            dom.adminDebugPhase.textContent = "DEBUG";
            dom.adminDebugStatus.textContent = getWebGazerStatusLabel();
            dom.adminDebugTargetCoords.textContent = `x ${Math.round(target.x)}, y ${Math.round(target.y)}`;
            dom.adminDebugTargetLabel.textContent = adminDebugTarget.label;

            const sample = getFreshWebGazerSample("debug", performance.now(), 1200);
            if (!sample) {
                positionAdminDebugDot(dom.adminDebugPredictedDot, 0, 0, true);
                dom.adminDebugPredictedCoords.textContent = "x -, y -";
                dom.adminDebugSampleAge.textContent = "No recent sample";
                dom.adminDebugError.textContent = "-";
                dom.adminDebugQuality.textContent = webgazerState.phase === "debug"
                    ? "목표 점을 바라보면 예측 점이 표시됩니다"
                    : "관리자 화면에서 실시간 검증을 시작하세요";
                return;
            }

            const predictedXRatio = sample.x / Math.max(1, sample.width || window.innerWidth);
            const predictedYRatio = sample.y / Math.max(1, sample.height || window.innerHeight);
            const errorPx = Math.hypot(sample.x - target.x, sample.y - target.y);

            positionAdminDebugDot(dom.adminDebugPredictedDot, predictedXRatio, predictedYRatio);
            dom.adminDebugPredictedCoords.textContent = formatWebGazerCoords(sample);
            dom.adminDebugSampleAge.textContent = formatWebGazerSampleAge(sample);
            dom.adminDebugError.textContent = `${Math.round(errorPx)}px`;
            dom.adminDebugQuality.textContent = getAdminDebugQualityLabel(errorPx);
        }

        function renderAdminExperience() {
            if (!dom.adminCombinedStatus) return;

            const surveySummary = getWebGazerPhaseSummary("survey");
            const cptSummary = getWebGazerPhaseSummary("cpt");
            const totalValidCount = surveySummary.store.validCount + cptSummary.store.validCount;
            const totalRawCount = surveySummary.store.rawCount + cptSummary.store.rawCount;
            const totalDurationMs = surveySummary.durationMs + cptSummary.durationMs;

            dom.adminCombinedStatus.textContent = getWebGazerStatusLabel();
            dom.adminCombinedPhase.textContent = "SURVEY + CPT";
            dom.adminCombinedWindow.textContent = formatWebGazerCaptureWindow(totalDurationMs);
            dom.adminTotalValidCount.textContent = `${totalValidCount} valid / ${totalRawCount} raw`;

            renderAdminPhaseSummary(surveySummary, "survey");
            renderAdminPhaseSummary(cptSummary, "cpt");
            renderAdminEventHistory();
            renderAdminLiveDebug();
        }

        function setExperienceView(view) {
            const isSurvey = view === "survey";
            const isCpt = view === "cpt";
            const isResults = view === "results";
            const isAdmin = view === "admin";

            dom.surveyExperience?.classList.toggle("hidden", !isSurvey);
            dom.cptExperience?.classList.toggle("hidden", !isCpt);
            dom.resultsExperience?.classList.toggle("hidden", !isResults);
            dom.adminExperience?.classList.toggle("hidden", !isAdmin);
            document.body.classList.toggle("overflow-hidden", !isSurvey);
        }

        function showResultsExperience() {
            if (webgazerState.phase === "debug") {
                stopWebGazer();
                stopCamera();
                setWebGazerPhase("survey");
            }
            setExperienceView("results");
        }

        function showAdminExperience() {
            setExperienceView("admin");
            webgazerState.debug = createWebGazerPhaseStore();
            webgazerState.lastAcceptedAt = 0;
            if (!webcamStream) {
                cameraRequestStarted = false;
            }
            setWebGazerPhase("debug");
            Promise.resolve(ensureCameraStarted())
                .catch((error) => console.error("Admin debug camera start failed", error))
                .finally(() => {
                    requestAnimationFrame(() => {
                        renderAdminExperience();
                        renderAdminLiveDebug();
                    });
                });
        }

        function renderCptWebGazerLive() {
            if (!dom.cptLiveWebgazerState) return;

            const store = getWebGazerPhaseStore("cpt");
            dom.cptLiveWebgazerState.textContent = getWebGazerStatusLabel().toUpperCase();
            dom.cptLiveWebgazerSamples.textContent = String(store.validCount);
            dom.cptLiveWebgazerCoords.textContent = formatWebGazerCoords(store.lastSample);
        }

        function renderCptWebGazerResults() {
            if (!dom.cptResWebgazerState) return;

            const summary = getWebGazerPhaseSummary("cpt");
            const { store, sample, firstSample, durationMs, validRatio, sampleRate, recentSamples } = summary;
            const faceFrameCount = cptMetrics?.frames ?? 0;
            const attentiveFrameCount = cptMetrics?.attentive ?? 0;
            const distractedFrameCount = cptMetrics?.distracted ?? 0;

            if (dom.cptResWebgazerPhase) {
                dom.cptResWebgazerPhase.textContent = "CPT";
            }
            dom.cptResWebgazerState.textContent = getWebGazerStatusLabel().toUpperCase();
            dom.cptResWebgazerSamples.textContent = String(store.validCount);
            dom.cptResWebgazerRaw.textContent = `raw ${store.rawCount} callbacks`;
            dom.cptResWebgazerCoords.textContent = formatWebGazerCoords(sample);
            dom.cptResWebgazerTime.textContent = formatWebGazerSampleAge(sample);
            dom.cptResWebgazerViewport.textContent = sample ? `${sample.width} x ${sample.height}` : `${window.innerWidth} x ${window.innerHeight}`;
            if (dom.cptResWebgazerWindow) {
                dom.cptResWebgazerWindow.textContent = formatWebGazerCaptureWindow(durationMs);
            }
            if (dom.cptResWebgazerCoverage) {
                dom.cptResWebgazerCoverage.textContent = `${validRatio}% valid / ${sampleRate.toFixed(1)} sps`;
            }
            if (dom.cptResWebgazerMetrics) {
                dom.cptResWebgazerMetrics.innerHTML = [
                    `?좏슚 ?섑뵆: ${store.validCount}`,
                    `Raw callbacks: ${store.rawCount}`,
                    `?섏쭛 援ш컙: ${formatWebGazerCaptureWindow(durationMs)}`,
                    `異붿젙 cadence: ${sampleRate.toFixed(1)} samples/s`,
                    `CPT face frames: ${faceFrameCount}`,
                    `AOI attentive frames: ${attentiveFrameCount}`,
                    `Distracted frames: ${distractedFrameCount}`,
                    `CPT gaze log rows: ${cptDataLog.length}`
                ].map((item) => `<div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">${item}</div>`).join("");
            }
            if (dom.cptResWebgazerRecent) {
                dom.cptResWebgazerRecent.innerHTML = recentSamples.length
                    ? recentSamples.map((entry, index) => {
                        const sampleNumber = store.validCount - index;
                        return `
                            <div class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <span class="font-bold text-slate-500">Sample ${sampleNumber}</span>
                                <span class="text-slate-900">${formatWebGazerCoords(entry)}</span>
                                <span class="text-slate-500">${formatWebGazerSampleOffset(entry, firstSample)}</span>
                            </div>
                        `;
                    }).join("")
                    : `<div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">??λ맂 gaze ?섑뵆???놁뒿?덈떎.</div>`;
            }
            drawWebGazerSamples(dom.cptWebgazerCanvas, "cpt");
        }

        function exportWebGazerData() {
            return {
                status: webgazerState.status,
                phase: webgazerState.phase,
                startedAt: webgazerState.startedAt,
                calibration: {
                    rawCount: webgazerState.calibration.rawCount,
                    validCount: webgazerState.calibration.validCount,
                    lastSample: webgazerState.calibration.lastSample,
                    samples: webgazerState.calibration.samples
                },
                survey: {
                    rawCount: webgazerState.survey.rawCount,
                    validCount: webgazerState.survey.validCount,
                    lastSample: webgazerState.survey.lastSample,
                    samples: webgazerState.survey.samples
                },
                cpt: {
                    rawCount: webgazerState.cpt.rawCount,
                    validCount: webgazerState.cpt.validCount,
                    lastSample: webgazerState.cpt.lastSample,
                    samples: webgazerState.cpt.samples
                },
                debug: {
                    rawCount: webgazerState.debug.rawCount,
                    validCount: webgazerState.debug.validCount,
                    lastSample: webgazerState.debug.lastSample,
                    samples: webgazerState.debug.samples
                }
            };
        }

        function updateCptLoadingStatus(message, ready = false) {
            if (!dom.cptLoadingStatus || !dom.cptStartBtn) return;
            dom.cptLoadingStatus.textContent = message;
            dom.cptStartBtn.disabled = !ready;
        }

        function resetCptUi() {
            renderCptStimulusCard(null);
            dom.cptStimulusContent.classList.remove("cpt-animate-target");
            dom.cptFixationCross.classList.add("hidden");
            dom.cptInstruction.textContent = "Initializing...";
            dom.cptVisualDistractors.innerHTML = "";
            dom.cptEventLog.innerHTML = "";
            dom.cptCurrentTrial.textContent = "0";
            dom.cptTotalProgress.style.width = "0%";
            dom.cptLiveAttentive.textContent = "0%";
            dom.cptBarAttentive.style.width = "0%";
            dom.cptLiveYaw.textContent = "0.0째";
            dom.cptYawCursor.style.left = "50%";
            dom.cptIndicatorGaze.style.backgroundColor = "#ef4444";
            dom.cptIndicatorHead.style.backgroundColor = "#ef4444";
            renderCptWebGazerLive();
        }

        function resetCptState() {
            cptGameState = "IDLE";
            cptCurrentBlock = 1;
            cptTrialInBlock = 0;
            cptOverallTrialCount = 0;
            cptCurrentStimulus = null;
            cptStimulusStartTime = 0;
            cptResponded = false;
            cptDataLog = [];
            cptEventHistory = [];
            cptMetrics = createCptMetrics();
            cptUsesSharedSurveyStream = false;
            cptLastVideoTime = -1;
            webgazerState.lastAcceptedAt = 0;
            webgazerState.cpt = createWebGazerPhaseStore();
            resetCptUi();
            dom.cptResultsModal?.classList.add("hidden");
        }

        function getReusableSurveyStream() {
            if (!webcamStream) return null;
            const hasLiveVideoTrack = webcamStream.getVideoTracks().some((track) => track.readyState === "live");
            return hasLiveVideoTrack ? webcamStream : null;
        }

        function renderQuestions(containerId, questions, startIndex) {
            const container = document.getElementById(containerId);
            questions.forEach((question, index) => {
                const questionIndex = startIndex + index;
                const row = document.createElement("div");
                row.className = "question-row transition-all duration-300 -mx-6 px-6 py-10";
                row.dataset.questionIndex = String(questionIndex);
                row.innerHTML = `
                    <div class="survey-question-shell relative mx-auto flex min-h-[32rem] w-full max-w-4xl items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                        <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]"></div>
                        <div data-survey-task-aoi="true" class="relative z-10 flex h-[19rem] w-full max-w-[34rem] flex-col items-center justify-between rounded-[2rem] px-6 py-7 text-center md:px-8">
                            <p class="text-2xl md:text-3xl font-bold text-slate-800 leading-tight tracking-tight">
                                <span class="text-blue-600/30 mr-2 font-black italic">Q${questionIndex + 1}.</span>${question}
                            </p>
                            <div class="flex w-full items-end justify-between gap-2 px-1 md:gap-3 md:px-3">
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
                                            <div class="circle-ui ${circleUIClasses[value]} rounded-full border-[3px] border-gray-100 transition-all duration-500 mb-4 bg-white flex items-center justify-center">
                                                <span class="text-xl font-black text-slate-200 v-text transition-colors duration-500">${value}</span>
                                            </div>
                                            <div class="text-center transition-all duration-300">
                                                <p class="text-[10px] md:text-xs font-bold text-slate-300 label-text transition-colors duration-300 whitespace-nowrap uppercase tracking-tight">${likertLabels[value]}</p>
                                            </div>
                                        </label>
                                    </div>
                                `).join("")}
                            </div>
                        </div>
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

            if (aoiEnvironmentState.startedAt) {
                aoiEnvironmentState.multipleVisibleRows = visibleRows.length > 1;
                syncAoiEnvironmentState();
            }

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

        function getDomAnsweredCount(part = null) {
            const selectorMap = {
                1: '#part1-questions input[type="radio"]:checked',
                2: '#part2-questions input[type="radio"]:checked'
            };

            if (part === 1 || part === 2) {
                return document.querySelectorAll(selectorMap[part]).length;
            }

            return document.querySelectorAll('#part1-questions input[type="radio"]:checked, #part2-questions input[type="radio"]:checked').length;
        }

        function syncAnswersFromDom() {
            analytics.questions.forEach((metric, index) => {
                const checkedInput = document.querySelector(`input[name="q${index}"]:checked`);
                metric.answerValue = checkedInput ? Number(checkedInput.value) : null;
            });
        }

        function getAnsweredCount(part = null) {
            const analyticsCount = analytics.questions.filter((metric) => metric.answerValue !== null && (part === null || metric.part === part)).length;
            return Math.max(analyticsCount, getDomAnsweredCount(part));
        }

        function getFirstUnansweredRow(part) {
            const metric = analytics.questions.find((item) => item.part === part && item.answerValue === null);
            if (!metric) return null;
            return questionRows.find((row) => Number(row.dataset.questionIndex) === metric.id - 1) ?? null;
        }

        function scrollToFirstUnanswered(part) {
            const row = getFirstUnansweredRow(part);
            row?.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        function getStepScrollTarget(step) {
            if (step === 1) return getFirstUnansweredRow(1) ?? dom.part1Questions ?? dom.step1 ?? null;
            if (step === 2) return getFirstUnansweredRow(2) ?? dom.part2Questions ?? dom.step2 ?? null;
            if (step === 3) return dom.step3 ?? null;
            return null;
        }

        function setButtonBlocked(button, blocked) {
            if (!button) return;
            button.disabled = false;
            button.classList.toggle("is-disabled", blocked);
            button.setAttribute("aria-disabled", String(blocked));
        }

        function updateProgress() {
            const answeredCount = getAnsweredCount();
            const answeredPart1 = getAnsweredCount(1);
            const answeredPart2 = getAnsweredCount(2);
            const percentage = (answeredCount / totalQuestions) * 100;
            if (dom.progressBar) dom.progressBar.style.width = `${percentage}%`;

            setButtonBlocked(dom.nextBtn, currentStep !== 1 || answeredPart1 < questionsPart1.length);
            setButtonBlocked(dom.prevBtn, currentStep === 1);
            setButtonBlocked(dom.submitBtn, currentStep !== 2 || answeredPart2 < questionsPart2.length);
        }

        function setStepVisibility(element, isActive) {
            if (!element) return;
            element.hidden = !isActive;
            element.setAttribute("aria-hidden", String(!isActive));
            element.classList.toggle("active", isActive);
            element.style.display = isActive ? "block" : "none";
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
            if (!dom.adminPanel || !dom.toggleAdminBtn) return;
            dom.adminPanel.classList.toggle("admin-panel-hidden", !open);
            dom.toggleAdminBtn.textContent = open ? "관리자 측정 확인 숨기기" : "관리자 측정 확인 보기";

            if (open && webcamStream && dom.adminWebcam) {
                dom.adminWebcam.srcObject = webcamStream;
                dom.adminWebcam.play().catch(() => {});
            }

            if (!open && dom.adminOverlay) {
                const ctx = dom.adminOverlay.getContext("2d");
                ctx.clearRect(0, 0, dom.adminOverlay.width, dom.adminOverlay.height);
            }

            renderAdminPanel();
        }

        function resizeAdminOverlay() {
            if (!dom.adminOverlay || !dom.adminWebcam || !dom.webcam) return;
            dom.adminOverlay.width = dom.adminWebcam.videoWidth || dom.webcam.videoWidth || 640;
            dom.adminOverlay.height = dom.adminWebcam.videoHeight || dom.webcam.videoHeight || 480;
        }

        function renderAdminPanel() {
            if (!dom.adminCameraState || !dom.adminRawMetrics) return;
            const metrics = aggregateMetrics();
            const currentMetric = getCurrentQuestionMetric();
            const cameraLabelMap = {
                idle: "대기",
                active: "활성",
                denied: "권한 거부",
                unavailable: "준비 실패"
            };

            dom.adminCameraState.textContent = cameraLabelMap[analytics.cameraState] ?? analytics.cameraState;
            dom.adminFacePresence.textContent = "얼굴 검출률 " + Math.round(metrics.facePresenceRatio * 100) + "%";

            if (!latestFaceSample || !latestFaceSample.present) {
                dom.adminAttentionState.textContent = "얼굴 미검출";
            } else if (latestFaceSample.attentive) {
                dom.adminAttentionState.textContent = "정면 주시";
            } else {
                dom.adminAttentionState.textContent = "주의 이탈";
            }
            dom.adminAwayRatio.textContent = `?댄깉 鍮꾩쑉 ${Math.round(metrics.awayRatio * 100)}%`;
            dom.adminHeadMotion.textContent = `${metrics.headMotionStd.toFixed(1)}째`;
            dom.adminEuler.textContent = `yaw ${currentEuler.yaw.toFixed(1)} / pitch ${currentEuler.pitch.toFixed(1)} / roll ${currentEuler.roll.toFixed(1)}`;

            if (currentMetric) {
                dom.adminQuestionId.textContent = `Q${currentMetric.id}`;
                dom.adminQuestionMeta.textContent = `泥대쪟 ${formatMs(currentMetric.visibleMs)} / ?묐떟 ${currentMetric.responseMs === null ? "-" : formatMs(currentMetric.responseMs)}`;
            } else {
                dom.adminQuestionId.textContent = "Q-";
                dom.adminQuestionMeta.textContent = "泥대쪟 0珥?/ ?묐떟 -";
            }

            dom.adminStatusText.textContent = latestFaceSample?.present
                ? "?ㅼ떆媛??쇨뎬 ?쒕뱶留덊겕? 媛곷룄 異붿젙媛믪씠 ?ㅼ뼱?ㅺ퀬 ?덉뒿?덈떎."
                : "?꾩옱 ?쇨뎬???≫엳吏 ?딄굅??移대찓???곗씠?곌? ?놁뒿?덈떎.";

            dom.adminRawMetrics.innerHTML = [
                `珥??섑뵆 ?? ${analytics.face.totalSamples}`,
                `?쇨뎬 寃異??섑뵆: ${analytics.face.presentSamples}`,
                `?뺣㈃ 二쇱떆 ?섑뵆: ${analytics.face.attentiveSamples}`,
                `鍮꾩＜???댄깉 ?섑뵆: ${analytics.face.awaySamples + analytics.face.missingSamples}`,
                "빠른 응답 문항: " + metrics.rapidCount,
                "문항 재방문 횟수: " + metrics.revisitTotal,
                "평균 응답 시간: " + (metrics.averageResponseMs / 1000).toFixed(1) + "초",
                `yaw ?쒖??몄감: ${statStd(analytics.face.yaw).toFixed(2)}째`,
                `pitch ?쒖??몄감: ${statStd(analytics.face.pitch).toFixed(2)}째`,
                `roll ?쒖??몄감: ${statStd(analytics.face.roll).toFixed(2)}째`
            ].map((item) => `<div class="rounded-2xl bg-white px-4 py-3 border border-slate-100">${item}</div>`).join("");
            renderWebGazerAdmin();
        }

        function setStep(step, { focusStepTarget = false, skipScroll = false } = {}) {
            currentStep = step;
            setWebGazerPhase("survey");
            setStepVisibility(dom.step1, step === 1);
            setStepVisibility(dom.step2, step === 2);
            setStepVisibility(dom.step3, step === 3);
            if (dom.stepIndicator) dom.stepIndicator.textContent = `STEP ${step} / 2`;
            if (skipScroll) {
                setActiveQuestion(performance.now());
            } else if (focusStepTarget) {
                requestAnimationFrame(() => {
                    getStepScrollTarget(step)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    setActiveQuestion(performance.now());
                });
            } else {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setActiveQuestion(performance.now());
            }
            updateProgress();
        }

        async function createFaceLandmarker() {
            try {
                updateCptLoadingStatus("Model loading...", false);
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
                updateCptLoadingStatus("Ready to start", true);
                if (webcamRunning) {
                    startSurveyPredictionLoop();
                }
                renderEnvironmentCheck();
            } catch (error) {
                console.error(error);
                analytics.cameraState = "unavailable";
                updateCptLoadingStatus("Model failed to load", false);
                renderEnvironmentCheck();
            }
        }

        function startSurveyPredictionLoop() {
            if (surveyPredictionLoopRunning || !webcamRunning) return;
            surveyPredictionLoopRunning = true;
            requestAnimationFrame(predictWebcam);
        }

        async function ensureCameraStarted({ startWebGazer: shouldStartWebGazer = true } = {}) {
            if (webcamStream) {
                if (faceLandmarker) {
                    startSurveyPredictionLoop();
                }
                syncEnvironmentPreviewStream();
                syncCalibrationPreviewStream();
                if (shouldStartWebGazer) {
                    startWebGazer(webcamStream);
                }
                return;
            }
            if (cameraRequestStarted) return;
            cameraRequestStarted = true;

            if (!hasGetUserMedia()) {
                analytics.cameraState = "unavailable";
                showCameraError("移대찓??API媛 吏?먮릺吏 ?딄굅??沅뚰븳???놁뼱 移대찓?쇰? ?쒖옉?????놁뒿?덈떎.");
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
                syncEnvironmentPreviewStream();
                syncCalibrationPreviewStream();
                if (dom.adminWebcam) {
                    dom.adminWebcam.srcObject = webcamStream;
                }
                if (adminPanelOpen && dom.adminWebcam) {
                    dom.adminWebcam.play().catch(() => {});
                }
                webcamRunning = true;
                analytics.cameraState = "active";
                analytics.cameraStartedAt = new Date().toISOString();
                startSurveyPredictionLoop();
                renderEnvironmentCheck();
                if (shouldStartWebGazer) {
                    startWebGazer(webcamStream);
                }
            } catch (error) {
                console.error(error);
                analytics.cameraState = "denied";
                cameraRequestStarted = false;
                renderEnvironmentCheck();
            }
        }

        function stopCamera() {
            webcamRunning = false;
            surveyPredictionLoopRunning = false;
            cameraRequestStarted = false;
            if (webcamStream) {
                webcamStream.getTracks().forEach((track) => track.stop());
                webcamStream = null;
            }
            dom.webcam.srcObject = null;
            if (dom.adminWebcam) {
                dom.adminWebcam.srcObject = null;
            }
            if (dom.environmentWebcamPreview) {
                dom.environmentWebcamPreview.srcObject = null;
            }
            if (dom.calibrationWebcamPreview) {
                dom.calibrationWebcamPreview.srcObject = null;
            }
            if (dom.adminOverlay) {
                const ctx = dom.adminOverlay.getContext("2d");
                ctx.clearRect(0, 0, dom.adminOverlay.width, dom.adminOverlay.height);
            }
            if (dom.environmentGuideOverlay) {
                const ctx = dom.environmentGuideOverlay.getContext("2d");
                ctx?.clearRect(0, 0, dom.environmentGuideOverlay.width, dom.environmentGuideOverlay.height);
            }
        }

        function drawAdminOverlay(result) {
            if (!dom.adminOverlay) return;
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
            if (!webcamRunning) {
                surveyPredictionLoopRunning = false;
                return;
            }

            if (!faceLandmarker) {
                requestAnimationFrame(predictWebcam);
                return;
            }

            if (lastVideoTime !== dom.webcam.currentTime) {
                lastVideoTime = dom.webcam.currentTime;
                const now = performance.now();
                const result = faceLandmarker.detectForVideo(dom.webcam, now);
                ingestFaceResult(result, now);
                renderEnvironmentCheck(now, result);
                drawEnvironmentOverlay(result);
                if (calibrationState.open) {
                    renderCalibrationOverlay();
                }
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
                    title: "吏묒쨷 ?좎?",
                    score: focusScore,
                    hint: `${Math.round(metrics.attentionRatio * 100)}% ?뺣룄?먯꽌 臾명빆 以묒떖 ?쒖꽑???좎??먯뼱??`,
                    desc: "臾명빆??蹂대뒗 ?숈븞 ?쒖꽑怨??쇨뎬???쇰쭏???덉젙?곸쑝濡??좎??먮뒗吏 ?붿빟??媛믪엯?덈떎."
                },
                {
                    title: "?묐떟 ?띾룄",
                    score: responseScore,
                    hint: `?됯퇏 ?묐떟 ?쒓컙? ${(metrics.averageResponseMs / 1000).toFixed(1)}珥덉??댁슂.`,
                    desc: "?덈Т 鍮좊Ⅴ寃?怨좊Ⅴ嫄곕굹, 嫄곗쓽 蹂댁? ?딄퀬 ?섍릿 臾명빆??留롮쑝硫??먯닔媛 ?대젮媛묐땲??"
                },
                {
                    title: "움직임 안정성",
                    score: stabilityScore,
                    hint: `?ㅻЦ 以?癒몃━ ?吏곸엫 蹂?숈꽦? ${metrics.headMotionStd.toFixed(1)}째 ?섏??댁뿀?댁슂.`,
                    desc: "怨좉컻 ?吏곸엫???ш퀬 ??쓣?섎줉 ?쎈뒗 怨쇱젙???덉젙?깆씠 ??쾶 諛섏쁺?⑸땲??"
                },
                {
                    title: "?붾㈃ ?댄깉",
                    score: distractionScore,
                    hint: `${Math.round(metrics.awayRatio * 100)}% 援ш컙?먯꽌 臾명빆 諛붽묑 二쇱쓽 遺꾩궛??媛먯??먯뼱??`,
                    desc: "臾명빆?먯꽌 ?먯＜ 踰쀬뼱?섍굅??媛숈? 臾명빆???щ윭 踰??ㅼ떆 蹂대뒗 ?먮쫫??諛섏쁺?⑸땲??"
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
                notes.push("移대찓??沅뚰븳???덉슜?섏? ?딆븘 ?ㅻЦ ?묐떟 ?⑦꽩 以묒떖?쇰줈留?寃곌낵瑜??뺣━?덉뼱??");
            } else if (metrics.facePresenceRatio < 0.35) {
                notes.push("?쇨뎬???붾㈃???≫엺 ?쒓컙??吏㏃븘???쒖꽑 愿??寃곌낵??李멸퀬?⑹쑝濡쒕쭔 蹂대뒗 ?몄씠 醫뗭뒿?덈떎.");
            } else {
                notes.push("移대찓?쇰? ?듯빐 ?쎈뒗 ?먮쫫???④퍡 遊ㅺ린 ?뚮Ц??臾명빆 ?묐떟 留λ씫??議곌툑 ???낆껜?곸쑝濡??뺤씤?????덉뿀?댁슂.");
            }

            if (hardestQuestion) {
                notes.push(`媛???ㅻ옒 癒몃Ц 臾명빆? Q${hardestQuestion.id}?怨? 珥?${formatMs(hardestQuestion.visibleMs)} ?뺣룄 ?뺤씤?덉뼱??`);
            }

            if (fastestQuestion && fastestQuestion.responseMs !== null) {
                notes.push(`媛??鍮좊Ⅴ寃??듯븳 臾명빆? Q${fastestQuestion.id}?怨? ?묐떟源뚯? ${formatMs(fastestQuestion.responseMs)}媛 嫄몃졇?댁슂.`);
            }

            if (metrics.rapidCount > 0) {
                notes.push(`吏㏃? ?뺤씤 ??諛붾줈 ?묐떟??臾명빆??${metrics.rapidCount}媛??덉뼱, ?쇰? 臾명빆? 鍮좊Ⅴ寃??먮떒?덉쓣 媛?μ꽦???덉뒿?덈떎.`);
            } else {
                notes.push("?遺遺꾩쓽 臾명빆?먯꽌 理쒖냼?쒖쓽 ?쎈뒗 ?쒓컙???뺣낫?섏뼱 湲됲븯寃??섍린???⑦꽩? ?ъ? ?딆븯?댁슂.");
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
            syncAnswersFromDom();
            const summary = buildFriendlySummary();

            dom.summaryIntro.textContent = "?묐떟 ?⑦꽩怨??ㅻЦ 以?痢≪젙??吏묒쨷 ?먮쫫???④퍡 ?뺣━?덉뒿?덈떎. ??寃곌낵??李멸퀬???됰룞 吏?쒖씠硫?吏꾨떒 ?먯껜瑜???좏븯吏 ?딆뒿?덈떎.";

            dom.summaryCards.innerHTML = summary.cards.map((card) => {
                const bucket = metricBucket(card.score);
                return `
                    <div class="summary-card rounded-[2rem] p-7">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <p class="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">${card.title}</p>
                                <p class="mt-3 text-4xl font-black text-slate-900">${card.score}<span class="text-2xl">??/span></p>
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
                webgazer: exportWebGazerData(),
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
            showCptExperience();
        }

        function registerSurveyControls() {
            window.__surveyControls = {
                setStep,
                getAnsweredCount,
                getDomAnsweredCount,
                scrollToFirstUnanswered,
                syncAnswersFromDom,
                ensureCameraStarted,
                openEnvironmentCheck,
                goToStep3,
                showCptExperience,
                questionsPart1Length: questionsPart1.length,
                questionsPart2Length: questionsPart2.length
            };
        }

        function showCptExperience() {
            resetCptState();
            setExperienceView("cpt");
            dom.cptOverlay.style.display = "flex";
            dom.cptInstruction.textContent = "Press start when ready";
            updateCptLoadingStatus(faceLandmarker ? "Ready to start" : "Model loading...", !!faceLandmarker);
        }

        function playCptBeep() {
            if (!cptAudioCtx) cptAudioCtx = new AudioContext();
            const osc = cptAudioCtx.createOscillator();
            const gain = cptAudioCtx.createGain();
            osc.connect(gain);
            gain.connect(cptAudioCtx.destination);
            osc.frequency.value = 400;
            gain.gain.value = 0.05;
            osc.start();
            setTimeout(() => osc.stop(), 150);
        }

        function updateCptProgress() {
            dom.cptCurrentTrial.textContent = String(cptOverallTrialCount);
            dom.cptTotalProgress.style.width = `${(cptOverallTrialCount / CPT_TOTAL_TRIALS) * 100}%`;
        }

        function logCptEvent(message) {
            const time = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            cptEventHistory.unshift({ time, message });
            dom.cptEventLog.innerHTML = `<div>[${time}] ${message}</div>${dom.cptEventLog.innerHTML}`;
        }

        function getCptDistractorPosition(size = 64) {
            const containerRect = dom.cptVisualDistractors?.getBoundingClientRect();
            const taskRect = getCptTaskAoiRect();
            const padding = 20;
            const clearance = 24;

            if (!containerRect || containerRect.width <= size || containerRect.height <= size) {
                return null;
            }

            const minX = padding;
            const minY = padding;
            const maxX = Math.max(minX, containerRect.width - size - padding);
            const maxY = Math.max(minY, containerRect.height - size - padding);

            if (!taskRect) {
                return {
                    left: Math.random() * Math.max(1, maxX - minX) + minX,
                    top: Math.random() * Math.max(1, maxY - minY) + minY
                };
            }

            const localTaskRect = {
                left: taskRect.left - containerRect.left - clearance,
                top: taskRect.top - containerRect.top - clearance,
                right: taskRect.right - containerRect.left + clearance,
                bottom: taskRect.bottom - containerRect.top + clearance
            };

            const zones = [
                {
                    minX,
                    maxX,
                    minY,
                    maxY: Math.min(maxY, localTaskRect.top - size)
                },
                {
                    minX,
                    maxX,
                    minY: Math.max(minY, localTaskRect.bottom),
                    maxY
                },
                {
                    minX,
                    maxX: Math.min(maxX, localTaskRect.left - size),
                    minY: Math.max(minY, localTaskRect.top),
                    maxY: Math.min(maxY, localTaskRect.bottom - size)
                },
                {
                    minX: Math.max(minX, localTaskRect.right),
                    maxX,
                    minY: Math.max(minY, localTaskRect.top),
                    maxY: Math.min(maxY, localTaskRect.bottom - size)
                }
            ].filter((zone) => zone.maxX >= zone.minX && zone.maxY >= zone.minY);

            if (!zones.length) {
                return { left: minX, top: minY };
            }

            const zone = zones[Math.floor(Math.random() * zones.length)];
            return {
                left: Math.random() * Math.max(1, zone.maxX - zone.minX) + zone.minX,
                top: Math.random() * Math.max(1, zone.maxY - zone.minY) + zone.minY
            };
        }

        function spawnCptVisualDistractor() {
            const distractorCount = 2 + Math.floor(Math.random() * 2);

            Array.from({ length: distractorCount }).forEach((_, index) => {
                const distractorData = CPT_VISUAL_DISTRACTORS[Math.floor(Math.random() * CPT_VISUAL_DISTRACTORS.length)];
                const distractor = document.createElement("div");
                distractor.className = "cpt-distractor-item";
                distractor.style.setProperty("--cpt-distractor-hue", distractorData.hue);
                distractor.style.setProperty("--cpt-distractor-rotate", `${Math.round((Math.random() - 0.5) * 18)}deg`);
                distractor.innerHTML = `<span class="cpt-distractor-item__icon" aria-hidden="true">${distractorData.icon}</span>`;

                const position = getCptDistractorPosition(88);
                distractor.style.left = `${(position?.left ?? 24)}px`;
                distractor.style.top = `${(position?.top ?? 24)}px`;
                dom.cptVisualDistractors.appendChild(distractor);
                setTimeout(() => distractor.remove(), 1300 + (index * 120));
            });
        }

        function advanceCptTrial() {
            if (cptOverallTrialCount >= CPT_TOTAL_TRIALS) {
                finishCpt();
                return;
            }

            if (cptTrialInBlock >= CPT_BLOCK_TRIALS) {
                cptCurrentBlock += 1;
                cptTrialInBlock = 0;
                logCptEvent(`Block ${cptCurrentBlock} Started: ${getCptBlockType(cptCurrentBlock)}`);
            }

            cptGameState = "ISI";
            cptResponded = false;
            renderCptStimulusCard(null);
            dom.cptFixationCross.classList.remove("hidden");
            dom.cptInstruction.textContent = "중앙 카드를 응시하세요";

            const delay = Math.random() * (CPT_ISI_RANGE[1] - CPT_ISI_RANGE[0]) + CPT_ISI_RANGE[0];

            setTimeout(() => {
                cptGameState = "STIMULUS";
                cptCurrentStimulus = Math.random() > 0.3
                    ? CPT_TARGET
                    : CPT_DISTRACTORS[Math.floor(Math.random() * CPT_DISTRACTORS.length)];
                cptStimulusStartTime = performance.now();

                renderCptStimulusCard(cptCurrentStimulus);
                dom.cptStimulusContent.classList.add("cpt-animate-target");
                dom.cptFixationCross.classList.add("hidden");
                dom.cptInstruction.textContent = cptCurrentStimulus === CPT_TARGET ? "빨간 하트 3개 카드만 Space" : "다른 카드는 누르지 마세요";

                if (cptCurrentBlock === 2 || cptCurrentBlock === 4) spawnCptVisualDistractor();
                if (cptCurrentBlock === 3 || cptCurrentBlock === 4) playCptBeep();

                setTimeout(() => {
                    renderCptStimulusCard(null);
                    dom.cptStimulusContent.classList.remove("cpt-animate-target");
                    cptGameState = "WAITING";

                    setTimeout(() => {
                        if (cptCurrentStimulus === CPT_TARGET && !cptResponded) {
                            cptMetrics.omits += 1;
                            logCptEvent("Omission Error (Miss)");
                        }

                        cptTrialInBlock += 1;
                        cptOverallTrialCount += 1;
                        updateCptProgress();
                        advanceCptTrial();
                    }, CPT_RESPONSE_WINDOW_MS - CPT_STIMULUS_MS);
                }, CPT_STIMULUS_MS);
            }, delay);
        }

        function drawCptOverlay(landmarks) {
            const ctx = getCptCanvasContext();
            if (!ctx) return;

            ctx.clearRect(0, 0, dom.cptOutputCanvas.width, dom.cptOutputCanvas.height);
            ctx.fillStyle = "#06b6d4";

            [1, 33, 263, 468, 473].forEach((index) => {
                if (!landmarks[index]) return;
                ctx.beginPath();
                ctx.arc(
                    landmarks[index].x * dom.cptOutputCanvas.width,
                    landmarks[index].y * dom.cptOutputCanvas.height,
                    3,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            });
        }

        async function predictCptWebcam() {
            if (!cptWebcamRunning || !faceLandmarker) return;

            if (cptLastVideoTime !== dom.cptWebcam.currentTime) {
                cptLastVideoTime = dom.cptWebcam.currentTime;
                const now = performance.now();
                const result = faceLandmarker.detectForVideo(dom.cptWebcam, now);
                const landmarks = result?.faceLandmarks?.[0];
                const blendshapes = result?.faceBlendshapes?.[0]?.categories ?? [];

                if (landmarks) {
                    const yaw = (landmarks[1].x - (landmarks[33].x + landmarks[263].x) / 2) * 100;
                    const isFrontal = Math.abs(yaw) < 15;
                    const irisX = (landmarks[468].x + landmarks[473].x) / 2;
                    const irisY = (landmarks[468].y + landmarks[473].y) / 2;
                    const inAOI = irisX > 0.4 && irisX < 0.6 && irisY > 0.4 && irisY < 0.6;
                    const blink = (safeBlendshapeScore(blendshapes, "eyeBlinkLeft") + safeBlendshapeScore(blendshapes, "eyeBlinkRight")) / 2;

                    if (cptGameState === "STIMULUS" && blink > 0.5) {
                        cptMetrics.blinksInStimulus += 1;
                    }

                    cptMetrics.frames += 1;
                    if (isFrontal) cptMetrics.frontal += 1;
                    if (isFrontal && inAOI) cptMetrics.attentive += 1;
                    if (!inAOI) cptMetrics.distracted += 1;

                    const blockMetric = cptMetrics.blockStats[cptCurrentBlock - 1];
                    if (blockMetric) {
                        blockMetric.frames += 1;
                        if (!inAOI) blockMetric.distracted += 1;
                    }

                    const attentiveRatio = Math.round((cptMetrics.attentive / cptMetrics.frames) * 100) || 0;
                    dom.cptLiveAttentive.textContent = `${attentiveRatio}%`;
                    dom.cptBarAttentive.style.width = `${attentiveRatio}%`;
                    dom.cptLiveYaw.textContent = `${yaw.toFixed(1)}째`;
                    dom.cptYawCursor.style.left = `${clamp(50 + yaw, 0, 100)}%`;
                    dom.cptIndicatorGaze.style.backgroundColor = inAOI ? "#22c55e" : "#ef4444";
                    dom.cptIndicatorHead.style.backgroundColor = isFrontal ? "#22c55e" : "#ef4444";

                    cptDataLog.push({
                        t: now,
                        block: cptCurrentBlock,
                        trial: cptOverallTrialCount,
                        gaze: { x: Number(irisX.toFixed(4)), y: Number(irisY.toFixed(4)) },
                        yaw: Number(yaw.toFixed(3)),
                        blink: Number(blink.toFixed(4))
                    });

                    drawCptOverlay(landmarks);
                }
            }

            requestAnimationFrame(predictCptWebcam);
        }

        async function startCptSession() {
            if (!faceLandmarker) {
                updateCptLoadingStatus("Model loading...", false);
                return;
            }

            resetCptState();
            setWebGazerPhase("cpt");
            dom.cptOverlay.style.display = "none";

            try {
                cptWebcamStream = getReusableSurveyStream();
                cptUsesSharedSurveyStream = !!cptWebcamStream;

                if (!cptWebcamStream) {
                    cptWebcamStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: "user",
                            width: { ideal: 640 },
                            height: { ideal: 480 }
                        },
                        audio: false
                    });
                } else {
                    webcamRunning = false;
                    surveyPredictionLoopRunning = false;
                }

                dom.cptWebcam.srcObject = cptWebcamStream;
                await dom.cptWebcam.play();
                dom.cptOutputCanvas.width = dom.cptWebcam.videoWidth;
                dom.cptOutputCanvas.height = dom.cptWebcam.videoHeight;
                if (webgazerRunning) {
                    renderCptWebGazerLive();
                } else {
                    startWebGazer(cptWebcamStream);
                }
                cptWebcamRunning = true;
                cptGameState = "READY";
            dom.cptInstruction.textContent = "중앙 카드를 응시하세요";
                logCptEvent("Block 1 Started: Baseline");
                requestAnimationFrame(predictCptWebcam);
                advanceCptTrial();
            } catch (error) {
                console.error(error);
                dom.cptOverlay.style.display = "flex";
                updateCptLoadingStatus("Camera permission is required", false);
            }
        }

        function stopCptCamera() {
            cptWebcamRunning = false;
            if (cptWebcamStream) {
                cptWebcamStream.getTracks().forEach((track) => track.stop());
                cptWebcamStream = null;
            }
            dom.cptWebcam.srcObject = null;
            if (cptUsesSharedSurveyStream) {
                webcamStream = null;
                webcamRunning = false;
                surveyPredictionLoopRunning = false;
                cameraRequestStarted = false;
                dom.webcam.srcObject = null;
                if (dom.adminWebcam) {
                    dom.adminWebcam.srcObject = null;
                }
            }
            const ctx = getCptCanvasContext();
            ctx?.clearRect(0, 0, dom.cptOutputCanvas.width, dom.cptOutputCanvas.height);
        }

        function finishCpt() {
            stopCptCamera();
            stopWebGazer();
            cptGameState = "FINISHED";
            showResultsExperience();
            dom.cptResTimestamp.textContent = new Date().toLocaleString("ko-KR");

            const totalTargets = cptMetrics.hits + cptMetrics.omits;
            const totalNonTargets = CPT_TOTAL_TRIALS - totalTargets;
            const omissionRate = Math.round((cptMetrics.omits / Math.max(1, totalTargets)) * 100) || 0;
            const commissionRate = Math.round((cptMetrics.commission / Math.max(1, totalNonTargets)) * 100) || 0;
            const rtMean = cptMetrics.rts.reduce((sum, value) => sum + value, 0) / Math.max(1, cptMetrics.rts.length);
            const rtVariance = cptMetrics.rts.reduce((sum, value) => sum + Math.pow(value - rtMean, 2), 0) / Math.max(1, cptMetrics.rts.length);
            const rtSD = Math.round(Math.sqrt(rtVariance)) || 0;
            const distractScale = Math.round((cptMetrics.distracted / Math.max(1, cptMetrics.frames)) * 100) || 0;

            dom.cptResOmissionRate.textContent = String(omissionRate);
            dom.cptResCommissionRate.textContent = String(commissionRate);
            dom.cptResRtSd.textContent = String(rtSD);
            dom.cptResDistraction.textContent = String(distractScale);

            dom.cptBlockAnalysis?.replaceChildren();
            if (dom.cptBlockAnalysis) {
                dom.cptBlockAnalysis.innerHTML = cptMetrics.blockStats.map((block, index) => {
                    const ratioValue = Math.round((block.distracted / Math.max(1, block.frames)) * 100) || 0;
                    return `
                        <div class="flex items-center justify-between bg-slate-900 p-3 rounded-2xl border border-slate-800">
                            <span class="text-xs text-slate-400">Block ${index + 1} (${getCptBlockType(index + 1).split(" ")[0]})</span>
                            <div class="flex items-center gap-4">
                                <span class="text-[10px] text-slate-500">Distraction: ${ratioValue}%</span>
                                <div class="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden"><div class="h-full bg-blue-500" style="width:${ratioValue}%"></div></div>
                            </div>
                        </div>
                    `;
                }).join("");
            }

            let interpretation = "";
            if (omissionRate > 15) interpretation += "<p>주의 유지 어려움: 목표 자극에 대한 반응 누락이 높게 나타났습니다. 지속적인 주의 유지가 어려웠을 가능성을 참고할 수 있습니다.</p>";
            if (commissionRate > 15) interpretation += "<p>충동 반응 경향: 목표가 아닌 자극에 반응한 비율이 높게 나타났습니다. 반응 억제의 어려움을 참고할 수 있습니다.</p>";
            if (rtSD > 150) interpretation += "<p>반응 시간 변동성 증가: 반응 시간이 일정하지 않아 주의 안정성이 흔들렸을 가능성이 있습니다.</p>";

            const baselineDist = Math.round((cptMetrics.blockStats[0].distracted / Math.max(1, cptMetrics.blockStats[0].frames)) * 100) || 0;
            const visualDist = Math.round((cptMetrics.blockStats[1].distracted / Math.max(1, cptMetrics.blockStats[1].frames)) * 100) || 0;
            if (visualDist > baselineDist + 10) {
                interpretation += `<p>시각 방해 구간에서 Task AOI 밖으로 시선이 벗어난 비율이 기준 구간보다 ${visualDist - baselineDist}%p 증가했습니다.</p>`;
            }

            if (!interpretation) {
                interpretation = "<p>과제 수행 동안 반응 통제와 AOI 기반 주의 배분 지표가 비교적 안정적으로 유지되었습니다.</p>";
            }

            dom.cptInterpretationText.innerHTML = interpretation;
            renderCptWebGazerResults();

            window.cptAnalytics = {
                exportedAt: new Date().toISOString(),
                surveyAnalytics: window.surveyAnalytics ?? null,
                webgazer: exportWebGazerData(),
                metrics: cptMetrics,
                logs: cptDataLog,
                events: cptEventHistory,
                report: interpretation
            };
            window.cptMetricsData = buildCptReportPayload();
            console.log('CPT FINISHED');
            
            // 踰꾪듉 異붽? (?ㅼ쓬 ?깆뿉???ㅽ뻾?섏뿬 DOM???낅뜲?댄듃???뚭퉴吏 ?湲?
            setTimeout(() => {
                addReportGenerationButton();
            }, 100);
            
            // ?먮룞 ??? DB 而щ읆??留욊쾶 ?섏씠濡쒕뱶瑜?留ㅽ븨???쒕쾭??/api/analyze濡??꾩넚
            (async function sendCptAnalytics() {
                try {
                    const metrics = window.cptAnalytics?.metrics || {};
                    const avgRt = metrics.rts?.length
                        ? Math.round(metrics.rts.reduce((a, b) => a + b, 0) / metrics.rts.length)
                        : 0;
                    const dbPayload = {
                        inattention_count: metrics.omits ?? 0,
                        hyperactivity_count: metrics.hyperactivity ?? 0,
                        cpt_attention: metrics.hits ?? 0,
                        cpt_timeliness: avgRt,
                        cpt_impulsivity: metrics.commission ?? 0,
                        cpt_hyperactivity: metrics.hyperactivity ?? 0,
                        gaze_off_task_ratio: metrics.gazeTotalMs > 0
                            ? Number(((metrics.distractMs / metrics.gazeTotalMs) * 100).toFixed(2))
                            : null,
                        ...buildHeadPosePayload(metrics),
                        final_risk_level: window.cptAnalytics?.finalRiskLevel ?? null,
                        report: window.cptAnalytics?.report ?? interpretation ?? null,
                        raw: window.cptAnalytics
                    };
                    console.log('metrics:', metrics);
                    console.log('DB PAYLOAD:', dbPayload);
                    console.log('SENDING ANALYTICS');

                    const res = await fetch('/api/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(dbPayload)
                    });

                    if (!res.ok) {
                        console.error('Failed to save CPT analytics', await res.text());
                        alert("검사 데이터 저장에 실패했습니다.");
                    } else {
                        const responseData = await res.json();
                        console.log('CPT analytics saved to /api/analyze', responseData);
                        const resultId = responseData.data?.id || responseData.id;
                        if (resultId) {
                            window.cptResultId = resultId;
                            window.cptMetricsData = dbPayload;
                            console.log('CPT result ID saved:', resultId);
                        }
                    }
                } catch (err) {
                    console.error('Error sending CPT analytics', err);
                alert("리포트 저장 중 오류가 발생했습니다: " + String(err));
                }
            })();
        }

        function downloadCptRawData() {
            const payload = {
                exportedAt: new Date().toISOString(),
                surveyAnalytics: window.surveyAnalytics ?? null,
                environment: getAoiEnvironmentSnapshot(),
                webgazer: exportWebGazerData(),
                metrics: cptMetrics,
                logs: cptDataLog,
                events: cptEventHistory
            };

            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "screening_data.json";
            link.click();
            URL.revokeObjectURL(url);
        }

        function handleCptKeydown(event) {
            if (event.code !== "Space" || dom.cptExperience.classList.contains("hidden")) return;
            if (event.repeat) return;
            event.preventDefault();

            if (cptGameState === "STIMULUS" || cptGameState === "WAITING") {
                if (cptResponded) {
                    cptMetrics.hyperactivity += 1;
                    logCptEvent("Hyperactivity detected");
                    return;
                }

                cptResponded = true;
                const rt = performance.now() - cptStimulusStartTime;
                cptMetrics.rts.push(rt);

                if (cptCurrentStimulus === CPT_TARGET) {
                    cptMetrics.hits += 1;
                    cptMetrics.blockStats[cptCurrentBlock - 1].hits += 1;
                    logCptEvent(`Correct! (${Math.round(rt)}ms)`);
                } else {
                    cptMetrics.commission += 1;
                    logCptEvent("Commission Error (Impulsive)");
                }
                return;
            }

            if (cptGameState === "ISI") {
                cptMetrics.hyperactivity += 1;
                logCptEvent("Anticipation Error");
            }
        }

        // AOI-based gaze analysis overrides
        questionMetricTemplate = function questionMetricTemplate(question, part, index) {
            return {
                id: index + 1,
                part,
                question,
                activationCount: 0,
                visibleMs: 0,
                gazeTotalMs: 0,
                taskMs: 0,
                distractMs: 0,
                taskVisitCount: 0,
                lastAoiZone: null,
                firstVisibleAt: null,
                answerValue: null,
                responseMs: null,
                rapidResponse: false,
                yaw: createRunningStat(),
                pitch: createRunningStat(),
                roll: createRunningStat()
            };
        };

        const HEAD_POSE_THRESHOLDS = Object.freeze({ yaw: 18, pitch: 16 });
        const HEAD_POSE_ROLL_WEIGHT = 0.3;
        const HEAD_POSE_VARIABILITY_PENALTY = 0.55;
        const HEAD_POSE_VARIABILITY_REFERENCE = 14;
        const HEAD_POSE_WINDOW_SIZE_FRAMES = 30;

        function roundMetric(value, digits = 2) {
            return Number(value.toFixed(digits));
        }

        function computeArrayStd(values) {
            if (!Array.isArray(values) || values.length < 2) return 0;

            const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
            const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (values.length - 1);
            return Math.sqrt(Math.max(variance, 0));
        }

        function computeHeadRotationVariability(yawStd, pitchStd, rollStd, rollWeight = HEAD_POSE_ROLL_WEIGHT) {
            return Math.sqrt(
                (yawStd * yawStd)
                + (pitchStd * pitchStd)
                + (rollWeight * rollStd * rollStd)
            );
        }

        function classifyHeadPoseState(euler, thresholds = HEAD_POSE_THRESHOLDS) {
            if (!euler) return "unclassified";

            if (Math.abs(euler.yaw) < thresholds.yaw && Math.abs(euler.pitch) < thresholds.pitch) {
                return "forward";
            }
            if (euler.yaw < -thresholds.yaw) {
                return "left";
            }
            if (euler.yaw > thresholds.yaw) {
                return "right";
            }
            if (euler.pitch > thresholds.pitch) {
                return "down";
            }

            return "unclassified";
        }

        function createHeadPoseMetrics() {
            return {
                totalFrames: 0,
                forwardFrames: 0,
                leftFrames: 0,
                rightFrames: 0,
                downFrames: 0,
                unclassifiedFrames: 0,
                latestState: "unclassified",
                yaw: createRunningStat(),
                pitch: createRunningStat(),
                roll: createRunningStat(),
                angularVelocity: {
                    yaw: createRunningStat(),
                    pitch: createRunningStat(),
                    roll: createRunningStat(),
                    magnitude: createRunningStat()
                },
                thresholds: { ...HEAD_POSE_THRESHOLDS },
                rollWeight: HEAD_POSE_ROLL_WEIGHT,
                variabilityPenalty: HEAD_POSE_VARIABILITY_PENALTY,
                windowSizeFrames: HEAD_POSE_WINDOW_SIZE_FRAMES,
                windowSamples: [],
                windowVariabilityMax: 0,
                lastEuler: null,
                lastTs: null
            };
        }

        function recordHeadPoseSample(metric, euler, now) {
            const headPose = metric?.headPose;
            if (!headPose || !euler) return "unclassified";

            headPose.totalFrames += 1;
            pushStat(headPose.yaw, euler.yaw);
            pushStat(headPose.pitch, euler.pitch);
            pushStat(headPose.roll, euler.roll);

            const state = classifyHeadPoseState(euler, headPose.thresholds);
            const stateKey = `${state}Frames`;
            if (typeof headPose[stateKey] === "number") {
                headPose[stateKey] += 1;
            } else {
                headPose.unclassifiedFrames += 1;
            }

            const sample = {
                yaw: euler.yaw,
                pitch: euler.pitch,
                roll: euler.roll
            };
            headPose.windowSamples.push(sample);
            if (headPose.windowSamples.length > headPose.windowSizeFrames) {
                headPose.windowSamples.shift();
            }

            if (headPose.windowSamples.length >= 5) {
                const yawStd = computeArrayStd(headPose.windowSamples.map((entry) => entry.yaw));
                const pitchStd = computeArrayStd(headPose.windowSamples.map((entry) => entry.pitch));
                const rollStd = computeArrayStd(headPose.windowSamples.map((entry) => entry.roll));
                const windowVariability = computeHeadRotationVariability(
                    yawStd,
                    pitchStd,
                    rollStd,
                    headPose.rollWeight
                );
                headPose.windowVariabilityMax = Math.max(headPose.windowVariabilityMax, windowVariability);
            }

            if (headPose.lastEuler && headPose.lastTs !== null) {
                const deltaSeconds = Math.max((now - headPose.lastTs) / 1000, 1 / 60);
                const yawVelocity = Math.abs((euler.yaw - headPose.lastEuler.yaw) / deltaSeconds);
                const pitchVelocity = Math.abs((euler.pitch - headPose.lastEuler.pitch) / deltaSeconds);
                const rollVelocity = Math.abs((euler.roll - headPose.lastEuler.roll) / deltaSeconds);
                const velocityMagnitude = Math.sqrt(
                    (yawVelocity * yawVelocity)
                    + (pitchVelocity * pitchVelocity)
                    + (headPose.rollWeight * rollVelocity * rollVelocity)
                );

                pushStat(headPose.angularVelocity.yaw, yawVelocity);
                pushStat(headPose.angularVelocity.pitch, pitchVelocity);
                pushStat(headPose.angularVelocity.roll, rollVelocity);
                pushStat(headPose.angularVelocity.magnitude, velocityMagnitude);
            }

            headPose.lastEuler = { ...euler };
            headPose.lastTs = now;
            headPose.latestState = state;

            return state;
        }

        function summarizeHeadPoseMetrics(metric) {
            const headPose = metric?.headPose;
            if (!headPose) {
                return {
                    totalFrames: 0,
                    forwardRatio: 0,
                    leftRatio: 0,
                    rightRatio: 0,
                    downRatio: 0,
                    unclassifiedRatio: 0,
                    yawStd: 0,
                    pitchStd: 0,
                    rollStd: 0,
                    rotationVariability: 0,
                    attentionScore: 0,
                    attentionScoreAdjusted: 0,
                    sessionMaxVariability: 0,
                    angularVelocityMean: 0,
                    angularVelocityStd: 0,
                    latestState: "unclassified"
                };
            }

            const yawStd = statStd(headPose.yaw);
            const pitchStd = statStd(headPose.pitch);
            const rollStd = statStd(headPose.roll);
            const rotationVariability = computeHeadRotationVariability(
                yawStd,
                pitchStd,
                rollStd,
                headPose.rollWeight
            );
            const totalFrames = Math.max(headPose.totalFrames, 1);
            const forwardRatio = (headPose.forwardFrames / totalFrames) * 100;
            const leftRatio = (headPose.leftFrames / totalFrames) * 100;
            const rightRatio = (headPose.rightFrames / totalFrames) * 100;
            const downRatio = (headPose.downFrames / totalFrames) * 100;
            const unclassifiedRatio = (headPose.unclassifiedFrames / totalFrames) * 100;
            const sessionMaxVariability = Math.max(headPose.windowVariabilityMax, rotationVariability, 1);
            const attentionScore = forwardRatio;
            const normalizedPenalty = clamp(rotationVariability / HEAD_POSE_VARIABILITY_REFERENCE, 0, 1);
            const attentionScoreAdjusted = attentionScore * (1 - (headPose.variabilityPenalty * normalizedPenalty));

            return {
                totalFrames: headPose.totalFrames,
                forwardRatio: roundMetric(forwardRatio),
                leftRatio: roundMetric(leftRatio),
                rightRatio: roundMetric(rightRatio),
                downRatio: roundMetric(downRatio),
                unclassifiedRatio: roundMetric(unclassifiedRatio),
                yawStd: roundMetric(yawStd),
                pitchStd: roundMetric(pitchStd),
                rollStd: roundMetric(rollStd),
                rotationVariability: roundMetric(rotationVariability),
                attentionScore: roundMetric(attentionScore),
                attentionScoreAdjusted: roundMetric(Math.max(0, attentionScoreAdjusted)),
                sessionMaxVariability: roundMetric(sessionMaxVariability),
                angularVelocityMean: roundMetric(headPose.angularVelocity.magnitude.mean || 0),
                angularVelocityStd: roundMetric(statStd(headPose.angularVelocity.magnitude)),
                latestState: headPose.latestState
            };
        }

        createCptMetrics = function createCptMetrics() {
            return {
                hits: 0,
                omits: 0,
                commission: 0,
                hyperactivity: 0,
                rts: [],
                faceSamples: 0,
                gazeTotalMs: 0,
                taskMs: 0,
                distractMs: 0,
                taskVisitCount: 0,
                lastAoiZone: null,
                lastAoiTick: null,
                blinksInStimulus: 0,
                headPose: createHeadPoseMetrics(),
                headPoseSummary: null,
                headMovementVariance: 0,
                blockStats: Array.from({ length: 4 }, () => ({
                    hits: 0,
                    gazeTotalMs: 0,
                    taskMs: 0,
                    distractMs: 0,
                    taskVisitCount: 0,
                    lastAoiZone: null
                }))
            };
        };

        analytics = createAnalytics();

        function getNormalizedRect(rect) {
            if (!rect || rect.width <= 0 || rect.height <= 0) return null;

            return {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height
            };
        }

        function getElementRect(element) {
            return element ? getNormalizedRect(element.getBoundingClientRect()) : null;
        }

        function isPointInsideRect(x, y, rect) {
            if (!rect) return false;
            return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        }

        function getCurrentQuestionRow() {
            if (analytics.activeQuestionIndex === null) return null;
            return questionRows[analytics.activeQuestionIndex] ?? null;
        }

        function getSurveyTaskAoiRect() {
            const row = getCurrentQuestionRow();
            const taskAoi = row?.querySelector('[data-survey-task-aoi="true"]');
            return getElementRect(taskAoi);
        }

        function getCptTaskAoiRect() {
            return getElementRect(dom.cptTaskAoi);
        }

        function getFreshWebGazerSample(phase = webgazerState.phase, now = performance.now(), maxAge = 650) {
            const sample = getWebGazerPhaseStore(phase).lastSample;
            if (!sample) return null;
            return now - sample.t <= maxAge ? sample : null;
        }

        function classifyAoiSample(sample, rect) {
            if (!sample || !rect) return null;

            const insideViewport = sample.x >= 0
                && sample.x <= sample.width
                && sample.y >= 0
                && sample.y <= sample.height;
            const insideTask = insideViewport && isPointInsideRect(sample.x, sample.y, rect);

            return {
                zone: insideTask ? "task" : "distract",
                insideTask,
                insideViewport,
                rect
            };
        }

        function getAoiClassification(phase, sample) {
            const rect = phase === "cpt" ? getCptTaskAoiRect() : getSurveyTaskAoiRect();
            return classifyAoiSample(sample, rect);
        }

        function applyAoiDelta(metric, classification, delta) {
            if (!metric || !classification || delta <= 0) return;

            metric.gazeTotalMs += delta;

            if (classification.zone === "task") {
                if (metric.lastAoiZone !== "task") {
                    metric.taskVisitCount += 1;
                }
                metric.taskMs += delta;
            } else {
                metric.distractMs += delta;
            }

            metric.lastAoiZone = classification.zone;
        }

        function resetAoiZone(metric) {
            if (metric) {
                metric.lastAoiZone = null;
            }
        }

        metricBucket = function metricBucket(score, { reverse = false } = {}) {
            if (reverse) {
                if (score >= 55) return { tone: "\uB192\uC74C", color: "text-rose-600" };
                if (score >= 25) return { tone: "\uC911\uAC04", color: "text-amber-500" };
                return { tone: "\uB0AE\uC74C", color: "text-emerald-600" };
            }

            if (score >= 75) return { tone: "\uC548\uC815", color: "text-emerald-600" };
            if (score >= 45) return { tone: "\uBCF4\uD1B5", color: "text-amber-500" };
            return { tone: "\uC8FC\uC758 \uD544\uC694", color: "text-rose-600" };
        };

        handleWebGazerPrediction = function handleWebGazerPrediction(data, elapsedTime) {
            const store = getWebGazerPhaseStore();
            store.rawCount += 1;

            if (!data || !Number.isFinite(data.x) || !Number.isFinite(data.y)) {
                return;
            }

            const now = performance.now();
            if (now - webgazerState.lastAcceptedAt < WEBGAZER_SAMPLE_INTERVAL_MS) {
                return;
            }

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const sample = {
                x: Number(data.x.toFixed(2)),
                y: Number(data.y.toFixed(2)),
                t: now,
                elapsed: elapsedTime ?? now,
                width: viewportWidth,
                height: viewportHeight,
                insideViewport: data.x >= 0
                    && data.x <= viewportWidth
                    && data.y >= 0
                    && data.y <= viewportHeight,
                phase: webgazerState.phase
            };

            store.validCount += 1;
            webgazerState.lastAcceptedAt = now;
            pushWebGazerSample(store, sample);
            if (calibrationState.open && calibrationState.phase === "review") {
                pushCalibrationReviewSample(sample);
                renderCalibrationReviewLayer();
            }
            updateLiveGazeDot(sample);
            renderWebGazerAdmin();
            renderCptWebGazerLive();
            renderAdminLiveDebug();
        };

        drawWebGazerWireframe = function drawWebGazerWireframe(canvas, phase) {
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const width = Math.max(320, Math.round(canvas.clientWidth || 320));
            const height = 260;
            canvas.width = width;
            canvas.height = height;

            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.strokeStyle = "#bfdbfe";
            ctx.lineWidth = 1;
            ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

            ctx.fillStyle = "#eff6ff";
            ctx.fillRect(12, 12, width - 24, 34);

            const frameLeft = 18;
            const frameTop = 60;
            const frameWidth = width - 36;
            const frameHeight = height - 78;
            const taskWidth = Math.round(frameWidth * 0.6);
            const taskHeight = Math.round(frameHeight * 0.6);
            const taskLeft = Math.round((width - taskWidth) / 2);
            const taskTop = Math.round((height - taskHeight) / 2) + 8;

            const drawAoiGuide = () => {
                ctx.save();
                ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
                ctx.fillRect(frameLeft, frameTop, frameWidth, frameHeight);
                ctx.clearRect(taskLeft, taskTop, taskWidth, taskHeight);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(taskLeft, taskTop, taskWidth, taskHeight);
                ctx.strokeStyle = "#22d3ee";
                ctx.lineWidth = 2;
                ctx.strokeRect(taskLeft + 0.5, taskTop + 0.5, taskWidth - 1, taskHeight - 1);

                ctx.font = "700 11px sans-serif";
                ctx.textTransform = "uppercase";
                ctx.fillStyle = "#64748b";
                ctx.fillText("DISTRACT AOI", frameLeft + 14, frameTop + 20);

                ctx.fillStyle = "#0891b2";
                ctx.fillText("TASK AOI", taskLeft + 14, taskTop + 20);
                ctx.restore();
            };

            if (phase === "survey") {
                drawAoiGuide();

                ctx.fillStyle = "#e2e8f0";
                ctx.fillRect(taskLeft + 28, taskTop + 28, taskWidth - 56, 18);
                ctx.fillRect(taskLeft + 54, taskTop + 60, taskWidth - 108, 12);

                const dotY = taskTop + taskHeight - 56;
                const dotRadius = 10;
                const dotSpacing = Math.round((taskWidth - 56) / 4);
                ctx.fillStyle = "#dbeafe";
                for (let index = 0; index < 5; index += 1) {
                    const dotX = taskLeft + 28 + (dotSpacing * index);
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
                return;
            }

            drawAoiGuide();
        };

        setActiveQuestion = function setActiveQuestion(now) {
            const visibleRows = getVisibleRows();
            const nextIndex = visibleRows.length ? Number(visibleRows[0].row.dataset.questionIndex) : null;

            if (analytics.activeQuestionIndex === nextIndex) return;

            if (analytics.activeQuestionIndex !== null) {
                resetAoiZone(analytics.questions[analytics.activeQuestionIndex]);
            }

            analytics.activeQuestionIndex = nextIndex;
            questionRows.forEach((row) => {
                row.classList.toggle("is-active-question", Number(row.dataset.questionIndex) === nextIndex);
            });

            if (nextIndex !== null) {
                const metric = analytics.questions[nextIndex];
                metric.activationCount += 1;
                metric.firstVisibleAt ??= now;
                resetAoiZone(metric);
            }
        };

        function getQuestionRowByIndex(questionIndex) {
            return questionRows.find((row) => Number(row.dataset.questionIndex) === questionIndex) ?? null;
        }

        function centerQuestionRow(row) {
            row?.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        function advanceSurveyAfterAnswer(questionIndex) {
            const currentMetric = analytics.questions[questionIndex];
            const nextMetric = analytics.questions[questionIndex + 1] ?? null;

            if (!currentMetric) return;

            if (!nextMetric || nextMetric.part !== currentMetric.part) {
                return;
            }

            requestAnimationFrame(() => {
                centerQuestionRow(getQuestionRowByIndex(questionIndex + 1));
                requestAnimationFrame(() => {
                    setActiveQuestion(performance.now());
                });
            });
        }

        onAnswerChange = function onAnswerChange(event) {
            ensureCameraStarted();

            const input = event.target;
            const questionIndex = Number(input.dataset.questionIndex);
            const metric = analytics.questions[questionIndex];
            const now = performance.now();
            const isFirstAnswer = metric.responseMs === null;

            metric.answerValue = Number(input.value);
            if (isFirstAnswer) {
                const origin = metric.firstVisibleAt ?? now;
                metric.responseMs = Math.max(0, now - origin);
                metric.rapidResponse = metric.responseMs < 2500 || metric.taskMs < 1200;
            }

            refreshChoiceVisuals(input.name);
            updateProgress();

             if (isFirstAnswer) {
                advanceSurveyAfterAnswer(questionIndex);
            }
        };

        renderAdminPanel = function renderAdminPanel() {
            if (!dom.adminCameraState || !dom.adminRawMetrics) return;

            const metrics = aggregateMetrics();
            const currentMetric = getCurrentQuestionMetric();
            const currentEuler = latestFaceSample?.euler ?? { yaw: 0, pitch: 0, roll: 0 };
            const currentSample = getFreshWebGazerSample("survey", performance.now());
            const currentAoi = currentSample ? getAoiClassification("survey", currentSample) : null;
            const cameraLabelMap = {
                idle: "대기",
                active: "?쒖꽦",
                denied: "沅뚰븳 嫄곕?",
                unavailable: "以鍮??ㅽ뙣"
            };

            dom.adminCameraState.textContent = cameraLabelMap[analytics.cameraState] ?? analytics.cameraState;
            dom.adminFacePresence.textContent = `?쇨뎬 寃異쒕쪧 ${Math.round(metrics.facePresenceRatio * 100)}%`;

            if (!currentAoi) {
                dom.adminAttentionState.textContent = "시선 미확인";
            } else if (currentAoi.zone === "task") {
                dom.adminAttentionState.textContent = "Task AOI";
            } else {
                dom.adminAttentionState.textContent = "Distract AOI";
            }

            dom.adminAwayRatio.textContent = `Distract AOI ${Math.round(metrics.awayRatio * 100)}%`;
            dom.adminHeadMotion.textContent = metrics.headMotionStd.toFixed(1) + " deg";
            dom.adminEuler.textContent = `yaw ${currentEuler.yaw.toFixed(1)} / pitch ${currentEuler.pitch.toFixed(1)} / roll ${currentEuler.roll.toFixed(1)}`;

            if (currentMetric) {
                dom.adminQuestionId.textContent = `Q${currentMetric.id}`;
                dom.adminQuestionMeta.textContent = `泥대쪟 ${formatMs(currentMetric.visibleMs)} / Task AOI ${formatMs(currentMetric.taskMs)}`;
            } else {
                dom.adminQuestionId.textContent = "Q-";
                dom.adminQuestionMeta.textContent = "체류 0초 / Task AOI 0초";
            }

            dom.adminStatusText.textContent = currentAoi
                ? `?꾩옱 ?쒖꽑? ${currentAoi.zone === "task" ? "Task" : "Distract"} AOI濡?遺꾨쪟?⑸땲??`
                : "理쒓렐 WebGazer 醫뚰몴媛 ?놁뼱 AOI瑜??먯젙?섏? 紐삵뻽?듬땲??";

            dom.adminRawMetrics.innerHTML = `
                <div class="metric-chip"><span>?듬???/span><strong>${metrics.answeredCount}</strong></div>
                <div class="metric-chip"><span>Task AOI</span><strong>${Math.round(metrics.attentionRatio * 100)}%</strong></div>
                <div class="metric-chip"><span>Distract AOI</span><strong>${Math.round(metrics.awayRatio * 100)}%</strong></div>
                <div class="metric-chip"><span>AOI ?ъ쭊??/span><strong>${metrics.taskVisitTotal}</strong></div>
                <div class="metric-chip"><span>?됯퇏 ?묐떟</span><strong>${(metrics.averageResponseMs / 1000).toFixed(1)}s</strong></div>
            `;
        };

        surveyLoop = function surveyLoop(now) {
            if (analytics.lastSurveyTick === null) analytics.lastSurveyTick = now;
            const delta = now - analytics.lastSurveyTick;
            analytics.lastSurveyTick = now;

            setActiveQuestion(now);

            const metric = getCurrentQuestionMetric();
            if (metric) {
                metric.visibleMs += delta;

                const sample = getFreshWebGazerSample("survey", now);
                const classification = sample ? getAoiClassification("survey", sample) : null;

                if (classification) {
                    applyAoiDelta(metric, classification, delta);
                } else {
                    resetAoiZone(metric);
                }
            }

            requestAnimationFrame(surveyLoop);
        };

        aggregateMetrics = function aggregateMetrics() {
            const answered = analytics.questions.filter((metric) => metric.answerValue !== null);
            const responseTotal = answered.reduce((sum, metric) => sum + (metric.responseMs ?? 0), 0);
            const visibleTotal = analytics.questions.reduce((sum, metric) => sum + metric.visibleMs, 0);
            const gazeTotal = analytics.questions.reduce((sum, metric) => sum + metric.gazeTotalMs, 0);
            const taskTotal = analytics.questions.reduce((sum, metric) => sum + metric.taskMs, 0);
            const distractTotal = analytics.questions.reduce((sum, metric) => sum + metric.distractMs, 0);
            const rapidCount = answered.filter((metric) => metric.rapidResponse).length;
            const revisitTotal = analytics.questions.reduce((sum, metric) => sum + Math.max(0, metric.activationCount - 1), 0);
            const taskVisitTotal = analytics.questions.reduce((sum, metric) => sum + metric.taskVisitCount, 0);

            return {
                answeredCount: answered.length,
                averageResponseMs: ratio(responseTotal, answered.length || 1),
                attentionRatio: ratio(taskTotal, gazeTotal || 1),
                awayRatio: ratio(distractTotal, gazeTotal || 1),
                distractibilityRatio: ratio(distractTotal, gazeTotal || 1),
                gazeCoverageRatio: ratio(gazeTotal, visibleTotal || 1),
                gazeObservedMs: gazeTotal,
                facePresenceRatio: ratio(analytics.face.presentSamples, analytics.face.totalSamples || 1),
                rapidCount,
                revisitTotal,
                taskVisitTotal,
                headMotionStd: statStd(analytics.face.yaw) + statStd(analytics.face.pitch)
            };
        };

        buildFriendlySummary = function buildFriendlySummary() {
            const metrics = aggregateMetrics();

            const focusScore = Math.round(clamp(metrics.attentionRatio * 100, 0, 100));
            const distractibilityScore = Math.round(clamp(metrics.distractibilityRatio * 100, 0, 100));
            const responseBase = 100 - clamp(((metrics.averageResponseMs / 1000) - 2.5) * 18, 0, 100);
            const responsePenalty = metrics.rapidCount * 8;
            const responseScore = Math.round(clamp(responseBase - responsePenalty, 0, 100));
            const stabilityScore = Math.round(clamp(100 - metrics.headMotionStd * 4.5, 0, 100));

            const cards = [
                {
                    title: "Task AOI 吏묒쨷",
                    score: focusScore,
                    hint: `?꾩껜 ?좏슚 ?쒖꽑 ?쒓컙 以?${focusScore}%媛 ?꾩옱 臾명빆 AOI ?덉뿉 癒몃Ъ??댁슂.`,
                    desc: "?꾩옱 ?쒖꽦 臾명빆 移대뱶 ?곸뿭??Task AOI濡?蹂닿퀬, 洹??덉뿉 癒몃Ц ?곷? ?쒖꽑 ?쒓컙 鍮꾩쑉濡?怨꾩궛??attention 媛믪엯?덈떎."
                },
                {
                    title: "Distractibility",
                    score: distractibilityScore,
                    reverseTone: true,
                    hint: `?꾩껜 ?좏슚 ?쒖꽑 ?쒓컙 以?${distractibilityScore}%媛 Task AOI 諛뽰뿉 癒몃Ъ??댁슂.`,
                    desc: "Task AOI瑜??쒖쇅???붾㈃??紐⑤뱺 ?곸뿭怨??붾㈃ 諛뽰쓣 Distractibility AOI濡?蹂닿퀬 怨꾩궛???곷? ?쒖꽑 ?쒓컙 鍮꾩쑉?낅땲??"
                },
                {
                    title: "?묐떟 ?띾룄",
                    score: responseScore,
                    hint: `?됯퇏 ?묐떟 ?쒓컙? ${(metrics.averageResponseMs / 1000).toFixed(1)}珥덉삁??`,
                    desc: "?덈Т 鍮좊Ⅸ 泥댄겕媛 諛섎났?섎㈃ ?⑤꼸?곕? 二쇨퀬, 臾명빆???쎌쓣 理쒖냼 ?쒓컙 ?놁씠 ?묐떟???⑦꽩??媛먯젏?⑸땲??"
                },
                {
                    title: "움직임 안정성",
                    score: stabilityScore,
                    hint: `?ㅻЦ 以?癒몃━ ?吏곸엫 蹂?숈꽦 ?⑹? ${metrics.headMotionStd.toFixed(1)}?낅땲??`,
                    desc: "AOI ?먯젙怨?蹂꾨룄濡?癒몃━ ?吏곸엫 ?쒖??몄감瑜?李멸퀬 吏?쒕줈 ?좎??⑸땲??"
                }
            ];

            const hardestQuestion = analytics.questions
                .slice()
                .sort((a, b) => b.visibleMs - a.visibleMs)[0];

            const fastestQuestion = analytics.questions
                .filter((metric) => metric.responseMs !== null)
                .slice()
                .sort((a, b) => a.responseMs - b.responseMs)[0];

            const notes = [];

            if (analytics.cameraState === "denied") {
                notes.push("移대찓??沅뚰븳???놁뼱 ?ㅻЦ ?묐떟 湲곕줉留??붿빟?덇퀬, AOI 湲곕컲 ?쒖꽑 吏?쒕뒗 異⑸텇??怨꾩궛?섏? ?딆븯?댁슂.");
            } else if (metrics.gazeCoverageRatio < 0.35) {
                notes.push("?좏슚 ?쒖꽑 ?섑뵆 鍮꾩쑉????븘??AOI 鍮꾩쑉? 李멸퀬?⑹쑝濡쒕쭔 蹂대뒗 ?몄씠 ?덉쟾?⑸땲??");
            } else {
                notes.push(`?좏슚 ?쒖꽑 援ш컙 ${formatMs(metrics.gazeObservedMs)}瑜?湲곗??쇰줈 AOI 鍮꾩쑉??怨꾩궛?덉뒿?덈떎.`);
            }

            if (hardestQuestion) {
                notes.push(`媛???ㅻ옒 癒몃Ц 臾명빆? Q${hardestQuestion.id}?怨?珥?${formatMs(hardestQuestion.visibleMs)} ?뺤씤?덉뼱??`);
            }

            if (fastestQuestion && fastestQuestion.responseMs !== null) {
                notes.push(`媛??鍮좊Ⅴ寃??묐떟??臾명빆? Q${fastestQuestion.id}?怨?${formatMs(fastestQuestion.responseMs)}媛 嫄몃졇?댁슂.`);
            }

            if (metrics.taskVisitTotal > 0) {
                notes.push(`Task AOI ?ъ쭊?낆? 珥?${metrics.taskVisitTotal}?뚮줈 吏묎퀎?먯뼱?? 媛믪씠 ?댁닔濡??쒖꽑???먯＜ ?댄깉?덈떎媛 ?뚯븘???⑦꽩?낅땲??`);
            }

            if (metrics.rapidCount > 0) {
                notes.push(`理쒖냼 ?쎄린 ?쒓컙 ?놁씠 諛붾줈 ?묐떟??臾명빆??${metrics.rapidCount}媛??덉뼱 ?묐떟 ?띾룄 ?먯닔??諛섏쁺?덉뼱??`);
            }

            return {
                cards,
                notes,
                raw: {
                    ...metrics,
                    cameraState: analytics.cameraState
                }
            };
        };

        renderSummary = function renderSummary() {
            syncAnswersFromDom();
            const summary = buildFriendlySummary();

            dom.summaryIntro.textContent = "?ㅻЦ ?묐떟怨?AOI 湲곕컲 ?쒖꽑 遺꾪룷瑜??④퍡 ?붿빟?덉뒿?덈떎. Task AOI???꾩옱 ?쒖꽦 臾명빆, Distractibility AOI??洹???紐⑤뱺 ?곸뿭?낅땲??";

            dom.summaryCards.innerHTML = summary.cards.map((card) => {
                const bucket = metricBucket(card.score, { reverse: !!card.reverseTone });
                return `
                    <div class="summary-card rounded-[2rem] p-7">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <p class="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">${card.title}</p>
                                <p class="mt-3 text-4xl font-black text-slate-900">${card.score}<span class="text-2xl">??/span></p>
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
                webgazer: exportWebGazerData(),
                summary,
                questions: analytics.questions.map((metric) => ({
                    id: metric.id,
                    part: metric.part,
                    question: metric.question,
                    answerValue: metric.answerValue,
                    visibleMs: Number(metric.visibleMs.toFixed(1)),
                    gazeTotalMs: Number(metric.gazeTotalMs.toFixed(1)),
                    taskMs: Number(metric.taskMs.toFixed(1)),
                    distractMs: Number(metric.distractMs.toFixed(1)),
                    attentiveMs: Number(metric.taskMs.toFixed(1)),
                    awayMs: Number(metric.distractMs.toFixed(1)),
                    responseMs: metric.responseMs === null ? null : Number(metric.responseMs.toFixed(1)),
                    rapidResponse: metric.rapidResponse,
                    taskVisitCount: metric.taskVisitCount,
                    revisitCount: Math.max(0, metric.activationCount - 1)
                }))
            };
        };

        function getSurveyScreeningBreakdown() {
            const responseLabels = ["없음", "거의 없음", "가끔", "자주", "매우 자주"];
            const buildPartBreakdown = (part) => {
                const answered = analytics.questions.filter((metric) => metric.part === part && metric.answerValue !== null);
                const scoreCounts = responseLabels.map((_, score) => answered.filter((metric) => Number(metric.answerValue) === score).length);
                let dominantScore = 0;

                scoreCounts.forEach((count, score) => {
                    const currentDominant = scoreCounts[dominantScore] ?? 0;
                    if (count > currentDominant || (count === currentDominant && count > 0 && score > dominantScore)) {
                        dominantScore = score;
                    }
                });

                const highCount = answered.filter((metric) => Number(metric.answerValue) >= 3).length;

                return {
                    answeredCount: answered.length,
                    scoreCounts,
                    dominantScore,
                    dominantLabel: responseLabels[dominantScore],
                    dominantCount: scoreCounts[dominantScore] ?? 0,
                    highCount,
                    positive: highCount >= 5
                };
            };

            const part1 = buildPartBreakdown(1);
            const part2 = buildPartBreakdown(2);

            return {
                part1,
                part2,
                screeningPositive: part1.positive || part2.positive
            };
        }

        buildFriendlySummary = function buildFriendlySummary() {
            const metrics = aggregateMetrics();
            const screening = getSurveyScreeningBreakdown();
            const focusScore = Math.round(clamp(metrics.attentionRatio * 100, 0, 100));
            const distractibilityScore = Math.round(clamp(metrics.distractibilityRatio * 100, 0, 100));

            const cards = [
                {
                    title: "?ㅻЦ ?먯젙",
                    score: screening.screeningPositive ? 100 : 0,
                    valueLabel: screening.screeningPositive ? "?묒꽦" : "?뚯꽦",
                    bucket: {
                        tone: screening.screeningPositive ? "?묒꽦" : "?뚯꽦",
                        color: screening.screeningPositive ? "text-rose-600" : "text-emerald-600"
                    },
                    hint: `Part 1? ${screening.part1HighCount}媛? Part 2??${screening.part2HighCount}媛?臾명빆??3???댁긽?낅땲??`,
                    desc: `媛??뚰듃?먯꽌 3???댁긽 臾명빆??5媛??댁긽?대㈃ ?묒꽦?쇰줈 ?먮떒?⑸땲?? ???뚰듃?쇰룄 湲곗????섏쑝硫?理쒖쥌 寃곌낵??${screening.screeningPositive ? "?묒꽦" : "?뚯꽦"}?낅땲??`
                },
                {
                    title: "Task AOI 吏묒쨷",
                    score: focusScore,
                    hint: `?꾩껜 ?좏슚 ?쒖꽑 ?쒓컙 以?${focusScore}%媛 ?꾩옱 臾명빆 AOI ?덉뿉 癒몃Ъ??댁슂.`,
                    desc: "?꾩옱 ?쒖꽦 臾명빆 移대뱶 ?곸뿭??Task AOI濡?蹂닿퀬, 洹??덉뿉 癒몃Ц ?곷? ?쒖꽑 ?쒓컙 鍮꾩쑉濡?怨꾩궛??attention 媛믪엯?덈떎."
                },
                {
                    title: "Distractibility",
                    score: distractibilityScore,
                    reverseTone: true,
                    hint: `?꾩껜 ?좏슚 ?쒖꽑 ?쒓컙 以?${distractibilityScore}%媛 Task AOI 諛뽰뿉 癒몃Ъ??댁슂.`,
                    desc: "Task AOI瑜??쒖쇅???붾㈃??紐⑤뱺 ?곸뿭怨??붾㈃ 諛뽰쓣 Distractibility AOI濡?蹂닿퀬 怨꾩궛???곷? ?쒖꽑 ?쒓컙 鍮꾩쑉?낅땲??"
                }
            ];

            const hardestQuestion = analytics.questions
                .slice()
                .sort((a, b) => b.visibleMs - a.visibleMs)[0];

            const notes = [
                `臾명빆 ?먯닔 湲곗??쇰줈??Part 1?먯꽌 ${screening.part1HighCount}媛? Part 2?먯꽌 ${screening.part2HighCount}媛쒓? 3???댁긽?쇰줈 吏묎퀎??理쒖쥌 ${screening.screeningPositive ? "?묒꽦" : "?뚯꽦"}?쇰줈 遺꾨쪟?덉뒿?덈떎.`
            ];

            if (analytics.cameraState === "denied") {
                notes.push("移대찓??沅뚰븳???놁뼱 ?ㅻЦ ?묐떟 湲곕줉留??붿빟?덇퀬, AOI 湲곕컲 ?쒖꽑 吏?쒕뒗 異⑸텇??怨꾩궛?섏? ?딆븯?댁슂.");
            } else if (metrics.gazeCoverageRatio < 0.35) {
                notes.push("?좏슚 ?쒖꽑 ?섑뵆 鍮꾩쑉????븘??AOI 鍮꾩쑉? 李멸퀬?⑹쑝濡쒕쭔 蹂대뒗 ?몄씠 ?덉쟾?⑸땲??");
            } else {
                notes.push(`?좏슚 ?쒖꽑 援ш컙 ${formatMs(metrics.gazeObservedMs)}瑜?湲곗??쇰줈 AOI 鍮꾩쑉??怨꾩궛?덉뒿?덈떎.`);
            }

            if (hardestQuestion) {
                notes.push(`媛???ㅻ옒 癒몃Ц 臾명빆? Q${hardestQuestion.id}?怨?珥?${formatMs(hardestQuestion.visibleMs)} ?숈븞 ?뺤씤?덉뒿?덈떎.`);
            }

            if (metrics.taskVisitTotal > 0) {
                notes.push(`Task AOI ?ъ쭊?낆? 珥?${metrics.taskVisitTotal}?뚮줈 吏묎퀎?먯뼱?? 媛믪씠 ?댁닔濡??쒖꽑???먯＜ ?댄깉?덈떎媛 ?뚯븘???⑦꽩?낅땲??`);
            }

            return {
                cards,
                notes,
                raw: {
                    ...metrics,
                    cameraState: analytics.cameraState,
                    screening
                }
            };
        };

        renderSummary = function renderSummary() {
            syncAnswersFromDom();
            const summary = buildFriendlySummary();

            dom.summaryIntro.textContent = "臾명빆 ?먯닔 ?먯젙怨?AOI 湲곕컲 ?쒖꽑 遺꾪룷瑜??④퍡 ?붿빟?덉뒿?덈떎. Task AOI???꾩옱 ?쒖꽦 臾명빆, Distractibility AOI??洹???紐⑤뱺 ?곸뿭?낅땲??";

            dom.summaryCards.innerHTML = summary.cards.map((card) => {
                const bucket = card.bucket ?? metricBucket(card.score, { reverse: !!card.reverseTone });
                const valueMarkup = card.valueLabel
                    ? `<p class="mt-3 text-4xl font-black text-slate-900">${card.valueLabel}</p>`
                    : `<p class="mt-3 text-4xl font-black text-slate-900">${card.score}<span class="text-2xl">점</span></p>`;

                return `
                    <div class="summary-card rounded-[2rem] p-7">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <p class="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">${card.title}</p>
                                ${valueMarkup}
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
                webgazer: exportWebGazerData(),
                summary,
                questions: analytics.questions.map((metric) => ({
                    id: metric.id,
                    part: metric.part,
                    question: metric.question,
                    answerValue: metric.answerValue,
                    visibleMs: Number(metric.visibleMs.toFixed(1)),
                    gazeTotalMs: Number(metric.gazeTotalMs.toFixed(1)),
                    taskMs: Number(metric.taskMs.toFixed(1)),
                    distractMs: Number(metric.distractMs.toFixed(1)),
                    attentiveMs: Number(metric.taskMs.toFixed(1)),
                    awayMs: Number(metric.distractMs.toFixed(1)),
                    responseMs: metric.responseMs === null ? null : Number(metric.responseMs.toFixed(1)),
                    rapidResponse: metric.rapidResponse,
                    taskVisitCount: metric.taskVisitCount,
                    revisitCount: Math.max(0, metric.activationCount - 1)
                }))
            };
        };

        function renderSurveyScreeningBreakdown(screening) {
            if (!dom.summaryScreeningBreakdown || !screening) return;

            const renderPartCard = (title, subtitle, part) => `
                <div class="summary-card rounded-[2rem] border border-slate-200 p-7">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">${title}</p>
                            <p class="mt-2 text-2xl font-black text-slate-900">${subtitle}</p>
                        </div>
                        <span class="text-sm font-black ${part.positive ? "text-rose-600" : "text-emerald-600"}">${part.positive ? "?묒꽦" : "?뚯꽦"}</span>
                    </div>
                    <div class="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                        <p>媛??留롮씠 ?묐떟???먯닔: <strong class="text-slate-900">${part.dominantLabel} (${part.dominantScore}??</strong> ${part.dominantCount}??/p>
                        <p>3???댁긽 ?묐떟: <strong class="text-slate-900">${part.highCount}??/strong></p>
                        <p>?묐떟 ?꾨즺 臾명빆: <strong class="text-slate-900">${part.answeredCount}媛?/strong></p>
                    </div>
                </div>
            `;

            dom.summaryScreeningBreakdown.innerHTML = `
                <div class="summary-card rounded-[2rem] border border-blue-100 bg-blue-50/70 p-7">
                    <p class="text-sm font-bold uppercase tracking-[0.22em] text-blue-600">理쒖쥌 ?먯젙</p>
                    <div class="mt-3 flex items-end justify-between gap-4">
                        <p class="text-4xl font-black text-slate-900">${screening.screeningPositive ? "?묒꽦" : "?뚯꽦"}</p>
                        <span class="text-sm font-black ${screening.screeningPositive ? "text-rose-600" : "text-emerald-600"}">${screening.screeningPositive ? "주의 필요" : "기준 미충족"}</span>
                    </div>
                    <p class="mt-5 text-sm leading-7 text-slate-600">Part 1 ?먮뒗 Part 2 以????뚰듃?쇰룄 3???댁긽 臾명빆??5媛??댁긽?대㈃ 理쒖쥌 ?묒꽦?쇰줈 ?먮떒?⑸땲??</p>
                </div>
                ${renderPartCard("Part 1", "遺二쇱쓽", screening.part1)}
                ${renderPartCard("Part 2", "충동성과 과활동", screening.part2)}
            `;
        }

        buildFriendlySummary = function buildFriendlySummary() {
            const metrics = aggregateMetrics();
            const screening = getSurveyScreeningBreakdown();
            const focusScore = Math.round(clamp(metrics.attentionRatio * 100, 0, 100));
            const distractibilityScore = Math.round(clamp(metrics.distractibilityRatio * 100, 0, 100));

            const cards = [
                {
                    title: "Task AOI 吏묒쨷",
                    score: focusScore,
                    hint: `?꾩껜 ?좏슚 ?쒖꽑 ?쒓컙 以?${focusScore}%媛 ?꾩옱 臾명빆 AOI ?덉뿉 癒몃Ъ??댁슂.`,
                    desc: "?꾩옱 ?쒖꽦 臾명빆 移대뱶 ?곸뿭??Task AOI濡?蹂닿퀬, 洹??덉뿉 癒몃Ц ?곷? ?쒖꽑 ?쒓컙 鍮꾩쑉濡?怨꾩궛??attention 媛믪엯?덈떎."
                },
                {
                    title: "Distractibility",
                    score: distractibilityScore,
                    reverseTone: true,
                    hint: `?꾩껜 ?좏슚 ?쒖꽑 ?쒓컙 以?${distractibilityScore}%媛 Task AOI 諛뽰뿉 癒몃Ъ??댁슂.`,
                    desc: "Task AOI瑜??쒖쇅???붾㈃??紐⑤뱺 ?곸뿭怨??붾㈃ 諛뽰쓣 Distractibility AOI濡?蹂닿퀬 怨꾩궛???곷? ?쒖꽑 ?쒓컙 鍮꾩쑉?낅땲??"
                }
            ];

            const hardestQuestion = analytics.questions
                .slice()
                .sort((a, b) => b.visibleMs - a.visibleMs)[0];

            const notes = [];

            if (analytics.cameraState === "denied") {
                notes.push("移대찓??沅뚰븳???놁뼱 ?ㅻЦ ?묐떟 湲곕줉留??붿빟?덇퀬, AOI 湲곕컲 ?쒖꽑 吏?쒕뒗 異⑸텇??怨꾩궛?섏? ?딆븯?댁슂.");
            } else if (metrics.gazeCoverageRatio < 0.35) {
                notes.push("?좏슚 ?쒖꽑 ?섑뵆 鍮꾩쑉????븘??AOI 鍮꾩쑉? 李멸퀬?⑹쑝濡쒕쭔 蹂대뒗 ?몄씠 ?덉쟾?⑸땲??");
            } else {
                notes.push(`?좏슚 ?쒖꽑 援ш컙 ${formatMs(metrics.gazeObservedMs)}瑜?湲곗??쇰줈 AOI 鍮꾩쑉??怨꾩궛?덉뒿?덈떎.`);
            }

            if (hardestQuestion) {
                notes.push(`媛???ㅻ옒 癒몃Ц 臾명빆? Q${hardestQuestion.id}?怨?珥?${formatMs(hardestQuestion.visibleMs)} ?숈븞 ?뺤씤?덉뒿?덈떎.`);
            }

            if (metrics.taskVisitTotal > 0) {
                notes.push(`Task AOI ?ъ쭊?낆? 珥?${metrics.taskVisitTotal}?뚮줈 吏묎퀎?먯뼱?? 媛믪씠 ?댁닔濡??쒖꽑???먯＜ ?댄깉?덈떎媛 ?뚯븘???⑦꽩?낅땲??`);
            }

            return {
                cards,
                notes,
                raw: {
                    ...metrics,
                    cameraState: analytics.cameraState,
                    screening
                }
            };
        };

        renderSummary = function renderSummary() {
            syncAnswersFromDom();
            const summary = buildFriendlySummary();

            dom.summaryIntro.textContent = "臾명빆 ?먯닔 ?먯젙怨??붿???諛붿씠?ㅻ쭏而?吏?쒕? ?④퍡 ?붿빟?덉뒿?덈떎.";
            renderSurveyScreeningBreakdown(summary.raw.screening);

            dom.summaryCards.innerHTML = summary.cards.map((card) => {
                const bucket = metricBucket(card.score, { reverse: !!card.reverseTone });
                return `
                    <div class="summary-card rounded-[2rem] p-7">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <p class="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">${card.title}</p>
                                <p class="mt-3 text-4xl font-black text-slate-900">${card.score}<span class="text-2xl">??/span></p>
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
                webgazer: exportWebGazerData(),
                summary,
                questions: analytics.questions.map((metric) => ({
                    id: metric.id,
                    part: metric.part,
                    question: metric.question,
                    answerValue: metric.answerValue,
                    visibleMs: Number(metric.visibleMs.toFixed(1)),
                    gazeTotalMs: Number(metric.gazeTotalMs.toFixed(1)),
                    taskMs: Number(metric.taskMs.toFixed(1)),
                    distractMs: Number(metric.distractMs.toFixed(1)),
                    attentiveMs: Number(metric.taskMs.toFixed(1)),
                    awayMs: Number(metric.distractMs.toFixed(1)),
                    responseMs: metric.responseMs === null ? null : Number(metric.responseMs.toFixed(1)),
                    rapidResponse: metric.rapidResponse,
                    taskVisitCount: metric.taskVisitCount,
                    revisitCount: Math.max(0, metric.activationCount - 1)
                }))
            };
        };

        function proceedToSurveyWithoutCalibration({ keepCamera = true } = {}) {
            aoiEnvironmentState.calibrationSkipped = true;
            syncAoiEnvironmentState();
            resetSurveyTracking();
            closeEnvironmentCheck({ keepCamera });
            window.dispatchEvent(new CustomEvent("fast:calibration-complete"));
        }

        function closeEnvironmentCheck({ keepCamera = true, emitCancel = false } = {}) {
            if (dom.environmentCheckOverlay) {
                dom.environmentCheckOverlay.classList.add("hidden");
                dom.environmentCheckOverlay.setAttribute("aria-hidden", "true");
            }
            document.body.classList.remove("overflow-hidden");

            if (dom.environmentWebcamPreview) {
                dom.environmentWebcamPreview.pause?.();
                dom.environmentWebcamPreview.srcObject = null;
            }
            if (dom.environmentGuideOverlay) {
                const ctx = dom.environmentGuideOverlay.getContext("2d");
                ctx?.clearRect(0, 0, dom.environmentGuideOverlay.width, dom.environmentGuideOverlay.height);
            }

            environmentCheckState.open = false;
            if (!keepCamera) {
                stopCamera();
            }
            if (emitCancel) {
                window.dispatchEvent(new CustomEvent("fast:environment-cancel"));
            }
        }

        renderEnvironmentCheck = function renderEnvironmentCheck(now = performance.now(), result = null) {
            if (!isEnvironmentCheckOpen()) return;

            environmentCheckState.open = true;
            syncEnvironmentPreviewStream();
            const canProceed = analytics.cameraState === "active"
                || analytics.cameraState === "denied"
                || analytics.cameraState === "unavailable";
            environmentCheckState.readyToProceed = canProceed;
            if (dom.environmentSummary) {
                dom.environmentSummary.textContent = "카메라 화면을 보며 조명, 얼굴 위치, 화면 환경을 확인해주세요.";
            }
            if (dom.environmentLightStatus) {
                dom.environmentLightStatus.textContent = "조명을 밝게 맞춰주세요";
            }
            if (dom.environmentLightHint) {
                dom.environmentLightHint.textContent = "얼굴이 어둡지 않게 실내 조명을 밝혀주세요.";
            }
            if (dom.environmentPositionStatus) {
                dom.environmentPositionStatus.textContent = "얼굴을 중앙에 맞춰주세요";
            }
            if (dom.environmentPositionHint) {
                dom.environmentPositionHint.textContent = "오른쪽 카메라 화면처럼 얼굴 전체가 중앙 네모 안에 들어오게 맞춰주세요.";
            }
            if (dom.environmentSetupStatus) {
                dom.environmentSetupStatus.textContent = "전체화면으로 진행해주세요";
            }
            if (dom.environmentSetupHint) {
                dom.environmentSetupHint.textContent = "가능하면 전체화면으로 진행해주세요.";
            }
            if (dom.environmentContinueBtn) {
                dom.environmentContinueBtn.disabled = !environmentCheckState.readyToProceed;
            }
            if (dom.environmentCameraBadge) {
                dom.environmentCameraBadge.textContent = "Camera Preview";
            }
            if (dom.environmentFaceBadge) {
                dom.environmentFaceBadge.textContent = "Position Guide";
            }
            if (dom.environmentGuideBox) {
                dom.environmentGuideBox.style.borderColor = "#34d399";
            }

            drawEnvironmentOverlay();
        };

        completeEnvironmentCheck = function completeEnvironmentCheck() {
            if (!environmentCheckState.readyToProceed) return;

            aoiEnvironmentState.completedAt = new Date().toISOString();
            const setup = syncAoiEnvironmentState();

            if (analytics.cameraState !== "active" || setup.validity === "excluded") {
                proceedToSurveyWithoutCalibration({ keepCamera: analytics.cameraState === "active" });
                return;
            }

            closeEnvironmentCheck({ keepCamera: true });
            openCalibration();
        };

        openEnvironmentCheck = function openEnvironmentCheck() {
            if (!dom.environmentCheckOverlay) return false;

            environmentCheckState = createEnvironmentCheckState();
            aoiEnvironmentState = createAoiEnvironmentState();
            aoiEnvironmentState.startedAt = new Date().toISOString();
            aoiEnvironmentState.initialViewport = getViewportSnapshot();
            syncAoiEnvironmentState();
            dom.environmentCheckOverlay.classList.remove("hidden");
            dom.environmentCheckOverlay.setAttribute("aria-hidden", "false");
            document.body.classList.add("overflow-hidden");
            syncEnvironmentPreviewStream();
            renderEnvironmentCheck();

            Promise.resolve(ensureCameraStarted({ startWebGazer: false }))
                .then(() => {
                    syncEnvironmentPreviewStream();
                    renderEnvironmentCheck();
                })
                .catch((error) => {
                    console.error("Environment check camera start failed", error);
                    renderEnvironmentCheck();
                });

            return true;
        };

        buildFriendlySummary = function buildFriendlySummary() {
            const metrics = aggregateMetrics();
            const screening = getSurveyScreeningBreakdown();
            const environment = getAoiEnvironmentSnapshot();
            const focusScore = Math.round(clamp(metrics.attentionRatio * 100, 0, 100));
            const distractibilityScore = Math.round(clamp(metrics.distractibilityRatio * 100, 0, 100));

            const cards = [
                {
                    title: "Task AOI 집중",
                    score: focusScore,
                    hint: `?袁⑷퍥 ?醫륁뒞 ??뽮퐨 ??볦퍢 餓?${focusScore}%揶쎛 ?袁⑹삺 ?얜챸鍮?AOI ??됰퓠 ?믩챶窺????곸뒄.`,
                    desc: "?袁⑹삺 ??뽮쉐 ?얜챸鍮?燁삳?諭??怨몃열??Task AOI嚥?癰귣떯?? 域???됰퓠 ?믩챶揆 ?怨? ??뽮퐨 ??볦퍢 ??쑴?됪에??④쑴沅??attention 揶쏅????덈뼄."
                },
                {
                    title: "Distractibility",
                    score: distractibilityScore,
                    reverseTone: true,
                    hint: `?袁⑷퍥 ?醫륁뒞 ??뽮퐨 ??볦퍢 餓?${distractibilityScore}%揶쎛 Task AOI 獄쏅쉼肉??믩챶窺????곸뒄.`,
                    desc: "Task AOI????뽰뇚???遺얇늺??筌뤴뫀諭??怨몃열???遺얇늺 獄쏅쉼??Distractibility AOI嚥?癰귣떯???④쑴沅???怨? ??뽮퐨 ??볦퍢 ??쑴???낅빍??"
                }
            ];

            const hardestQuestion = analytics.questions
                .slice()
                .sort((a, b) => b.visibleMs - a.visibleMs)[0];

            const notes = [];

            if (analytics.cameraState === "denied") {
                notes.push("燁삳?李??亦낅슦釉????곷선 ??뿅??臾먮뼗 疫꿸퀡以됵쭕??遺용튋??뉙? AOI 疫꿸퀡而???뽮퐨 筌왖??뺣뮉 ?겸뫖????④쑴沅??? ??녿릭??곸뒄.");
            } else if (environment.validity === "excluded") {
                notes.push(`?袁⑹삺 野꺜????띻펾(${environment.reasonLabels.join(", ")})?癒?퐣??AOI????뽰뇚??랁??臾먮뼗 ???쉘 餓λ쵐???곗쨮 ??곴퐤??됰뮸??덈뼄.`);
            } else if (environment.validity === "limited") {
                notes.push(`?袁⑹삺 野꺜????띻펾(${environment.reasonLabels.join(", ")}) ?????AOI??筌〓㈇???뱀몵嚥≪뮆彛?癰귣????紐꾩뵠 ??됱읈??몃빍??`);
            } else if (metrics.gazeCoverageRatio < 0.35) {
                notes.push("?醫륁뒞 ??뽮퐨 ??묐탣 ??쑴?????釉??AOI ??쑴??? 筌〓㈇???뱀몵嚥≪뮆彛?癰귣????紐꾩뵠 ??됱읈??몃빍??");
            } else {
                notes.push(`?醫륁뒞 ??뽮퐨 ?닌덉퍢 ${formatMs(metrics.gazeObservedMs)}??疫꿸퀣???곗쨮 AOI ??쑴????④쑴沅??됰뮸??덈뼄.`);
            }

            if (hardestQuestion) {
                notes.push(`揶쎛????살삋 ?믩챶揆 ?얜챸鍮?? Q${hardestQuestion.id}??????${formatMs(hardestQuestion.visibleMs)} ??덈툧 ?類ㅼ뵥??됰뮸??덈뼄.`);
            }

            if (metrics.taskVisitTotal > 0) {
                notes.push(`Task AOI ??彛??? ??${metrics.taskVisitTotal}???쨮 筌욌쵌??癒?선?? 揶쏅?????곷땾嚥???뽮퐨???癒?폒 ??꾧퉱??덈뼄揶쎛 ???툡?????쉘??낅빍??`);
            }

            return {
                cards,
                notes,
                raw: {
                    ...metrics,
                    cameraState: analytics.cameraState,
                    screening,
                    environment
                }
            };
        };

        renderSummary = function renderSummary() {
            syncAnswersFromDom();
            const summary = buildFriendlySummary();

            dom.summaryIntro.textContent = "?얜챸鍮??癒?땾 ?癒?젟??AOI 疫꿸퀡而?筌왖??? ??ｍ뜞 ?遺용튋??롫┷, 野꺜????띻펾 ?怨밴묶揶쎛 AOI ??곴퐤??獄쏆꼷???ㅻ빍??";
            renderSurveyScreeningBreakdown(summary.raw.screening);

            dom.summaryCards.innerHTML = summary.cards.map((card) => {
                const bucket = metricBucket(card.score, { reverse: !!card.reverseTone });
                return `
                    <div class="summary-card rounded-[2rem] p-7">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <p class="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">${card.title}</p>
                                <p class="mt-3 text-4xl font-black text-slate-900">${card.score}<span class="text-2xl">%</span></p>
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
                environment: getAoiEnvironmentSnapshot(),
                webgazer: exportWebGazerData(),
                summary,
                questions: analytics.questions.map((metric) => ({
                    id: metric.id,
                    part: metric.part,
                    question: metric.question,
                    answerValue: metric.answerValue,
                    visibleMs: Number(metric.visibleMs.toFixed(1)),
                    gazeTotalMs: Number(metric.gazeTotalMs.toFixed(1)),
                    taskMs: Number(metric.taskMs.toFixed(1)),
                    distractMs: Number(metric.distractMs.toFixed(1)),
                    attentiveMs: Number(metric.taskMs.toFixed(1)),
                    awayMs: Number(metric.distractMs.toFixed(1)),
                    responseMs: metric.responseMs === null ? null : Number(metric.responseMs.toFixed(1)),
                    rapidResponse: metric.rapidResponse,
                    taskVisitCount: metric.taskVisitCount,
                    revisitCount: Math.max(0, metric.activationCount - 1)
                }))
            };
        };

        buildFriendlySummary = function buildFriendlySummary() {
            const metrics = aggregateMetrics();
            const screening = getSurveyScreeningBreakdown();
            const environment = getAoiEnvironmentSnapshot();
            const focusScore = Math.round(clamp(metrics.attentionRatio * 100, 0, 100));
            const distractibilityScore = Math.round(clamp(metrics.distractibilityRatio * 100, 0, 100));

            const cards = [
                {
                    title: "Task AOI 吏묒쨷",
                    score: focusScore,
                    hint: `?꾩껜 ?좏슚 ?쒖꽑 ?쒓컙 以?${focusScore}%媛 ?꾩옱 臾명빆 AOI ?덉뿉 癒몃Ъ??댁슂.`,
                    desc: "?꾩옱 ?쒖꽦 臾명빆 移대뱶 ?곸뿭??Task AOI濡?蹂닿퀬, 洹??덉뿉 癒몃Ц ?곷? ?쒖꽑 ?쒓컙 鍮꾩쑉濡?怨꾩궛??attention 媛믪엯?덈떎."
                },
                {
                    title: "Distractibility",
                    score: distractibilityScore,
                    reverseTone: true,
                    hint: `?꾩껜 ?좏슚 ?쒖꽑 ?쒓컙 以?${distractibilityScore}%媛 Task AOI 諛뽰뿉 癒몃Ъ??댁슂.`,
                    desc: "Task AOI瑜??쒖쇅???붾㈃??紐⑤뱺 ?곸뿭怨??붾㈃ 諛뽰쓣 Distractibility AOI濡?蹂닿퀬 怨꾩궛???곷? ?쒖꽑 ?쒓컙 鍮꾩쑉?낅땲??"
                }
            ];

            const hardestQuestion = analytics.questions
                .slice()
                .sort((a, b) => b.visibleMs - a.visibleMs)[0];

            const notes = [];

            if (analytics.cameraState === "denied") {
                notes.push("移대찓??沅뚰븳???놁뼱 ?ㅻЦ ?묐떟 湲곕줉留??붿빟?덇퀬, AOI 湲곕컲 ?쒖꽑 吏?쒕뒗 ?쒖쇅?덉뒿?덈떎.");
            } else if (environment.validity === "excluded") {
                notes.push(`?꾩옱 寃???섍꼍(${environment.reasonLabels.join(", ")})?먯꽌??AOI瑜??쒖쇅?섍퀬 ?묐떟 ?먮쫫 以묒떖?쇰줈 ?댁꽍?덉뒿?덈떎.`);
            } else if (environment.validity === "limited") {
                notes.push(`?꾩옱 寃???섍꼍(${environment.reasonLabels.join(", ")}) ?뚮Ц??AOI??李멸퀬?⑹쑝濡쒕쭔 蹂대뒗 ?몄씠 ?덉쟾?⑸땲??`);
            } else if (metrics.gazeCoverageRatio < 0.35) {
                notes.push("?좏슚 ?쒖꽑 ?섑뵆 鍮꾩쑉????븘??AOI 鍮꾩쑉? 李멸퀬?⑹쑝濡쒕쭔 蹂대뒗 ?몄씠 ?덉쟾?⑸땲??");
            } else {
                notes.push(`?좏슚 ?쒖꽑 援ш컙 ${formatMs(metrics.gazeObservedMs)}瑜?湲곗??쇰줈 AOI 鍮꾩쑉??怨꾩궛?덉뒿?덈떎.`);
            }

            if (hardestQuestion) {
                notes.push(`媛???ㅻ옒 癒몃Ц 臾명빆? Q${hardestQuestion.id}?怨?珥?${formatMs(hardestQuestion.visibleMs)} ?숈븞 ?뺤씤?덉뒿?덈떎.`);
            }

            if (metrics.taskVisitTotal > 0) {
                notes.push(`Task AOI ?ъ쭊?낆? 珥?${metrics.taskVisitTotal}?뚮줈 吏묎퀎?먯뼱?? 媛믪씠 ?댁닔濡??쒖꽑???먯＜ ?댄깉?덈떎媛 ?뚯븘???⑦꽩?낅땲??`);
            }

            return {
                cards,
                notes,
                raw: {
                    ...metrics,
                    cameraState: analytics.cameraState,
                    screening,
                    environment
                }
            };
        };

        renderSummary = function renderSummary() {
            syncAnswersFromDom();
            const summary = buildFriendlySummary();

            dom.summaryIntro.textContent = "臾명빆 ?먯닔 ?먯젙怨?AOI 湲곕컲 吏?쒕? ?④퍡 ?붿빟?덇퀬, 寃???섍꼍 ?곹깭??AOI ?댁꽍??諛섏쁺?덉뒿?덈떎.";
            renderSurveyScreeningBreakdown(summary.raw.screening);

            dom.summaryCards.innerHTML = summary.cards.map((card) => {
                const bucket = metricBucket(card.score, { reverse: !!card.reverseTone });
                return `
                    <div class="summary-card rounded-[2rem] p-7">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <p class="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">${card.title}</p>
                                <p class="mt-3 text-4xl font-black text-slate-900">${card.score}<span class="text-2xl">%</span></p>
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
                environment: getAoiEnvironmentSnapshot(),
                webgazer: exportWebGazerData(),
                summary,
                questions: analytics.questions.map((metric) => ({
                    id: metric.id,
                    part: metric.part,
                    question: metric.question,
                    answerValue: metric.answerValue,
                    visibleMs: Number(metric.visibleMs.toFixed(1)),
                    gazeTotalMs: Number(metric.gazeTotalMs.toFixed(1)),
                    taskMs: Number(metric.taskMs.toFixed(1)),
                    distractMs: Number(metric.distractMs.toFixed(1)),
                    attentiveMs: Number(metric.taskMs.toFixed(1)),
                    awayMs: Number(metric.distractMs.toFixed(1)),
                    responseMs: metric.responseMs === null ? null : Number(metric.responseMs.toFixed(1)),
                    rapidResponse: metric.rapidResponse,
                    taskVisitCount: metric.taskVisitCount,
                    revisitCount: Math.max(0, metric.activationCount - 1)
                }))
            };
        };

        renderAdminPanel = function renderAdminPanel() {
            if (!dom.adminCameraState || !dom.adminRawMetrics) return;

            const metrics = aggregateMetrics();
            const environment = getAoiEnvironmentSnapshot();
            const currentMetric = getCurrentQuestionMetric();
            const currentEuler = latestFaceSample?.euler ?? { yaw: 0, pitch: 0, roll: 0 };
            const currentSample = getFreshWebGazerSample("survey", performance.now());
            const currentAoi = currentSample ? getAoiClassification("survey", currentSample) : null;
            const cameraLabelMap = {
                idle: "대기",
                active: "異붿쟻",
                denied: "沅뚰븳 嫄곕?",
                unavailable: "以鍮??ㅽ뙣"
            };

            dom.adminCameraState.textContent = cameraLabelMap[analytics.cameraState] ?? analytics.cameraState;
            dom.adminFacePresence.textContent = `?쇨뎬 寃異?${Math.round(metrics.facePresenceRatio * 100)}%`;

            if (!currentAoi) {
                dom.adminAttentionState.textContent = "시선 미확인";
            } else if (currentAoi.zone === "task") {
                dom.adminAttentionState.textContent = "Task AOI";
            } else {
                dom.adminAttentionState.textContent = "Distract AOI";
            }

            dom.adminAwayRatio.textContent = `Distract AOI ${Math.round(metrics.awayRatio * 100)}%`;
            dom.adminHeadMotion.textContent = `${metrics.headMotionStd.toFixed(1)} deg`;
            dom.adminEuler.textContent = `yaw ${currentEuler.yaw.toFixed(1)} / pitch ${currentEuler.pitch.toFixed(1)} / roll ${currentEuler.roll.toFixed(1)}`;

            if (currentMetric) {
                dom.adminQuestionId.textContent = `Q${currentMetric.id}`;
                dom.adminQuestionMeta.textContent = `泥대쪟 ${formatMs(currentMetric.visibleMs)} / Task AOI ${formatMs(currentMetric.taskMs)}`;
            } else {
                dom.adminQuestionId.textContent = "Q-";
                dom.adminQuestionMeta.textContent = "체류 0초 / Task AOI 0초";
            }

            dom.adminStatusText.textContent = currentAoi
                ? `?꾩옱 ?쒖꽑? ${currentAoi.zone === "task" ? "Task" : "Distract"} AOI濡?遺꾨쪟?⑸땲??`
                : "理쒓렐 WebGazer 醫뚰몴媛 ?놁뼱 AOI瑜??먯젙?섏? 紐삵뻽?듬땲??";

            dom.adminRawMetrics.innerHTML = `
                <div class="metric-chip"><span>?묐떟 ??/span><strong>${metrics.answeredCount}</strong></div>
                <div class="metric-chip"><span>Task AOI</span><strong>${Math.round(metrics.attentionRatio * 100)}%</strong></div>
                <div class="metric-chip"><span>Distract AOI</span><strong>${Math.round(metrics.awayRatio * 100)}%</strong></div>
                <div class="metric-chip"><span>AOI ?ъ쭊??/span><strong>${metrics.taskVisitTotal}</strong></div>
                <div class="metric-chip"><span>AOI Validity</span><strong>${environment.status}</strong></div>
                <div class="metric-chip"><span>?됯퇏 ?묐떟</span><strong>${(metrics.averageResponseMs / 1000).toFixed(1)}s</strong></div>
            `;
        };

        renderCptWebGazerResults = function renderCptWebGazerResults() {
            if (!dom.cptResWebgazerState) return;

            const summary = getWebGazerPhaseSummary("cpt");
            const { store, sample, firstSample, durationMs, validRatio, sampleRate, recentSamples } = summary;
            const faceSampleCount = cptMetrics?.faceSamples ?? 0;
            const taskWindow = cptMetrics?.taskMs ?? 0;
            const distractWindow = cptMetrics?.distractMs ?? 0;
            const gazeWindow = cptMetrics?.gazeTotalMs ?? 0;
            const taskVisits = cptMetrics?.taskVisitCount ?? 0;

            if (dom.cptResWebgazerPhase) {
                dom.cptResWebgazerPhase.textContent = "CPT";
            }
            dom.cptResWebgazerState.textContent = getWebGazerStatusLabel().toUpperCase();
            dom.cptResWebgazerSamples.textContent = String(store.validCount);
            dom.cptResWebgazerRaw.textContent = `raw ${store.rawCount} callbacks`;
            dom.cptResWebgazerCoords.textContent = formatWebGazerCoords(sample);
            dom.cptResWebgazerTime.textContent = formatWebGazerSampleAge(sample);
            dom.cptResWebgazerViewport.textContent = sample ? `${sample.width} x ${sample.height}` : `${window.innerWidth} x ${window.innerHeight}`;
            if (dom.cptResWebgazerWindow) {
                dom.cptResWebgazerWindow.textContent = formatWebGazerCaptureWindow(durationMs);
            }
            if (dom.cptResWebgazerCoverage) {
                dom.cptResWebgazerCoverage.textContent = `${validRatio}% valid / ${sampleRate.toFixed(1)} sps`;
            }
            if (dom.cptResWebgazerMetrics) {
                dom.cptResWebgazerMetrics.innerHTML = [
                    `?좏슚 ?섑뵆: ${store.validCount}`,
                    `Raw callbacks: ${store.rawCount}`,
                    `?섏쭛 援ш컙: ${formatWebGazerCaptureWindow(durationMs)}`,
                    `異붿젙 cadence: ${sampleRate.toFixed(1)} samples/s`,
                    `Face samples: ${faceSampleCount}`,
                    `Task AOI time: ${formatMs(taskWindow)}`,
                    `Distract AOI time: ${formatMs(distractWindow)}`,
                    `AOI observed time: ${formatMs(gazeWindow)}`,
                    `Task AOI visits: ${taskVisits}`,
                    `CPT gaze log rows: ${cptDataLog.length}`
                ].map((item) => `<div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">${item}</div>`).join("");
            }
            if (dom.cptResWebgazerRecent) {
                dom.cptResWebgazerRecent.innerHTML = recentSamples.length
                    ? recentSamples.map((entry, index) => {
                        const sampleNumber = store.validCount - index;
                        return `
                            <div class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <span class="font-bold text-slate-500">Sample ${sampleNumber}</span>
                                <span class="text-slate-900">${formatWebGazerCoords(entry)}</span>
                                <span class="text-slate-500">${formatWebGazerSampleOffset(entry, firstSample)}</span>
                            </div>
                        `;
                    }).join("")
                    : `<div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">??λ맂 gaze ?섑뵆???놁뒿?덈떎.</div>`;
            }
            drawWebGazerSamples(dom.cptWebgazerCanvas, "cpt");
        };

        predictCptWebcam = async function predictCptWebcam() {
            if (!cptWebcamRunning || !faceLandmarker) return;

            if (cptLastVideoTime !== dom.cptWebcam.currentTime) {
                cptLastVideoTime = dom.cptWebcam.currentTime;
                const now = performance.now();
                const result = faceLandmarker.detectForVideo(dom.cptWebcam, now);
                const landmarks = result?.faceLandmarks?.[0] ?? null;
                const matrix = result?.facialTransformationMatrixes?.[0]?.data ?? null;
                const blendshapes = result?.faceBlendshapes?.[0]?.categories ?? [];
                const blockMetric = cptMetrics.blockStats[cptCurrentBlock - 1] ?? null;
                const delta = cptMetrics.lastAoiTick === null ? 0 : Math.max(0, now - cptMetrics.lastAoiTick);
                const sample = getFreshWebGazerSample("cpt", now);
                const classification = sample ? getAoiClassification("cpt", sample) : null;

                cptMetrics.lastAoiTick = now;

                let yaw = 0;
                let pitch = 0;
                let roll = 0;
                let blink = 0;
                let headPoseState = "unclassified";

                if (landmarks) {
                    cptMetrics.faceSamples += 1;
                    blink = (safeBlendshapeScore(blendshapes, "eyeBlinkLeft") + safeBlendshapeScore(blendshapes, "eyeBlinkRight")) / 2;

                    if (cptGameState === "STIMULUS" && blink > 0.5) {
                        cptMetrics.blinksInStimulus += 1;
                    }

                    drawCptOverlay(landmarks);
                }

                if (matrix) {
                    const euler = matrixToEuler(matrix);
                    yaw = euler.yaw;
                    pitch = euler.pitch;
                    roll = euler.roll;
                    headPoseState = recordHeadPoseSample(cptMetrics, euler, now);
                }

                if (classification) {
                    applyAoiDelta(cptMetrics, classification, delta);
                    if (blockMetric) {
                        applyAoiDelta(blockMetric, classification, delta);
                    }
                } else {
                    resetAoiZone(cptMetrics);
                    if (blockMetric) {
                        resetAoiZone(blockMetric);
                    }
                }

                const attentiveRatio = Math.round((cptMetrics.taskMs / Math.max(1, cptMetrics.gazeTotalMs)) * 100) || 0;
                dom.cptLiveAttentive.textContent = `${attentiveRatio}%`;
                dom.cptBarAttentive.style.width = `${attentiveRatio}%`;
                dom.cptLiveYaw.textContent = yaw.toFixed(1) + " deg";
                dom.cptYawCursor.style.left = `${clamp(50 + yaw, 0, 100)}%`;
                dom.cptIndicatorGaze.style.backgroundColor = classification?.zone === "task" ? "#22c55e" : "#ef4444";
                dom.cptIndicatorHead.style.backgroundColor = headPoseState === "forward" ? "#22c55e" : "#ef4444";

                cptDataLog.push({
                    t: now,
                    block: cptCurrentBlock,
                    trial: cptOverallTrialCount,
                    gaze: sample ? {
                        x: Number(sample.x.toFixed(2)),
                        y: Number(sample.y.toFixed(2))
                    } : null,
                    aoi: classification?.zone ?? "unclassified",
                    insideViewport: sample?.insideViewport ?? null,
                    yaw: Number(yaw.toFixed(3)),
                    pitch: Number(pitch.toFixed(3)),
                    roll: Number(roll.toFixed(3)),
                    headPoseState,
                    blink: Number(blink.toFixed(4))
                });
            }

            requestAnimationFrame(predictCptWebcam);
        };

        finishCpt = function finishCpt() {
            stopCptCamera();
            stopWebGazer();
            cptGameState = "FINISHED";
            showResultsExperience();
            dom.cptResTimestamp.textContent = new Date().toLocaleString("ko-KR");

            const totalTargets = cptMetrics.hits + cptMetrics.omits;
            const totalNonTargets = CPT_TOTAL_TRIALS - totalTargets;
            const omissionRate = Math.round((cptMetrics.omits / Math.max(1, totalTargets)) * 100) || 0;
            const commissionRate = Math.round((cptMetrics.commission / Math.max(1, totalNonTargets)) * 100) || 0;
            const rtMean = cptMetrics.rts.reduce((sum, value) => sum + value, 0) / Math.max(1, cptMetrics.rts.length);
            const rtVariance = cptMetrics.rts.reduce((sum, value) => sum + Math.pow(value - rtMean, 2), 0) / Math.max(1, cptMetrics.rts.length);
            const rtSD = Math.round(Math.sqrt(rtVariance)) || 0;
            const distractScale = Math.round((cptMetrics.distractMs / Math.max(1, cptMetrics.gazeTotalMs)) * 100) || 0;
            const headPoseSummary = summarizeHeadPoseMetrics(cptMetrics);

            cptMetrics.headPoseSummary = headPoseSummary;
            cptMetrics.headMovementVariance = headPoseSummary.rotationVariability;

            dom.cptResOmissionRate.textContent = String(omissionRate);
            dom.cptResCommissionRate.textContent = String(commissionRate);
            dom.cptResRtSd.textContent = String(rtSD);
            dom.cptResDistraction.textContent = String(distractScale);

            dom.cptBlockAnalysis?.replaceChildren();
            if (dom.cptBlockAnalysis) {
                dom.cptBlockAnalysis.innerHTML = cptMetrics.blockStats.map((block, index) => {
                    const ratioValue = Math.round((block.distractMs / Math.max(1, block.gazeTotalMs)) * 100) || 0;
                    return `
                        <div class="flex items-center justify-between bg-slate-900 p-3 rounded-2xl border border-slate-800">
                            <span class="text-xs text-slate-400">Block ${index + 1} (${getCptBlockType(index + 1).split(" ")[0]})</span>
                            <div class="flex items-center gap-4">
                                <span class="text-[10px] text-slate-500">Distractibility: ${ratioValue}%</span>
                                <div class="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden"><div class="h-full bg-blue-500" style="width:${ratioValue}%"></div></div>
                            </div>
                        </div>
                    `;
                }).join("");
            }

            let interpretation = "";
            if (omissionRate > 15) interpretation += "<p>주의 유지 어려움: 목표 자극에 대한 반응 누락이 높게 나타났습니다. 지속적인 주의 유지가 어려웠을 가능성을 참고할 수 있습니다.</p>";
            if (commissionRate > 15) interpretation += "<p>충동 반응 경향: 목표가 아닌 자극에 반응한 비율이 높게 나타났습니다. 반응 억제의 어려움을 참고할 수 있습니다.</p>";
            if (rtSD > 150) interpretation += "<p>반응 시간 변동성 증가: 반응 시간이 일정하지 않아 주의 안정성이 흔들렸을 가능성이 있습니다.</p>";

            const baselineDist = Math.round((cptMetrics.blockStats[0].distractMs / Math.max(1, cptMetrics.blockStats[0].gazeTotalMs)) * 100) || 0;
            const visualDist = Math.round((cptMetrics.blockStats[1].distractMs / Math.max(1, cptMetrics.blockStats[1].gazeTotalMs)) * 100) || 0;
            if (visualDist > baselineDist + 10) {
                interpretation += `<p>시각 방해 구간에서 Task AOI 밖으로 시선이 벗어난 비율이 기준 구간보다 ${visualDist - baselineDist}%p 증가했습니다.</p>`;
            }

            if (headPoseSummary.forwardRatio < 80) {
                interpretation += `<p>머리 자세 정면 유지 비율은 ${headPoseSummary.forwardRatio}%로 나타났습니다. 과제 중 시선뿐 아니라 머리 방향도 자주 바뀌었을 가능성을 함께 참고할 수 있습니다.</p>`;
            }

            if (headPoseSummary.rotationVariability > 12) {
                interpretation += `<p>머리 회전 변동성은 ${headPoseSummary.rotationVariability}로 계산되었습니다. 좌우 또는 상하 머리 회전의 일관성이 낮아 집중 상태가 흔들렸을 가능성을 보조적으로 해석할 수 있습니다.</p>`;
            }

            if (headPoseSummary.attentionScoreAdjusted < 65) {
                interpretation += `<p>머리 자세 기반 보정 집중도는 ${headPoseSummary.attentionScoreAdjusted}로 나타났습니다. 정면 유지 비율과 회전 변동성을 함께 보면 과제 몰입이 충분히 안정적이지 않았을 수 있습니다.</p>`;
            }

            if (!interpretation) {
                interpretation = "<p>과제 수행 동안 반응 통제와 AOI 기반 주의 배분 지표가 비교적 안정적으로 유지되었습니다.</p>";
            }

            dom.cptInterpretationText.innerHTML = interpretation;
            renderCptWebGazerResults();

            window.cptAnalytics = {
                exportedAt: new Date().toISOString(),
                surveyAnalytics: window.surveyAnalytics ?? null,
                environment: getAoiEnvironmentSnapshot(),
                webgazer: exportWebGazerData(),
                metrics: cptMetrics,
                logs: cptDataLog,
                events: cptEventHistory,
                report: interpretation
            };
            window.cptMetricsData = buildCptReportPayload();
            console.log('CPT FINISHED');
            
            // 踰꾪듉 異붽? (?ㅼ쓬 ?깆뿉???ㅽ뻾?섏뿬 DOM???낅뜲?댄듃???뚭퉴吏 ?湲?
            setTimeout(() => {
                addReportGenerationButton();
            }, 100);
            
        };

        async function sendAnalyticsToServer() {
            try {
                const dbPayload = {
                    ...buildCptReportPayload(),
                    final_risk_level: window.cptAnalytics?.finalRiskLevel ?? null,
                    report: window.cptAnalytics?.report ?? null,
                    raw: window.cptAnalytics
                };
                console.log('metrics:', window.cptAnalytics?.metrics || {});
                console.log('DB PAYLOAD:', dbPayload);
                console.log('SENDING ANALYTICS');

                const res = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dbPayload)
                });

                if (!res.ok) {
                    console.error('Failed to save CPT analytics', await res.text());
                        alert("검사 데이터 저장에 실패했습니다.");
                } else {
                    const responseData = await res.json();
                    console.log('CPT analytics saved to /api/analyze', responseData);
                    const resultId = responseData.data?.id || responseData.id;
                    if (resultId) {
                        window.cptResultId = resultId;
                        window.cptMetricsData = dbPayload;
                        console.log('CPT result ID saved:', resultId);
                    }
                }
            } catch (err) {
                console.error('Error sending CPT analytics', err);
                alert("리포트 저장 중 오류가 발생했습니다: " + String(err));
            }
        }

        function attachEvents() {
            document.querySelectorAll('input[type="radio"]').forEach((input) => {
                input.addEventListener("change", onAnswerChange);
            });

            dom.nextBtn?.addEventListener("click", (event) => {
                event.preventDefault();
                syncAnswersFromDom();
                if (getAnsweredCount(1) < questionsPart1.length) {
                    scrollToFirstUnanswered(1);
                    return;
                }
                setStep(2, { focusStepTarget: true });
                ensureCameraStarted();
            });

            dom.prevBtn?.addEventListener("click", (event) => {
                event.preventDefault();
                setStep(1, { focusStepTarget: true });
            });
            dom.submitBtn?.addEventListener("click", (event) => {
                event.preventDefault();
                syncAnswersFromDom();
                if (getAnsweredCount(2) < questionsPart2.length) {
                    scrollToFirstUnanswered(2);
                    return;
                }
                goToStep3();
            });
            dom.restartSummaryBtn?.addEventListener("click", (event) => {
                event.preventDefault();
                setStep(2, { focusStepTarget: true });
            });
            dom.toggleAdminBtn?.addEventListener("click", () => setAdminPanel(!adminPanelOpen));
            dom.refreshAdminBtn?.addEventListener("click", renderAdminPanel);
            dom.resultsAdminBtn?.addEventListener("click", showAdminExperience);
            dom.adminBackBtn?.addEventListener("click", showResultsExperience);
            dom.adminDebugCenterBtn?.addEventListener("click", () => setAdminDebugTarget(0.5, 0.5, "?쇳꽣 怨좎젙"));
            dom.adminDebugRandomBtn?.addEventListener("click", randomizeAdminDebugTarget);
            dom.adminDebugSurface?.addEventListener("click", (event) => {
                const rect = dom.adminDebugSurface.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const xRatio = (event.clientX - rect.left) / rect.width;
                const yRatio = (event.clientY - rect.top) / rect.height;
                setAdminDebugTarget(xRatio, yRatio, "직접 지정");
            });
            dom.startCptBtn?.addEventListener("click", showCptExperience);
            dom.cptStartBtn?.addEventListener("click", startCptSession);
            dom.cptRestartBtn?.addEventListener("click", () => location.reload());
            dom.cptDownloadRaw?.addEventListener("click", downloadCptRawData);
            dom.environmentContinueBtn?.addEventListener("click", completeEnvironmentCheck);
            dom.environmentCloseBtn?.addEventListener("click", () => closeEnvironmentCheck({ keepCamera: false, emitCancel: true }));
            dom.calibrationStartBtn?.addEventListener("click", startCalibrationSequence);
            dom.calibrationResetBtn?.addEventListener("click", restartCalibrationSequence);
            dom.calibrationContinueBtn?.addEventListener("click", finalizeCalibrationSequence);
            dom.calibrationCloseBtn?.addEventListener("click", () => closeCalibration({ keepCamera: false }));
            dom.calibrationControlDragHandle?.addEventListener("mousedown", beginCalibrationPanelDrag);
            dom.calibrationPointsLayer?.addEventListener("pointerdown", (event) => {
                const button = event.target.closest("[data-calibration-point]");
                handleCalibrationPointSelection(button, event);
            });

            window.addEventListener("scroll", () => setActiveQuestion(performance.now()), { passive: true });
            window.addEventListener("resize", () => {
                if (aoiEnvironmentState.startedAt) {
                    syncAoiEnvironmentState({ resizeDetected: true });
                }
                setActiveQuestion(performance.now());
                renderEnvironmentCheck();
                renderCalibrationOverlay();
                renderWebGazerAdmin();
                renderCptWebGazerLive();
                renderCptWebGazerResults();
                renderAdminExperience();
                renderAdminLiveDebug();
            });
            document.addEventListener("fullscreenchange", () => {
                if (aoiEnvironmentState.startedAt && !document.fullscreenElement) {
                    syncAoiEnvironmentState({ fullscreenExited: true });
                } else if (aoiEnvironmentState.startedAt) {
                    syncAoiEnvironmentState();
                }
                renderEnvironmentCheck();
                renderAdminExperience();
            });
            window.addEventListener("mousemove", handleCalibrationMouseMove, { passive: true });
            window.addEventListener("mouseup", stopCalibrationPanelDrag);
            window.addEventListener("keydown", handleCptKeydown);
            window.addEventListener("beforeunload", () => {
                stopCamera();
                stopCptCamera();
                stopWebGazer();
            });
        }

        function init() {
            demosSection = document.getElementById("demos");
            imageBlendShapes = document.getElementById("image-blend-shapes");
            videoBlendShapes = document.getElementById("video-blend-shapes");

            video = document.getElementById("webcam");
            canvasElement = document.getElementById("output_canvas");
            canvasCtx = canvasElement?.getContext("2d");

            cacheDomElements();

            const imageContainers = document.getElementsByClassName("detectOnClick");
            for (const imageContainer of imageContainers) {
                const img = imageContainer.children[0];
                if (img) img.addEventListener("click", handleClick);
            }

            renderQuestions("part1-questions", questionsPart1, 0);
            renderQuestions("part2-questions", questionsPart2, questionsPart1.length);
            registerSurveyControls();
            attachEvents();
            setExperienceView("survey");
            setStep(1, { skipScroll: true });
            updateProgress();
            resetCptState();
            updateCptLoadingStatus("Model loading...", false);
            renderWebGazerAdmin();
            renderCptWebGazerLive();
            renderCptWebGazerResults();
            renderCalibrationOverlay();
            renderAdminLiveDebug();
            createFaceLandmarker();
            requestAnimationFrame(surveyLoop);
        }

        // ===== 由ы룷???앹꽦 愿???⑥닔 =====

        function buildHeadPosePayload(metrics) {
            const headPoseSummary = metrics?.headPoseSummary ?? summarizeHeadPoseMetrics(metrics);
            const headPose = metrics?.headPose ?? null;
            const hasHeadPoseMeasurement = Boolean(
                headPose && Number(headPoseSummary?.totalFrames) > 0
            );

            if (!hasHeadPoseMeasurement) {
                return {
                    head_movement_variability: null,
                    head_pose_forward_ratio: null,
                    head_pose_left_ratio: null,
                    head_pose_right_ratio: null,
                    head_pose_down_ratio: null,
                    head_yaw_std: null,
                    head_pitch_std: null,
                    head_roll_std: null,
                    head_rotation_variability: null,
                    head_attention_score: null,
                    head_attention_score_adjusted: null,
                    head_pose_raw: null
                };
            }

            return {
                head_movement_variability: headPoseSummary.rotationVariability ?? 0,
                head_pose_forward_ratio: headPoseSummary.forwardRatio ?? 0,
                head_pose_left_ratio: headPoseSummary.leftRatio ?? 0,
                head_pose_right_ratio: headPoseSummary.rightRatio ?? 0,
                head_pose_down_ratio: headPoseSummary.downRatio ?? 0,
                head_yaw_std: headPoseSummary.yawStd ?? 0,
                head_pitch_std: headPoseSummary.pitchStd ?? 0,
                head_roll_std: headPoseSummary.rollStd ?? 0,
                head_rotation_variability: headPoseSummary.rotationVariability ?? 0,
                head_attention_score: headPoseSummary.attentionScore ?? 0,
                head_attention_score_adjusted: headPoseSummary.attentionScoreAdjusted ?? 0,
                head_pose_raw: headPose ? {
                    thresholds: headPose.thresholds,
                    totalFrames: headPoseSummary.totalFrames ?? 0,
                    stateCounts: {
                        forward: headPose.forwardFrames ?? 0,
                        left: headPose.leftFrames ?? 0,
                        right: headPose.rightFrames ?? 0,
                        down: headPose.downFrames ?? 0,
                        unclassified: headPose.unclassifiedFrames ?? 0
                    },
                    latestState: headPoseSummary.latestState ?? "unclassified",
                    sessionMaxVariability: headPoseSummary.sessionMaxVariability ?? 0,
                    angularVelocityMean: headPoseSummary.angularVelocityMean ?? 0,
                    angularVelocityStd: headPoseSummary.angularVelocityStd ?? 0
                } : null
            };
        }

        function buildCptReportPayload() {
            const metrics = window.cptAnalytics?.metrics || cptMetrics || {};
            const avgRt = metrics.rts?.length
                ? Math.round(metrics.rts.reduce((a, b) => a + b, 0) / metrics.rts.length)
                : 0;

            return {
                inattention_count: metrics.omits ?? 0,
                hyperactivity_count: metrics.hyperactivity ?? 0,
                cpt_attention: metrics.hits ?? 0,
                cpt_timeliness: avgRt,
                cpt_impulsivity: metrics.commission ?? 0,
                cpt_hyperactivity: metrics.hyperactivity ?? 0,
                gaze_off_task_ratio: metrics.gazeTotalMs > 0
                    ? Number(((metrics.distractMs / metrics.gazeTotalMs) * 100).toFixed(2))
                    : null,
                ...buildHeadPosePayload(metrics),
                final_risk_level: window.cptAnalytics?.finalRiskLevel ?? "분석 완료"
            };
        }
        async function generateReport() {
            return generateReportFromCptResult();
        }
        
        function addReportGenerationButton() {
            const existingBtn = document.getElementById('generateReportBtn');
            if (existingBtn) {
                console.log('Button already exists');
                return;
            }
            
            const resultContainer = document.querySelector('[id^="step"]');
            if (!resultContainer) {
                console.warn('Result container not found');
                return;
            }
            
            const btn = document.createElement('button');
            btn.id = 'generateReportBtn';
            btn.textContent = '리포트 생성';
            btn.style.cssText = `
                margin-top: 24px;
                padding: 12px 24px;
                background-color: #1f2937;
                color: white;
                border: none;
                border-radius: 24px;
                font-size: 14px;
                font-weight: 700;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            btn.onmouseover = () => {
                btn.style.backgroundColor = '#111827';
                btn.style.transform = 'scale(1.02)';
            };
            btn.onmouseout = () => {
                btn.style.backgroundColor = '#1f2937';
                btn.style.transform = 'scale(1)';
            };
            
            btn.addEventListener('click', generateReport);
            
            // 寃곌낵 而⑦뀒?대꼫??留덉?留됱뿉 踰꾪듉 異붽?
            resultContainer.appendChild(btn);
            console.log('Report generation button added');
        }

        async function generateReportFromCptResult() {
            const payload = {
                ...(window.cptMetricsData || {}),
                ...buildCptReportPayload()
            };
            if (!payload) {
                alert('CPT 데이터가 없습니다. 검사를 완료한 뒤 다시 시도해 주세요.');
                return;
            }

            const btn = document.getElementById('generateReportBtn');
            if (btn) {
                btn.disabled = true;
                btn.textContent = '리포트 생성 중...';
            }

            try {
                const response = await fetch('/api/generate-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    const stage = data.stage ? `[${data.stage}] ` : '';
                    throw new Error(stage + (data.error || '리포트 생성 실패'));
                }

                const reportId = data.data?.id || data.id;
                if (!reportId) {
                    throw new Error('생성된 리포트 ID를 받지 못했습니다.');
                }
                window.location.href = `/report/${reportId}`;
            } catch (err) {
                console.error('Report generation error:', err);
                alert("리포트 저장 중 오류가 발생했습니다: " + String(err));
                if (btn) {
                    btn.disabled = false;
                btn.textContent = '리포트 생성';
                }
            }
        }

        addReportGenerationButton = function addReportGenerationButton() {
            if (document.getElementById('generateReportBtn')) {
                return;
            }

            const resultActions = document.getElementById('result-report-actions')
                || dom.cptRestartBtn?.parentElement;
            if (!resultActions) {
                console.warn('CPT result action container not found');
                return;
            }

            const btn = document.createElement('button');
            btn.id = 'generateReportBtn';
            btn.type = 'button';
            btn.textContent = '리포트 생성';
            btn.className = 'flex-1 rounded-full bg-blue-600 px-8 py-5 text-base font-black text-white shadow-[0_18px_36px_rgba(63,109,246,0.24)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:text-lg';
            btn.addEventListener('click', generateReportFromCptResult);

            resultActions.appendChild(btn);
            console.log('Report generation button added');
        };

        // Clean Korean UI overrides. Some legacy strings in this file were saved with
        // broken encoding, so keep the user-facing copy here in one UTF-8-safe place.
        function applyCleanKoreanCopy() {
            const cleanPart1 = [
                "마무리해야 하는 여러 작업에서 실수가 생기거나 세부사항을 놓치는 일이 얼마나 자주 있습니까?",
                "여러 단계가 필요한 일을 할 때 순서를 정리하거나 체계적으로 진행하기 어려운 경우가 얼마나 자주 있습니까?",
                "회의 일정, 약속, 제출 기한 같은 일상적인 일을 잊어버리는 경우가 얼마나 자주 있습니까?",
                "오래 집중해야 하는 과제를 앞두고 시작을 미루거나 다른 일을 먼저 하는 경우가 얼마나 자주 있습니까?",
                "지루하거나 반복적인 일을 할 때 주의 부족으로 실수를 하거나 확인을 놓치는 경우가 얼마나 자주 있습니까?",
                "오래 집중해야 하는 작업 중 다른 생각으로 자주 흐름이 끊기는 경우가 얼마나 자주 있습니까?",
                "상대가 직접 이야기하고 있어도 말의 내용을 끝까지 집중해서 듣기 어려운 경우가 얼마나 자주 있습니까?",
                "지갑, 휴대폰, 열쇠처럼 자주 쓰는 물건을 어디에 두었는지 잊거나 찾는 데 오래 걸리는 경우가 얼마나 자주 있습니까?",
                "주변 소리, 사람의 움직임, 알림 같은 자극 때문에 하던 일에서 쉽게 벗어나는 경우가 얼마나 자주 있습니까?"
            ];

            const cleanPart2 = [
                "수업, 회의, 대기 상황처럼 오래 앉아 있어야 할 때 손발을 움직이거나 자세를 자주 바꾸는 경우가 얼마나 자주 있습니까?",
                "앉아 있어야 하는 상황에서 중간에 일어나거나 자리를 벗어나고 싶은 충동을 느끼는 경우가 얼마나 자주 있습니까?",
                "가만히 있어야 하는 상황에서도 몸을 계속 움직이거나 불편해서 안정되지 못하는 경우가 얼마나 자주 있습니까?",
                "쉬는 시간이나 여유가 있을 때에도 긴장을 풀지 못하고 계속 무언가를 해야 할 것 같은 경우가 얼마나 자주 있습니까?",
                "친구나 사람들과 대화할 때 말이 많아지거나 상대보다 더 많이 이야기하게 되는 경우가 얼마나 자주 있습니까?",
                "상대방이 말을 끝내기 전에 내용을 예상하고 먼저 말하거나 끼어드는 경우가 얼마나 자주 있습니까?",
                "줄을 서거나 순서를 기다려야 하는 상황에서 끝까지 기다리기 어려운 경우가 얼마나 자주 있습니까?",
                "다른 사람이 집중해서 일을 하고 있을 때 상황을 고려하지 않고 말이나 행동으로 방해하는 경우가 얼마나 자주 있습니까?"
            ];

            questionsPart1.splice(0, questionsPart1.length, ...cleanPart1);
            questionsPart2.splice(0, questionsPart2.length, ...cleanPart2);

            function normalizeCalibrationCopy() {
                if (dom.calibrationSummary) {
                    dom.calibrationSummary.textContent = "화면 가장자리 점들을 먼저 다섯 번씩 클릭하고, 마지막에 중앙 점까지 완료하면 실제 시선 추적을 시작합니다.";
                }
                if (dom.calibrationStartBtn && calibrationState?.phase === "intro") {
                    dom.calibrationStartBtn.textContent = calibrationState.preparing || webgazerBooting ? "준비 중" : "보정 시작";
                }
                if (dom.calibrationMiniSummary) {
                    dom.calibrationMiniSummary.textContent = "외곽 점을 먼저 다섯 번씩 클릭해 주세요.";
                }
                if (dom.calibrationInstructionText && calibrationState?.phase === "intro") {
                    dom.calibrationInstructionText.textContent = "각 점을 다섯 번씩 클릭하면 노란색으로 바뀌고, 외곽 점이 끝나면 중앙 점이 나타납니다.";
                }
            }

        buildFriendlySummary = function buildFriendlySummary() {
            const metrics = aggregateMetrics();
            const screening = typeof getSurveyScreeningBreakdown === "function" ? getSurveyScreeningBreakdown() : null;
            const focusScore = clamp(Math.round((metrics.attentionRatio || 0) * 100), 0, 100);
            const distractScore = clamp(100 - Math.round((metrics.awayRatio || 0) * 100), 0, 100);
            const responseSeconds = (metrics.averageResponseMs / 1000).toFixed(1);
            const cptHeadPoseSummary = cptMetrics?.faceSamples
                ? (cptMetrics.headPoseSummary ?? summarizeHeadPoseMetrics(cptMetrics))
                : null;
            const movementPenalty = cptHeadPoseSummary
                ? Math.round(
                    (cptHeadPoseSummary.rotationVariability * 3.2)
                    + Math.max(0, 85 - cptHeadPoseSummary.forwardRatio) * 0.9
                    + Math.max(0, 75 - cptHeadPoseSummary.attentionScoreAdjusted) * 0.8
                )
                : Math.round((metrics.headMotionStd || 0) * 6);
            const movementScore = clamp(100 - movementPenalty, 0, 100);

            return {
                cards: [
                        {
                            title: "설문 판정",
                            score: screening?.screeningPositive ? 100 : 0,
                            valueLabel: screening?.screeningPositive ? "주의 필요" : "기준 미충족",
                            hint: screening
                                ? `Part 1 고위험 응답 ${screening.part1.highCount}개, Part 2 고위험 응답 ${screening.part2.highCount}개입니다.`
                                : "설문 응답을 기준으로 판정했습니다.",
                            desc: "각 파트에서 3점 이상 문항이 5개 이상이면 주의가 필요한 결과로 봅니다.",
                            bucket: {
                                tone: screening?.screeningPositive ? "주의 필요" : "안정",
                                color: screening?.screeningPositive ? "text-rose-600" : "text-emerald-600"
                            }
                        },
                        {
                            title: "Task AOI 집중",
                            score: focusScore,
                            hint: `유효 시선 시간 중 ${focusScore}%가 현재 문항 영역에 머물렀습니다.`,
                            desc: "문항을 보는 동안 시선이 과제 영역에 얼마나 안정적으로 머물렀는지 요약한 값입니다."
                        },
                        {
                            title: "응답 속도",
                            score: clamp(100 - Math.round(metrics.rapidCount * 10), 0, 100),
                            hint: `평균 응답 시간은 ${responseSeconds}초입니다.`,
                            desc: "너무 빠른 응답이 반복되면 문항을 충분히 읽지 않았을 가능성을 참고합니다."
                        },
                        {
                            title: "머리 자세 안정성",
                            score: movementScore,
                            hint: cptHeadPoseSummary
                                ? `정면 유지 ${Math.round(cptHeadPoseSummary.forwardRatio)}%, 회전 변동성 ${cptHeadPoseSummary.rotationVariability}, 보정 집중도 ${cptHeadPoseSummary.attentionScoreAdjusted}입니다.`
                                : `머리 움직임 변동성 지표는 ${(metrics.headMotionStd || 0).toFixed(1)}입니다.`,
                            desc: cptHeadPoseSummary
                                ? "CPT 중 머리 회전 변동성과 정면 유지 비율을 함께 반영한 안정성 지표입니다."
                                : "검사 중 머리 움직임의 변동성을 보조 지표로 확인합니다."
                        },
                        {
                            title: "주의 분산",
                            score: distractScore,
                            hint: `Task AOI 밖에 머문 비율은 ${Math.round((metrics.awayRatio || 0) * 100)}%입니다.`,
                            desc: "문항 영역 밖으로 시선이 벗어난 정도를 참고합니다."
                        }
                    ],
                    notes: [
                        "이 결과는 진단이 아니라 스크리닝 참고 자료입니다.",
                        "카메라 권한이나 조명 상태가 좋지 않으면 시선 기반 지표의 신뢰도가 낮아질 수 있습니다.",
                        `총 ${metrics.answeredCount}개 문항 응답을 바탕으로 요약했습니다.`
                    ],
                    raw: { metrics, screening }
                };
            };

            renderSummary = function renderSummary() {
                const summary = buildFriendlySummary();
                if (dom.summaryIntro) {
                    dom.summaryIntro.textContent = "문항 점수와 시선 기반 지표를 함께 요약했습니다. 이 결과는 참고용 행동 지표이며 진단을 대체하지 않습니다.";
                }
                if (typeof renderSurveyScreeningBreakdown === "function") {
                    renderSurveyScreeningBreakdown(summary.raw.screening);
                }
                if (dom.summaryCards) {
                    dom.summaryCards.innerHTML = summary.cards.map((card) => {
                        const rawBucket = card.bucket ?? metricBucket(card.score, { reverse: !!card.reverseTone });
                        const bucket = {
                            ...rawBucket,
                            tone: card.reverseTone
                                ? (card.score >= 55 ? "\uB192\uC74C" : card.score >= 25 ? "\uC911\uAC04" : "\uB0AE\uC74C")
                                : (card.score >= 75 ? "\uC548\uC815" : card.score >= 45 ? "\uBCF4\uD1B5" : "\uC8FC\uC758 \uD544\uC694")
                        };
                        const valueMarkup = card.valueLabel
                            ? `<p class="mt-3 text-4xl font-black text-slate-900">${card.valueLabel}</p>`
                            : `<p class="mt-3 text-4xl font-black text-slate-900">${card.score}<span class="text-2xl">점</span></p>`;
                        return `
                            <div class="summary-card rounded-[2rem] p-7">
                                <p class="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">${card.title}</p>
                                ${valueMarkup}
                                <p class="mt-2 text-sm font-black ${bucket.color}">${bucket.tone}</p>
                                <p class="mt-4 text-sm font-bold leading-6 text-slate-600">${card.hint}</p>
                                <p class="mt-3 text-xs leading-5 text-slate-400">${card.desc}</p>
                            </div>
                        `;
                    }).join("");
                }
                if (dom.summaryHighlights) {
                    dom.summaryHighlights.innerHTML = summary.notes.map((note) => `
                        <div class="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">${note}</div>
                    `).join("");
                }
                window.surveyAnalytics = {
                    exportedAt: new Date().toISOString(),
                    cameraState: analytics.cameraState,
                    webgazer: exportWebGazerData(),
                    summary,
                    questions: analytics.questions.map((metric) => ({
                        id: metric.id,
                        part: metric.part,
                        question: metric.question,
                        answerValue: metric.answerValue,
                        visibleMs: Number(metric.visibleMs.toFixed(1)),
                        gazeTotalMs: Number(metric.gazeTotalMs.toFixed(1)),
                        taskMs: Number(metric.taskMs.toFixed(1)),
                        distractMs: Number(metric.distractMs.toFixed(1)),
                        responseMs: metric.responseMs === null ? null : Number(metric.responseMs.toFixed(1)),
                        rapidResponse: metric.rapidResponse,
                        taskVisitCount: metric.taskVisitCount,
                        revisitCount: Math.max(0, metric.activationCount - 1)
                    }))
                };
            };

            renderSurveyScreeningBreakdown = function renderSurveyScreeningBreakdown(screening) {
                if (!dom.summaryScreeningBreakdown || !screening) return;
                const renderPartCard = (title, subtitle, part) => `
                    <div class="summary-card rounded-[2rem] border border-slate-200 p-7">
                        <p class="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">${title}</p>
                        <h3 class="mt-2 text-2xl font-black text-slate-900">${subtitle}</h3>
                        <p class="mt-4 text-sm leading-6 text-slate-600">3점 이상 응답: <strong>${part.highCount}개</strong></p>
                        <p class="mt-2 text-sm leading-6 text-slate-600">가장 많은 응답: <strong>${part.dominantLabel} (${part.dominantScore}점)</strong></p>
                        <p class="mt-2 text-sm leading-6 text-slate-600">응답 완료 문항: <strong>${part.answeredCount}개</strong></p>
                    </div>
                `;
                dom.summaryScreeningBreakdown.innerHTML = `
                    <div class="summary-card rounded-[2rem] border border-blue-100 bg-blue-50/70 p-7">
                        <p class="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600">Screening</p>
                        <h3 class="mt-2 text-2xl font-black text-slate-900">설문 기준 판정</h3>
                        <p class="mt-3 text-4xl font-black text-slate-900">${screening.screeningPositive ? "주의 필요" : "기준 미충족"}</p>
                        <span class="text-sm font-black ${screening.screeningPositive ? "text-rose-600" : "text-emerald-600"}">${screening.screeningPositive ? "추가 확인 권장" : "스크리닝 기준 미충족"}</span>
                    </div>
                    ${renderPartCard("Part 1", "부주의", screening.part1)}
                    ${renderPartCard("Part 2", "충동성과 과활동", screening.part2)}
                `;
            };

            renderCalibrationOverlay = function renderCalibrationOverlay() {
                if (!dom.calibrationOverlay) return;

                if (!calibrationState.open) {
                    dom.calibrationOverlay.classList.add("hidden");
                    dom.calibrationOverlay.setAttribute("aria-hidden", "true");
                    if (dom.calibrationPointsLayer) dom.calibrationPointsLayer.innerHTML = "";
                    dom.calibrationCursorDot?.classList.add("hidden");
                    return;
                }

                const stats = getCalibrationStats();
                const engineLabel = calibrationState.preparing || webgazerBooting ? "Model loading" : "WebGazer ready";
                const faceLabel = latestFaceSample?.present ? "Face detected" : "Face waiting";
                let statusLabel = "Calibration";
                let summary = "화면 가장자리 점들을 먼저 다섯 번씩 클릭하고, 마지막에 중앙 점까지 완료하면 실제 시선 추적을 시작합니다.";
                let miniSummary = "외곽 점을 먼저 클릭해 주세요.";
                let instruction = "빨간 점을 정확히 보고 다섯 번 클릭해 주세요.";

                if (calibrationState.error === "engine_unavailable") {
                    statusLabel = "Setup needed";
                    summary = "WebGazer를 시작하지 못했습니다. 카메라 권한과 얼굴 위치를 확인한 뒤 다시 시도해 주세요.";
                    miniSummary = summary;
                    instruction = "카메라 권한을 허용한 뒤 다시 시도해 주세요.";
                } else if (calibrationState.preparing || webgazerBooting) {
                    statusLabel = "Preparing";
                    summary = "보정 엔진을 준비하고 있습니다. 카메라가 안정화되면 보정을 시작할 수 있습니다.";
                    miniSummary = "잠시만 기다려 주세요.";
                    instruction = "모델 로딩이 끝나면 시작할 수 있습니다.";
                } else if (calibrationState.phase === "active") {
                    statusLabel = "Click points";
                    summary = "빨간 점을 클릭할수록 점이 진해지고, 다섯 번째 클릭에서 노란색으로 고정됩니다.";
                    miniSummary = stats.outerComplete
                        ? "중앙 점을 다섯 번 클릭하면 보정이 완료됩니다."
                        : "외곽 점을 먼저 다섯 번씩 클릭해 주세요.";
                    instruction = "점의 중앙을 바라보면서 클릭해 주세요.";
                } else if (calibrationState.phase === "review") {
                    statusLabel = "Review";
                    summary = "노란 추적 점이 시선 움직임을 자연스럽게 따라오는지 확인해 주세요.";
                    miniSummary = "괜찮으면 계속 진행하고, 불안정하면 다시 보정을 눌러 주세요.";
                    instruction = "화면을 천천히 둘러보며 추적 상태를 확인해 주세요.";
                } else if (calibrationState.phase === "complete") {
                    statusLabel = "Complete";
                    summary = "모든 보정 점이 완료되었습니다. 이제 설문으로 넘어가 실제 시선 추적을 시작할 수 있습니다.";
                    miniSummary = "보정이 끝났습니다. 설문 시작 버튼을 눌러 주세요.";
                    instruction = "보정 완료 상태입니다.";
                }

                dom.calibrationOverlay.classList.remove("hidden");
                dom.calibrationOverlay.setAttribute("aria-hidden", "false");
                if (dom.calibrationEngineBadge) dom.calibrationEngineBadge.textContent = engineLabel;
                if (dom.calibrationFaceBadge) dom.calibrationFaceBadge.textContent = faceLabel;
                if (dom.calibrationStatusPill) dom.calibrationStatusPill.textContent = statusLabel;
                if (dom.calibrationProgressText) dom.calibrationProgressText.textContent = `${stats.totalClicks} / ${CALIBRATION_TOTAL_CLICKS}`;
                if (dom.calibrationSummary) dom.calibrationSummary.textContent = summary;
                if (dom.calibrationMiniSummary) dom.calibrationMiniSummary.textContent = miniSummary;
                if (dom.calibrationInstructionText) dom.calibrationInstructionText.textContent = instruction;
                if (dom.calibrationPanelTitle) dom.calibrationPanelTitle.textContent = calibrationState.phase === "review" ? "Review Tracking" : "Manual Calibration";
                if (dom.calibrationCompletedCount) dom.calibrationCompletedCount.textContent = `${stats.completedPoints} / ${CALIBRATION_POINT_LAYOUT.length}`;
                if (dom.calibrationClickCount) dom.calibrationClickCount.textContent = `${stats.totalClicks} / ${CALIBRATION_TOTAL_CLICKS}`;
                if (dom.calibrationStartBtn) {
                    dom.calibrationStartBtn.disabled = calibrationState.preparing || webgazerBooting;
                    dom.calibrationStartBtn.textContent = calibrationState.preparing || webgazerBooting ? "준비 중" : "보정 시작";
                }
                if (dom.calibrationContinueBtn) {
                    dom.calibrationContinueBtn.textContent = calibrationState.phase === "review" ? "계속 진행" : "설문 시작";
                }

                dom.calibrationIntroCard?.classList.toggle("hidden", calibrationState.phase !== "intro" && calibrationState.phase !== "complete");
                dom.calibrationControlPanel?.classList.toggle("hidden", calibrationState.phase === "intro" || calibrationState.phase === "complete");
                dom.calibrationContinueBtn?.classList.toggle("hidden", !(calibrationState.phase === "review" || calibrationState.phase === "complete"));
                renderCalibrationPoints();
                renderCalibrationReviewLayer();
                syncCalibrationPreviewStream();
                if (calibrationState.phase === "intro") {
                    normalizeCalibrationCopy();
                }
            };

            normalizeCalibrationCopy();
        }

        applyCleanKoreanCopy();

        if (document.readyState === "loading") {
            window.addEventListener("DOMContentLoaded", init);
        } else {
            init();
        }
