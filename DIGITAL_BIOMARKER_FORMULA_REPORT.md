# 디지털 바이오마커 시선/설문/CPT 계산식 보고서

## 1. 문서 목적

이 문서는 현재 코드 기준으로 디지털 바이오마커와 관련된 시선(AOI), 설문 결과 카드, 설문 판정, CPT 결과 분석에서 실제로 사용되는 계산식을 정리한 보고서다.

- 기준 소스: `public/script.js`
- 주의사항: 같은 파일 안에 예전 계산식이 남아 있고, 뒤쪽에서 함수가 다시 정의된다.
- 실제 최종 동작 기준:
  - 설문 AOI/시선 누적: `public/script.js:2781` 이후
  - 설문 요약/카드: `public/script.js:3552`, `public/script.js:3607`
  - 설문 판정 카드: `public/script.js:3355`, `public/script.js:3518`
  - CPT 최종 분석: `public/script.js:3722`, `public/script.js:3795`

즉, 보고서 본문은 "최종 활성 로직" 기준으로 정리했고, 파일에 남아 있는 이전 버전 식은 맨 뒤 부록에 따로 적었다.

## 2. 공통 보조 식

### 2.1 기본 비율 함수

출처: `public/script.js:500`

```text
ratio(numerator, denominator) = denominator > 0 ? numerator / denominator : 0
```

설명:
- 모든 비율 계산의 공통 분모 보호 식이다.
- 분모가 0이면 0으로 처리해서 `NaN`, `Infinity`를 막는다.

### 2.2 시간 표시 함수

출처: `public/script.js:504`

```text
formatMs(ms) = (ms / 1000).toFixed(1) + "초"
```

설명:
- 내부 계산은 ms 단위로 하지만, 화면 표시는 초 단위 문자열로 바꾼다.

### 2.3 범위 제한 함수

출처: `public/script.js:496`

```text
clamp(value, min, max) = min(max, max(min, value))
```

설명:
- 점수 카드에서 0점 미만, 100점 초과를 막을 때 사용한다.

## 3. WebGazer 수집 및 전체 시간 관련 식

### 3.1 유효 샘플 수집 간격

출처: `public/script.js:613`, `public/script.js:2940`

```text
WEBGAZER_SAMPLE_INTERVAL_MS = 80
if (now - lastAcceptedAt < 80ms) then ignore
```

설명:
- WebGazer raw callback이 너무 자주 오더라도 80ms보다 빠른 샘플은 버린다.
- 결과적으로 대략 초당 12.5개 정도의 유효 샘플 cadence를 기대하는 구조다.

### 3.2 최근 샘플 인정 조건

출처: `public/script.js:2868-2871`

```text
freshSample = (now - sample.t <= 650ms) ? sample : null
```

설명:
- 650ms보다 오래된 좌표는 현재 시선으로 보지 않는다.
- 즉, 시선 좌표가 잠깐 끊기면 그 시간은 AOI 판정에서 빠질 수 있다.

### 3.3 수집 구간 전체 시간

출처: `public/script.js:1145-1151`

```text
durationMs = firstSample && lastSample ? max(0, lastSample.t - firstSample.t) : 0
```

설명:
- 설문 단계나 CPT 단계에서 "얼마 동안 gaze 로그가 쌓였는지"를 의미한다.
- 이 값이 화면에서 `capture window`로 표시된다.

### 3.4 유효 샘플 비율

출처: `public/script.js:1150`

```text
validRatio(%) = round(validCount / max(1, rawCount) * 100)
```

설명:
- raw callback 대비 실제 좌표로 인정된 샘플 비율이다.
- 카메라 품질, 얼굴 인식 상태, 브라우저 상태 영향을 받는다.

### 3.5 샘플링 속도

출처: `public/script.js:1151`

```text
sampleRate(samples/s) = durationMs > 0 ? validCount / (durationMs / 1000) : 0
```

설명:
- 초당 몇 개의 유효 시선 샘플이 실제로 쌓였는지 보는 값이다.

### 3.6 전체 합산 시간

출처: `public/script.js:1463`

```text
totalDurationMs = surveySummary.durationMs + cptSummary.durationMs
```

설명:
- 관리자 화면에서 설문 + CPT 전체 수집 시간을 합산할 때 사용한다.

## 4. AOI 분류 기준

### 4.1 AOI 분류 식

출처: `public/script.js:2874-2884`

