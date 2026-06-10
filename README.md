# 🫂 FAST: ADHD Screening Web

### 설문, CPT, 시선/얼굴 행동 데이터를 활용한 ADHD 초기 스크리닝 웹 

FAST는 웹 환경에서 ADHD 관련 경향을 간단히 확인할 수 있도록 만든 스크리닝 시스템입니다.  
사용자는 설문과 CPT 과제를 진행하고, 검사 결과는 LLM 기반 리포트로 확인할 수 있습니다.

✔️ 본 프로젝트는 의료 진단 시스템이 아닌 스크리닝 보조 도구입니다.

---

## 목차

- [개요](#개요)
- [Live Demo](#live-demo)
- [Architecture](#architecture)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [실행 방법](#실행-방법)
- [Environment Variables](#environment-variables)
- [주의사항](#주의사항)

---

## 개요

FAST는 설문, CPT 과제, 카메라 기반 행동 추적, AI 리포트 생성을 결합한 웹 기반 ADHD 초기 스크리닝 애플리케이션입니다.

사용자는 짧은 검사 흐름을 따라 설문과 CPT를 진행하며, 시스템은 수집된 결과를 바탕으로 사용자가 이해하기 쉬운 리포트를 제공합니다.

---

## Live Demo

https://adhd-test-app.vercel.app/

---

## Architecture

![FAST Architecture](docs/architecture.png)

---

## 주요 기능

**스크리닝 흐름**  
설문과 CPT 과제를 하나의 웹 기반 검사 흐름으로 연결합니다.

**CPT 과제**  
짧은 주의력 과제를 통해 사용자의 반응 패턴을 확인합니다.

**카메라 기반 추적**  
WebGazer와 MediaPipe를 활용하여 검사 중 시선과 머리 자세 정보를 참고합니다.

**AI 리포트 생성**  
Gemini LLM이 수집된 검사 결과를 사용자가 이해하기 쉬운 리포트로 생성합니다.

**리포트 보관**  
생성된 리포트를 다시 확인할 수 있으며, 브라우저 인쇄 기능을 통해 PDF로 저장할 수 있습니다.

---

## 실행 방법

### 1. 저장소 클론

```bash
git clone https://github.com/AI-AYJ/adhd-test-app.git
cd adhd-test-app
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

실행 후 아래 주소에서 확인할 수 있습니다.

```text
http://localhost:3000
```

---

## Environment Variables

Create a `.env.local` file in the project root.

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

---

## ⚠️ 주의사항

FAST는 의료 진단 도구가 아닙니다.

본 시스템은 사용자의 주의 및 행동 특성을 살펴보기 위한 초기 스크리닝 참고 도구입니다.  
정확한 진단이나 치료 여부는 전문 의료진의 평가가 필요합니다.

카메라 영상은 저장, 녹화, 업로드되지 않으며 검사 중 지표 계산을 위해서만 사용됩니다.
