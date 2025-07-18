# 🦎 Gecko Puzzle (React + Phaser Game)

React + TypeScript + Tailwind CSS + Phaser 조합으로 만드는 퍼즐 게임 프로젝트입니다.  
`Gecko Out` 스타일의 2D 퍼즐 게임을 목표로 하며, 웹에서 모바일 대응이 가능한 구조로 개발합니다.

---

## 🔄 개발 워크플로우 (AI 협업 기반)

이 프로젝트는 **AI와 함께 협업**하여 개발합니다.  
작업은 아래와 같이 Task 단위로 구성되며, 각 Task는 분리 가능한 독립 모듈입니다.  
작업 시 `./tasks` 또는 GitHub Issues에 등록하여 관리합니다.

---

## 📌 [Progress Tasks] 단계별 구현 계획

| 단계  | 내용                                                | 완료 여부 |
| ----- | --------------------------------------------------- | --------- |
| `T1`  | Vite + React + TS + Tailwind 프로젝트 생성          | ✅        |
| `T2`  | Phaser 설치 및 기본 config 세팅                     | ✅        |
| `T3`  | `PhaserGame.tsx`: React 내에서 Phaser 캔버스 마운트 | ✅        |
| `T4`  | BootScene / GameScene 파일 구성                     | ✅        |
| `T5`  | 타일 맵 기반 배경 그리기                            | ✅        |
| `T6`  | 도마뱀(Gecko) 오브젝트 드래그 구현                  | ✅        |
| `T7`  | 색상 구멍과 충돌 판정 로직                          | ✅        |
| `T8`  | 제한 시간 타이머 기능                               | ✅        |
| `T9`  | 성공 / 실패 조건 판정 및 전환                       | ✅        |
| `T10` | 레벨 JSON 구조 설계 및 데이터로부터 로딩            | ⬜        |
| `T11` | React UI 구성 (타이머, 점수판, 버튼 등)             | ⬜        |
| `T12` | 반응형 대응 및 모바일 UX 최적화                     | ⬜        |
| `T13` | Vercel 또는 Netlify 배포                            | ⬜        |

> ✅: 완료 / ⬜: 진행 예정

---

🤖 AI 협업 가이드
AI가 도와줄 수 있는 영역:

Phaser API 기반 드래그 및 충돌 로직 설계

타입 안정성을 위한 TypeScript interface 정의

레벨 로딩용 JSON 구조 설계

UI/UX 반응형 조정 (Tailwind 기반)

정적 배포용 vite.config.ts 설정 조정

성능 최적화 (GC, 메모리 누수 등)