```text
insideViewport =
  sample.x >= 0 &&
  sample.x <= sample.width &&
  sample.y >= 0 &&
  sample.y <= sample.height

insideTask = insideViewport && isPointInsideRect(sample.x, sample.y, rect)

zone = insideTask ? "task" : "distract"
```

설명:
- Task AOI 안이면 `task`
- Task AOI 밖이면 `distract`
- 화면 밖도 결국 `distract`로 분류된다.

의미:
- 이 프로젝트의 시선 분석은 "정밀 fixation detection"보다는 "Task AOI 안/밖에 얼마나 머물렀는가"를 보는 구조다.

## 5. 설문 단계 시선/체류/응답 계산식

### 5.1 문항 노출 시간(체류 시간)

출처: `public/script.js:3167-3177`

```text
delta = now - lastSurveyTick
visibleMs += delta
```

설명:
- 현재 활성 문항이 화면에서 보이는 동안 누적되는 시간이다.
- 사용자가 질문을 얼마나 오래 보고 있었는지에 해당한다.

### 5.2 설문 단계 시선 총 관측 시간

출처: `public/script.js:2896-2907`

```text
gazeTotalMs += delta
```

설명:
- 유효한 WebGazer 샘플이 있고 AOI 판정이 가능한 구간만 누적된다.
- 따라서 `visibleMs`와 `gazeTotalMs`는 다를 수 있다.

해석:
- `visibleMs`는 문항이 화면에 떠 있던 시간
- `gazeTotalMs`는 그 시간 중 실제로 유효 시선 데이터가 잡힌 시간

### 5.3 Task AOI 머문 시간

출처: `public/script.js:2899-2905`

```text
if zone == "task":
  taskMs += delta
```

설명:
- 문항 카드(Task AOI) 내부에 시선이 있었던 누적 시간이다.

### 5.4 Distract AOI 머문 시간

출처: `public/script.js:2906-2907`

```text
if zone != "task":
  distractMs += delta
```

설명:
- 문항 외부 영역 또는 화면 밖에 머문 누적 시간이다.

### 5.5 Task AOI 재진입 횟수

출처: `public/script.js:2901-2904`

```text
if zone == "task" and lastAoiZone != "task":
  taskVisitCount += 1
```

설명:
- 시선이 Task AOI 밖으로 나갔다가 다시 들어온 횟수다.
- 값이 클수록 시선 이탈 후 복귀가 잦았다고 해석할 수 있다.

### 5.6 문항 응답 시간

출처: `public/script.js:3104`

```text
responseMs = max(0, now - firstVisibleAt)
```

설명:
- 문항이 처음 활성화된 시점부터 사용자가 첫 응답을 준 시점까지 걸린 시간이다.

### 5.7 빠른 응답(rapid response) 판정

출처: `public/script.js:3105`

```text
rapidResponse = (responseMs < 2500) || (taskMs < 1200)
```

설명:
- 2.5초보다 빨리 눌렀거나,
- 실제 Task AOI 안에 머문 시간이 1.2초보다 짧으면
- 문항을 충분히 읽지 않았을 가능성으로 본다.

## 6. 설문 단계 얼굴/시선 중심도 보조 식

### 6.1 시선 방향 추정식

출처: `public/script.js:518-534`

```text
normalizeRatio(value, min, max) = ((value - min) / max(0.0001, max - min) - 0.5) * 2

horizontal = (leftHorizontal + rightHorizontal) / 2
vertical   = (leftVertical + rightVertical) / 2
```

설명:
- 좌우 홍채 중심과 눈 경계 landmark를 이용해 상대적 시선 방향을 -1 ~ 1 근처 값으로 정규화한다.
- 절대 화면 좌표가 아니라 "눈 안에서 홍채가 얼마나 중앙에 있나"를 보는 값이다.

### 6.2 머리 자세(Euler angle) 변환

출처: `public/script.js:537-561`

```text
pitch = atan2(m21, m22)
yaw   = atan2(-m20, sy)
roll  = atan2(m10, m00)

degree = radian * (180 / π)
```

설명:
- MediaPipe의 face transform matrix를 pitch, yaw, roll 각도로 바꾼다.

### 6.3 설문 단계 attentive 판정

출처: `public/script.js:2109-2117`

```text
forward = |yaw| < 18 && |pitch| < 16
gazeCentered = |gaze.horizontal| < 0.42 && |gaze.vertical| < 0.55
attentive = forward && gazeCentered
```

