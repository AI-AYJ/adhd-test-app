# FAST: ADHD Screening Web App

### 설문, CPT, 시선/얼굴 행동 데이터를 활용한 ADHD 초기 스크리닝 웹 애플리케이션

FAST는 웹 환경에서 ADHD 관련 경향을 간단히 확인할 수 있도록 만든 스크리닝 시스템입니다.  
사용자는 설문과 CPT 과제를 진행하고, 검사 결과는 LLM 기반 리포트로 확인할 수 있습니다.

This project is a screening support tool, not a medical diagnostic system.

---

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Architecture](#architecture)
- [Main Features](#main-features)
- [Tech Stack](#tech-stack)
- [Get Started](#get-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Note](#note)

---

## Overview

FAST is a web-based ADHD screening application that combines a questionnaire, CPT task, camera-based behavior tracking, and AI-generated report generation.

The system guides users through a short screening flow and provides a readable report based on the collected screening results.

---

## Live Demo

https://adhd-test-app.vercel.app/

---

## Architecture

![FAST Architecture](docs/architecture.png)

---

## Main Features

**Screening Flow**  
Questionnaire and CPT are connected into a single web-based screening flow.

**CPT Task**  
The application includes a short attention task to observe response patterns.

**Camera-Based Tracking**  
WebGazer and MediaPipe are used to reference gaze and head-pose information during the test.

**AI Report Generation**  
Gemini LLM generates a readable screening report from the collected results.

**Report Archive**  
Generated reports can be viewed again and saved as PDF using the browser print feature.

---

## Tech Stack

| Part | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Tracking | WebGazer, MediaPipe |
| Backend | Next.js API Routes |
| Database | Supabase |
| AI Report | Gemini API |
| Deployment | Vercel |

---

## Get Started

### 1. Clone This Repository

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

The application will run at:

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

## Scripts

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Start Production Server

```bash
npm run start
```

### Lint

```bash
npm run lint
```

---

## Note

FAST is not a medical diagnostic tool.

This system is designed as an initial screening reference for attention and behavior patterns.  
For accurate diagnosis or treatment decisions, professional medical evaluation is required.

Camera video is not saved, recorded, or uploaded. It is used only during the test for metric calculation.
