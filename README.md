# 📚 공부 기록 카드 메이커 | 뽀모도로 타이머

뽀모도로 타이머로 공부하고, 오늘의 집중 기록을 **인스타그램 스토리 카드**로 만들어 공유하는 웹앱.
한국 수험생·대학생의 #공스타그램 문화 특화.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| ⏱ 뽀모도로 타이머 | 25분 집중 / 5분 휴식 / 4사이클 후 30분 긴 휴식 |
| 📋 과목별 시간 기록 | 최대 5개 과목 태그, 누적 집중 시간 자동 집계 |
| 🎨 공부 카드 생성 | 9:16 인스타 스토리 비율 PNG 다운로드 |
| 🌙 다크/라이트 테마 | 토글 전환, 기본 다크모드 |
| 📱 모바일 최적화 | 375px 기준 반응형 |

---

## 파일 구조

```
current_app/
├── index.html    ← 메인 페이지 (AdSense placeholder 포함)
├── style.css     ← 다크/라이트 테마 스타일
├── app.js        ← 타이머 로직 + 과목 기록 + localStorage
├── card.js       ← Canvas 기반 카드 생성 + PNG 다운로드
├── README.md     ← 이 파일
└── DONE          ← 완료 신호
```

---

## 배포 방법

### Vercel (권장)

```bash
# 1. GitHub 저장소 생성 후 푸시
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOUR_ID/pomodoro-study-card.git
git push -u origin main

# 2. vercel.com에서 Import
# Framework: Other (정적 파일)
# Output Directory: ./ (루트)
```

### GitHub Pages

```bash
# Settings → Pages → Source: main branch / root
# 주소: https://YOUR_ID.github.io/pomodoro-study-card
```

---

## AdSense 적용 방법

1. `index.html`에서 아래 주석을 실제 AdSense 코드로 교체:

   | 주석 | 위치 | 권장 광고 크기 |
   |------|------|---------------|
   | `<!-- ADSENSE_HEAD -->` | `<head>` 안 | 스크립트 태그 |
   | `<!-- ADSENSE_SLOT_1 -->` | 상단 배너 | 728×90 / 320×50 |
   | `<!-- ADSENSE_SLOT_2 -->` | 타이머 하단 | 300×250 |
   | `<!-- ADSENSE_SLOT_3 -->` | 사이드바 | 160×600 |

2. **집중 중 광고 자동 숨김**: `body.is-running` 시 `.ad-slot--mid`, `.ad-slot--top` 자동 숨김 (style.css 24번째 줄)

3. Vercel / GitHub Pages 배포

4. Google Search Console 등록 → sitemap.xml 추가 권장

---

## 예상 수익 키워드

- **뽀모도로 타이머** (월 검색량 ~40,000)
- **공스타그램 공부 기록** (월 검색량 ~15,000)
- **인스타 공부 카드 만들기** (월 검색량 ~8,000)

> ⚠️ 수험생 타겟 CPM은 낮은 편 (~$0.3–0.8). 핵심 수익은 카드 공유 바이럴에 의한 트래픽 유입.

---

## 수익화 확장 아이디어

- **프리미엄 카드 테마** (결제 없이 기본 2종, 유료 추가 테마)
- **학원/교육앱 제휴 광고** 슬롯 직거래
- 카드 하단 워터마크 → 바이럴 인지도 → 교육 앱 제휴 문의

---

## 기술 스택

- HTML5 / CSS3 (Custom Properties) / Vanilla JS
- Canvas 2D API (카드 생성)
- Web Audio API (타이머 알림음, 외부 파일 불필요)
- localStorage (당일 기록 저장)
- html2canvas CDN (폴백)
- **외부 의존성 없음** (CDN만 사용)

---

## 로컬 실행

```bash
# 그냥 index.html을 브라우저에서 열면 됩니다
open index.html   # macOS
start index.html  # Windows
```

> ⚠️ iOS Safari에서 Canvas 폰트 렌더링이 다를 수 있음. 시스템 폰트 사용으로 최소화.