설명:
- 얼굴이 정면에 가깝고
- 홍채 추정 방향도 중앙 근처면
- "주의가 유지된 샘플"로 본다.

### 6.4 얼굴 존재율

출처: `public/script.js:3210`

```text
facePresenceRatio = presentSamples / max(1, totalSamples)
```

설명:
- 얼굴이 실제로 잡힌 비율이다.
- 카메라 품질, 조명, 얼굴 위치 안정성을 간접 반영한다.

### 6.5 머리 움직임 변동성

출처: `public/script.js:3214`

```text
headMotionStd = std(yaw) + std(pitch)
```

설명:
- 머리를 좌우/상하로 얼마나 흔들었는지를 변동성으로 합산한다.
- 현재 최종 설문 카드에는 직접 쓰이지 않지만, 디지털 바이오마커 원자료에는 남는다.

## 7. 설문 전체 집계 식

출처: `public/script.js:3191-3214`

### 7.1 응답 수

```text
answeredCount = count(answerValue != null)
```

### 7.2 평균 응답 시간

```text
averageResponseMs = responseTotal / max(1, answeredCount)
```

### 7.3 집중 비율

```text
attentionRatio = taskTotal / max(1, gazeTotal)
```

설명:
- 전체 유효 시선 시간 중 문항(Task AOI)에 머문 비율이다.

### 7.4 산만 비율

```text
awayRatio = distractTotal / max(1, gazeTotal)
distractibilityRatio = distractTotal / max(1, gazeTotal)
```

설명:
- 코드상 `awayRatio`와 `distractibilityRatio`는 같은 값이다.

### 7.5 시선 커버리지

```text
gazeCoverageRatio = gazeTotal / max(1, visibleTotal)
```

설명:
- 문항이 보였던 전체 시간 중 실제 gaze가 유효하게 잡힌 비율이다.
- 이 값이 낮으면 결과 해석 신뢰도를 낮게 본다.

### 7.6 빠른 응답 개수

```text
rapidCount = count(rapidResponse == true)
```

### 7.7 재방문 개수

```text
revisitTotal = Σ max(0, activationCount - 1)
```

설명:
- 같은 문항이 다시 활성화된 횟수의 총합이다.

### 7.8 Task AOI 재진입 총합

```text
taskVisitTotal = Σ taskVisitCount
```

### 7.9 가장 오래 머문 문항

출처: `public/script.js:3574-3589`

```text
hardestQuestion = argmax(visibleMs)
```

설명:
- 코드상 "가장 오래 머문 문항"은 `visibleMs`가 가장 큰 문항으로 계산한다.

## 8. 설문 결과 카드에 쓰이는 식

### 8.1 Task AOI 집중 카드

출처: `public/script.js:3555-3564`

```text
focusScore = round(clamp(attentionRatio * 100, 0, 100))
```

설명:
- 결과 카드의 "Task AOI 집중" 점수다.
- 전체 유효 시선 시간 중 몇 %가 현재 문항 영역에 머물렀는지를 점수화한 것이다.

### 8.2 Distractibility 카드

출처: `public/script.js:3556-3570`

```text
distractibilityScore = round(clamp(distractibilityRatio * 100, 0, 100))
```

설명:
- 전체 유효 시선 시간 중 몇 %가 문항 밖에 머물렀는지를 보여준다.
- 값이 높을수록 산만한 패턴으로 해석한다.

### 8.3 카드 톤(문구 색상) 판정식

출처: `public/script.js:2919-2928`

일반 카드:

```text
score >= 75  -> 안정
score >= 45  -> 보통
else         -> 주의 필요
```

역방향 카드(`reverseTone: true`, Distractibility):

```text
score >= 55  -> 높음
score >= 25  -> 중간
else         -> 낮음
```

설명:
- 집중 점수는 높을수록 좋다.
- Distractibility는 반대로 높을수록 좋지 않아서 역방향 톤을 쓴다.

## 9. 설문 판정 카드(스크리닝) 식

출처: `public/script.js:3355-3388`, `public/script.js:3518-3548`

### 9.1 점수 분포 집계

```text
scoreCounts[score] = count(answerValue == score)
```

설명:
- 0~4점 응답이 각각 몇 번 나왔는지 세는 식이다.

### 9.2 최빈 응답 점수

```text
dominantScore = argmax(scoreCounts)
if tie and count > 0:
  higher score wins
```

