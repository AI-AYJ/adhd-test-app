# <img width="207" height="54" alt="image" src="https://github.com/user-attachments/assets/3e121577-0950-4498-9e47-b8e3069a0d45" /> 
FAST: ADHD Screening Web


> 웹캠 기반 행동 분석과 LLM 리포트를 결합한 성인 ADHD 초기 스크리닝 웹 서비스

FAST는 성인 ADHD를 의심하는 사용자가 병원 방문 전 자신의 주의·행동 특성을 간단히 확인해볼 수 있도록 만든 웹 기반 스크리닝 서비스입니다.

사용자는 웹에서 자가보고 설문과 CPT 기반 주의력 과제를 수행하고, 검사 중 나타나는 반응 패턴, 시선 이탈, 머리 움직임 등의 디지털 바이오마커를 바탕으로 결과 리포트를 확인할 수 있습니다.

본 프로젝트는 건양대학교 인공지능학과 캡스톤디자인 프로젝트로 개발되었습니다.

---

## Live Demo

https://adhd-test-app-9ovm.vercel.app/

---

## Why FAST?

성인 ADHD는 일상생활, 학업, 업무 집중도에 큰 영향을 줄 수 있지만, 병원 방문 전에는 자신의 상태를 객관적으로 확인하기 어렵습니다.

FAST는 이러한 접근 장벽을 낮추기 위해, 별도의 장비 없이 웹캠과 브라우저만으로 사용자의 주의 및 행동 특성을 살펴볼 수 있는 스크리닝 환경을 제공합니다.

단순 설문 결과만 보여주는 것이 아니라, 검사 중 사용자의 반응과 행동 데이터를 함께 분석하여 더 직관적인 결과 리포트를 제공하는 것이 특징입니다.

<img width="1217" height="519" alt="image" src="https://github.com/user-attachments/assets/37b10afa-b951-4e96-9df2-641e4984f355" />


---

## 📌 Key Features

### Self-Report Survey

ADHD와 관련된 부주의, 과잉행동, 충동성 특성을 확인하기 위한 자가보고 설문을 제공합니다.

### CPT Attention Task

사용자는 화면에 제시되는 자극에 반응하는 간단한 CPT 과제를 수행합니다.
이를 통해 정반응, 누락 오류, 오반응, 반응시간 등의 주의력 관련 지표를 확인합니다.

### Webcam-Based Behavior Analysis

검사 중 웹캠을 활용해 사용자의 시선 이탈과 머리 움직임을 분석합니다.
이를 통해 과제 수행 중 집중 유지와 관련된 보조 지표를 계산합니다.

### AI-Generated Report

검사 결과는 LLM 기반 리포트로 변환됩니다.
사용자는 단순한 점수표가 아니라, 자신의 주의·행동 특성을 설명형 문장으로 확인할 수 있습니다.

### Result Dashboard

검사 결과는 시각화된 대시보드 형태로 제공되며, 사용자가 주요 지표를 쉽게 이해할 수 있도록 구성했습니다.

---

## System Flow

```text
사용자 접속
   ↓
자가보고 설문 진행
   ↓
웹캠 기반 시선/얼굴 추적
   ↓
CPT 주의력 과제 수행
   ↓
반응 데이터 및 행동 지표 분석
   ↓
LLM 기반 결과 리포트 생성
   ↓
결과 대시보드 제공
```

---

## Tech Stack

* Next.js
* React
* TypeScript
* Tailwind CSS
* Supabase
* WebGazer.js
* MediaPipe Face Landmarker
* Gemini LLM
* Vercel

---

## Preview

FAST는 다음과 같은 흐름으로 구성됩니다.

* ADHD 관련 자가보고 설문
* 웹캠 권한 허용 및 행동 분석 준비
* CPT 기반 주의력 과제
* 시선 이탈 및 머리 움직임 분석
* AI 기반 결과 리포트 생성
* 사용자 친화적인 결과 대시보드 제공

---

## 🙌  Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/AI-AYJ/adhd-test-app.git
cd adhd-test-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## Important Notice

FAST는 의료 진단 도구가 아닙니다.

본 시스템은 사용자의 주의 및 행동 특성을 이해하기 위한 초기 스크리닝 보조 도구입니다.
검사 결과는 ADHD 진단을 의미하지 않으며, 정확한 진단과 치료 여부는 반드시 정신건강의학과 전문의 또는 관련 전문가의 평가가 필요합니다.

또한 웹캠 영상은 저장, 녹화, 업로드되지 않으며, 검사 중 실시간 지표 계산을 위해서만 사용됩니다.


---

## Repository

https://github.com/AI-AYJ/adhd-test-app