설명:
- 같은 빈도면 더 높은 점수를 대표값으로 잡는다.

### 9.3 고위험 응답 개수

출처: `public/script.js:3369`

```text
highCount = count(answerValue >= 3)
```

설명:
- 3점(자주), 4점(매우 자주) 응답 수를 센다.

### 9.4 파트별 양성 판정

출처: `public/script.js:3378`

```text
partPositive = (highCount >= 5)
```

설명:
- 각 파트에서 3점 이상 문항이 5개 이상이면 해당 파트는 양성이다.

### 9.5 최종 설문 양성 판정

출처: `public/script.js:3388`

```text
screeningPositive = part1.positive || part2.positive
```

설명:
- Part 1 또는 Part 2 중 하나라도 기준을 넘으면 최종 양성이다.

### 9.6 결과 화면에 나가는 판정 정보

출처: `public/script.js:3518-3548`

표시 항목:
- 최종 양성/음성
- 파트별 양성/음성
- 가장 많이 응답한 점수(`dominantLabel`, `dominantScore`)
- 3점 이상 응답 횟수(`highCount`)
- 응답 완료 문항 수(`answeredCount`)

## 10. 설문 결과 화면의 해석 문구 조건

출처: `public/script.js:3580-3594`

### 10.1 gaze 품질 경고

```text
if cameraState == "denied":
  AOI 해석 제한
else if gazeCoverageRatio < 0.35:
  AOI 비율은 참고용
else:
  gazeObservedMs 기반 해석
```

설명:
- `gazeCoverageRatio < 35%`이면 시선 품질이 낮다고 본다.

### 10.2 오래 머문 문항 안내

```text
hardestQuestion = argmax(visibleMs)
```

### 10.3 재진입 패턴 안내

```text
if taskVisitTotal > 0:
  "시선이 자주 이탈했다가 돌아온 패턴" 안내
```

## 11. CPT 과제 설계와 자극 구성 식

출처: `public/script.js:25-31`, `public/script.js:699-700`, `public/script.js:2484-2496`

### 11.1 전체 시행 수

```text
CPT_BLOCK_TRIALS = 5
CPT_TOTAL_TRIALS = CPT_BLOCK_TRIALS * 4 = 20
```

### 11.2 시간 설정

```text
CPT_STIMULUS_MS = 200
CPT_RESPONSE_WINDOW_MS = 800
CPT_ISI_RANGE = [1000, 1500]
```

설명:
- 자극은 200ms만 보이고,
- 전체 반응 허용창은 800ms다.
- 자극 간 간격(ISI)은 1.0~1.5초 랜덤이다.

### 11.3 표적 자극 출현 확률

출처: `public/script.js:2484-2485`

```text
cptCurrentStimulus = Math.random() > 0.3 ? TARGET : DISTRACTOR
```

설명:
- 표적 자극 약 70%
- 비표적 자극 약 30%

### 11.4 블록 유형

출처: `public/script.js:699-700`

```text
1 = Baseline
2 = Visual Distraction
3 = Auditory Distraction
4 = Combined
```

### 11.5 방해 자극 삽입 규칙

출처: `public/script.js:2495-2496`

```text
if block == 2 or 4: visual distractor
if block == 3 or 4: auditory distractor
```

## 12. CPT 이벤트 정의 식

### 12.1 누락 오류(Omission)

출처: `public/script.js:2504-2506`

```text
if stimulus == TARGET and responded == false:
  omits += 1
```

설명:
- 표적 자극이 나왔는데 반응하지 않은 경우다.

### 12.2 정반응(Hit)

출처: `public/script.js:2763-2765`

```text
if stimulus == TARGET and keypress:
  hits += 1
  blockStats[currentBlock].hits += 1
```

### 12.3 오반응(Commission)

출처: `public/script.js:2767-2768`

```text
if stimulus != TARGET and keypress:
  commission += 1
```

설명:
- 비표적 자극에 눌러버린 경우다.

### 12.4 과잉반응(Hyperactivity / anticipation)

출처: `public/script.js:2754`, `public/script.js:2775`

```text
if already responded and keypress again:
  hyperactivity += 1

if state == "ISI" and keypress:
  hyperactivity += 1
```

설명:
- 같은 자극에 여러 번 누르거나,
- 자극 나오기 전에 먼저 누르는 경우를 포함한다.

### 12.5 반응시간 저장

출처: `public/script.js:2761`

```text
rt = performance.now() - cptStimulusStartTime
rts.push(rt)
```

중요한 해석:
- 이 프로젝트에서는 `rts`가 hit만이 아니라 commission 반응도 함께 포함할 수 있다.
- 따라서 RT 평균/분산은 "정반응만의 RT"가 아니라 "실제 키 입력 RT 전체"에 가깝다.

## 13. CPT 단계 시선/얼굴 디지털 바이오마커 식

### 13.1 CPT AOI 누적식

출처: `public/script.js:3728-3756`, `public/script.js:2896-2907`

```text
delta = now - lastAoiTick

if classification exists:
  gazeTotalMs += delta
  if zone == "task":
    if lastAoiZone != "task": taskVisitCount += 1
    taskMs += delta
  else:
    distractMs += delta
else:
  resetAoiZone()
```

설명:
- CPT도 설문과 동일하게 AOI 기반 누적 시간을 쓴다.
- 전체 CPT, 그리고 각 blockStats에도 같은 식을 동시에 적용한다.

### 13.2 CPT 실시간 attentive 비율

출처: `public/script.js:3762`

```text
attentiveRatio(%) = round(taskMs / max(1, gazeTotalMs) * 100)
```

설명:
- 화면 실시간 막대에 보이는 집중도다.

### 13.3 CPT yaw 식

출처: `public/script.js:3740`

```text
yaw = (landmarks[1].x - (landmarks[33].x + landmarks[263].x) / 2) * 100
```

설명:
- 코 중심과 양쪽 눈 기준점을 이용해 좌우 편향 정도를 간단히 본 값이다.

### 13.4 CPT blink 식

출처: `public/script.js:3741`

```text
blink = (eyeBlinkLeft + eyeBlinkRight) / 2
```

### 13.5 자극 중 blink 집계

출처: `public/script.js:3743-3745`

```text
if state == "STIMULUS" and blink > 0.5:
  blinksInStimulus += 1
```

설명:
- 자극 제시 중 눈깜빡임이 많으면 자극 누락 가능성을 높일 수 있다.

## 14. CPT 최종 결과 분석 식

출처: `public/script.js:3795-3830`

### 14.1 표적/비표적 개수

```text
totalTargets = hits + omits
totalNonTargets = CPT_TOTAL_TRIALS - totalTargets
```

설명:
- 실제 생성된 표적 수는 랜덤이므로 `hits + omits`로 역산한다.

### 14.2 누락 오류율

출처: `public/script.js:3797`

```text
omissionRate(%) = round(omits / max(1, totalTargets) * 100)
```

의미:
- 표적 자극에 대한 반응 누락 비율

### 14.3 오반응 오류율

출처: `public/script.js:3798`

```text
commissionRate(%) = round(commission / max(1, totalNonTargets) * 100)
```

의미:
- 비표적 자극에 대한 충동적 반응 비율

### 14.4 반응시간 평균

출처: `public/script.js:3799`

```text
rtMean = Σ rts / max(1, len(rts))
```

### 14.5 반응시간 분산

출처: `public/script.js:3800`

```text
rtVariance = Σ (rt - rtMean)^2 / max(1, len(rts))
```

### 14.6 반응시간 표준편차

출처: `public/script.js:3801`

```text
rtSD = round(sqrt(rtVariance))
```

의미:
- 반응의 일관성/변동성을 보는 핵심 수치다.

### 14.7 시선 이탈 척도

출처: `public/script.js:3802`

```text
distractScale(%) = round(distractMs / max(1, gazeTotalMs) * 100)
```

의미:
- CPT 전체 유효 시선 시간 중 과제 AOI 밖에 머문 비율이다.

### 14.8 블록별 산만 비율

출처: `public/script.js:3809-3810`

```text
blockDistractibility(%) = round(block.distractMs / max(1, block.gazeTotalMs) * 100)
```

설명:
- 각 블록에서 방해 자극 영향이 얼마나 커졌는지 본다.

### 14.9 시각 방해 민감도 비교식

출처: `public/script.js:3827-3829`

```text
baselineDist = round(block1.distractMs / max(1, block1.gazeTotalMs) * 100)
visualDist   = round(block2.distractMs / max(1, block2.gazeTotalMs) * 100)

if visualDist > baselineDist + 10:
  visual distraction sensitivity flagged
```

설명:
- 시각 방해 블록에서 baseline보다 distractibility가 10%p 초과 증가하면
- 시각 방해 자극 민감성이 있다고 해석한다.

## 15. CPT 해석 문구 조건

출처: `public/script.js:3823-3835`

### 15.1 지속적 주의 저하 의심

```text
if omissionRate > 15
```

### 15.2 충동 억제 미흡 의심

```text
if commissionRate > 15
```

### 15.3 반응 일관성 저하 의심

```text
if rtSD > 150
```

### 15.4 시각 방해 민감도

```text
if visualDist > baselineDist + 10
```

### 15.5 별도 이상 소견이 없을 때

```text
if no interpretation text:
  "반응 억제와 AOI 기반 주의 배분 지표가 비교적 안정적"
```

## 16. 결과 화면에서 보이는 시간 관련 값 정리

### 16.1 설문 문항별 전체 시간

```text
visibleMs = 문항이 활성 상태로 보였던 시간
```

### 16.2 설문 문항별 유효 시선 시간

```text
gazeTotalMs = 유효 gaze가 존재해 AOI 판정이 가능했던 시간
```

### 16.3 설문 문항별 문항 안 머문 시간

```text
taskMs = Task AOI 안에 머문 시간
```

### 16.4 설문 문항별 문항 밖 머문 시간

```text
distractMs = Task AOI 밖/화면 밖에 머문 시간
```

### 16.5 CPT 전체 관측 시간

출처: `public/script.js:3668-3671`, `public/script.js:3694-3698`

```text
taskWindow = cptMetrics.taskMs
distractWindow = cptMetrics.distractMs
gazeWindow = cptMetrics.gazeTotalMs
taskVisits = cptMetrics.taskVisitCount
```

설명:
- 결과 화면의 CPT WebGazer 섹션에서 그대로 노출되는 값들이다.

## 17. 실무 해석 요약

이 프로젝트에서 핵심적으로 보는 축은 아래 네 가지다.

1. 설문 중 문항에 실제로 얼마나 오래 머물렀는가

```text
Task AOI 집중 = taskMs / gazeTotalMs
```

2. 문항 밖으로 얼마나 자주, 얼마나 오래 새었는가

```text
Distractibility = distractMs / gazeTotalMs
Task AOI 재진입 = taskVisitCount
```

3. 설문 응답이 행동적으로 너무 빠르거나 불안정한가

```text
responseMs
rapidResponse
```

4. CPT에서 오류율과 시선 이탈이 방해 자극에 의해 얼마나 달라지는가

```text
omissionRate
commissionRate
rtSD
distractScale
blockDistractibility
visualDist - baselineDist
```

즉, 이 시스템은 "정답/오답"만 보는 것이 아니라, 응답 행동과 시선 배분 패턴을 같이 묶어서 디지털 바이오마커로 해석하는 구조다.

## 18. 부록: 파일 안에 남아 있는 레거시(현재 최종 미사용) 식

같은 파일 앞부분에는 이전 버전 계산식이 남아 있다. 최종 활성 함수가 뒤에서 다시 덮어쓰므로 현재 화면에는 직접 쓰이지 않지만, 코드 리뷰나 문서화 시 혼동이 생길 수 있어 함께 기록한다.

### 18.1 예전 설문 카드 식

출처: `public/script.js:3223-3226`

```text
responseBase = 100 - clamp(((averageResponseMs / 1000) - 2.5) * 18, 0, 100)
responsePenalty = rapidCount * 8
responseScore = round(clamp(responseBase - responsePenalty, 0, 100))

stabilityScore = round(clamp(100 - headMotionStd * 4.5, 0, 100))
```

설명:
- 예전에는 "응답 속도", "움직임 안정성" 카드도 있었지만,
- 최종 활성 카드에서는 제거되고 `Task AOI 집중`, `Distractibility`만 남았다.

### 18.2 예전 CPT frame 기반 식

출처: `public/script.js:2572`, `public/script.js:2676-2708`

```text
attentiveRatio = round(attentive / frames * 100)
distractScale = round(distracted / max(1, frames) * 100)
blockDistractibility = round(block.distracted / max(1, block.frames) * 100)
baselineDist = round(block1.distracted / max(1, block1.frames) * 100)
visualDist = round(block2.distracted / max(1, block2.frames) * 100)
```

설명:
- 예전에는 frame 수 기준으로 집중/이탈을 계산했다.
- 현재 최종 로직은 이 식이 아니라 AOI 누적 시간 기반 식(`taskMs`, `distractMs`, `gazeTotalMs`)을 사용한다.
