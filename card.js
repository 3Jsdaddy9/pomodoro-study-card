/* ============================================
   card.js — 공부 기록 카드 Canvas 렌더링
   9:16 비율 (540×960px) → PNG 다운로드
   ============================================ */

const CARD_W = 540;
const CARD_H = 960;

const CARD_THEMES = {
  dark: {
    bg: '#0F172A',
    bgGrad1: '#0F172A',
    bgGrad2: '#1E293B',
    accent: '#6366F1',
    accentGlow: 'rgba(99, 102, 241, 0.3)',
    text: '#F1F5F9',
    textSub: '#94A3B8',
    textMuted: '#64748B',
    surface: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.08)',
    watermark: 'rgba(255,255,255,0.15)',
  },
  light: {
    bg: '#FFFFFF',
    bgGrad1: '#F8FAFC',
    bgGrad2: '#EEF2FF',
    accent: '#6366F1',
    accentGlow: 'rgba(99, 102, 241, 0.15)',
    text: '#0F172A',
    textSub: '#475569',
    textMuted: '#94A3B8',
    surface: 'rgba(0,0,0,0.04)',
    border: 'rgba(0,0,0,0.08)',
    watermark: 'rgba(0,0,0,0.12)',
  },
};

let currentCardTheme = 'dark';

/* ---------- 도넛 차트 그리기 ---------- */
function drawDonutChart(ctx, cx, cy, outerR, innerR, data, totalSeconds) {
  if (!data || data.length === 0 || totalSeconds === 0) {
    // 데이터 없을 때 빈 링
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    return;
  }

  let startAngle = -Math.PI / 2;
  const gap = 0.04; // 조각 사이 간격

  data.forEach((item, i) => {
    const ratio = item.seconds / totalSeconds;
    const sliceAngle = ratio * Math.PI * 2 - gap;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle + gap / 2, startAngle + sliceAngle + gap / 2);
    ctx.arc(cx, cy, innerR, startAngle + sliceAngle + gap / 2, startAngle + gap / 2, true);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();

    startAngle += ratio * Math.PI * 2;
  });
}

/* ---------- 도넛 차트 범례 ---------- */
function drawLegend(ctx, x, y, data, theme, maxWidth) {
  const T = CARD_THEMES[theme];
  const itemH = 36;
  const dotR = 7;

  data.forEach((item, i) => {
    const rowY = y + i * itemH;

    // 색 점
    ctx.beginPath();
    ctx.arc(x + dotR, rowY + dotR / 2, dotR, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();

    // 과목명
    ctx.font = `500 ${24}px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = T.text;
    ctx.textAlign = 'left';
    ctx.fillText(item.name, x + dotR * 2 + 12, rowY + dotR);

    // 시간
    const timeStr = formatSecondsCard(item.seconds);
    ctx.font = `600 ${22}px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = T.textSub;
    ctx.textAlign = 'right';
    ctx.fillText(timeStr, x + maxWidth, rowY + dotR);
    ctx.textAlign = 'left';
  });
}

function formatSecondsCard(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}분`;
  return `${s}초`;
}

/* ---------- 총 시간 포맷 ---------- */
function formatTotalTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

/* ---------- 배경 그라디언트 ---------- */
function drawBackground(ctx, theme) {
  const T = CARD_THEMES[theme];
  const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  grad.addColorStop(0, T.bgGrad1);
  grad.addColorStop(1, T.bgGrad2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 장식 원 (상단 우측)
  ctx.beginPath();
  ctx.arc(CARD_W + 40, -40, 200, 0, Math.PI * 2);
  ctx.fillStyle = T.accentGlow;
  ctx.fill();

  // 장식 원 (하단 좌측)
  ctx.beginPath();
  ctx.arc(-60, CARD_H + 60, 180, 0, Math.PI * 2);
  ctx.fillStyle = T.accentGlow;
  ctx.fill();
}

/* ---------- 카드 테두리 ---------- */
function drawCardBorder(ctx, theme) {
  const T = CARD_THEMES[theme];
  ctx.strokeStyle = T.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, CARD_W - 1, CARD_H - 1);
}

/* ---------- 둥근 사각형 ---------- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ---------- 메인 카드 렌더링 ---------- */
function renderStudyCard(theme = 'dark') {
  currentCardTheme = theme;
  const canvas = document.getElementById('studyCard');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const T = CARD_THEMES[theme];

  // 데이터
  const state = window.appState || {};
  const subjects = (state.subjects || []).filter(s => s.seconds > 0);
  const totalSeconds = subjects.reduce((a, s) => a + s.seconds, 0);
  const pomodoroCount = state.pomodoroCount || 0;
  const today = window.getTodayString ? window.getTodayString() : new Date().toISOString().slice(0, 10);
  const dateFormatted = today.replace(/-/g, '.').slice(2); // YY.MM.DD

  // 배경
  drawBackground(ctx, theme);

  // ---------- 상단: 날짜 ----------
  const topY = 72;

  // 날짜 칩
  const dateChipW = 200;
  const dateChipX = (CARD_W - dateChipW) / 2;
  roundRect(ctx, dateChipX, topY - 20, dateChipW, 44, 22);
  ctx.fillStyle = T.surface;
  ctx.fill();
  ctx.strokeStyle = T.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `500 22px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;
  ctx.fillStyle = T.textSub;
  ctx.textAlign = 'center';
  ctx.fillText(`📅 ${dateFormatted}`, CARD_W / 2, topY + 8);

  // ---------- 중상단: 총 집중 시간 ----------
  const mainY = 200;

  // 큰 숫자
  const totalStr = totalSeconds > 0 ? formatTotalTime(totalSeconds) : `${pomodoroCount * 25}분`;
  ctx.font = `800 88px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;
  ctx.fillStyle = T.text;
  ctx.textAlign = 'center';

  // 그라디언트 텍스트
  const textGrad = ctx.createLinearGradient(0, mainY - 80, CARD_W, mainY);
  textGrad.addColorStop(0, T.accent);
  textGrad.addColorStop(1, theme === 'dark' ? '#A5B4FC' : '#818CF8');
  ctx.fillStyle = textGrad;
  ctx.fillText(totalStr, CARD_W / 2, mainY);

  // 서브 텍스트
  ctx.font = `500 30px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;
  ctx.fillStyle = T.textSub;
  ctx.fillText('집중했어요 📚', CARD_W / 2, mainY + 48);

  // ---------- 중앙: 도넛 차트 ----------
  const chartCenterY = 480;
  const chartCenterX = CARD_W / 2;

  if (subjects.length > 0) {
    // 도넛
    drawDonutChart(ctx, chartCenterX, chartCenterY, 110, 65, subjects, totalSeconds);

    // 차트 중앙 텍스트
    ctx.font = `700 28px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = T.text;
    ctx.textAlign = 'center';
    ctx.fillText(`${subjects.length}과목`, chartCenterX, chartCenterY + 10);

    // 범례 패널
    const legendX = 40;
    const legendW = CARD_W - 80;
    const legendH = Math.min(subjects.length * 36 + 32, 200);
    const legendY = chartCenterY + 130;

    roundRect(ctx, legendX, legendY, legendW, legendH, 16);
    ctx.fillStyle = T.surface;
    ctx.fill();

    drawLegend(ctx, legendX + 20, legendY + 20, subjects, theme, legendW - 40);

  } else {
    // 뽀모도로 횟수만 표시 (과목 없을 때)
    ctx.beginPath();
    ctx.arc(chartCenterX, chartCenterY, 110, 0, Math.PI * 2);
    ctx.fillStyle = T.surface;
    ctx.fill();
    ctx.strokeStyle = T.accent;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = `700 60px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = T.accent;
    ctx.textAlign = 'center';
    ctx.fillText(`🍅`, chartCenterX, chartCenterY + 20);
  }

  // ---------- 하단: 뽀모도로 카운트 ----------
  const pomY = subjects.length > 0 ? 820 : 740;

  // 구분선
  ctx.strokeStyle = T.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, pomY - 24);
  ctx.lineTo(CARD_W - 60, pomY - 24);
  ctx.stroke();

  // 뽀모도로 수
  const pomText = `🍅 × ${pomodoroCount}`;
  ctx.font = `700 36px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;
  ctx.fillStyle = T.text;
  ctx.textAlign = 'center';
  ctx.fillText(pomText, CARD_W / 2, pomY + 16);

  ctx.font = `400 22px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;
  ctx.fillStyle = T.textMuted;
  ctx.fillText('뽀모도로 완료', CARD_W / 2, pomY + 48);

  // ---------- 최하단: 브랜딩 ----------
  const brandY = CARD_H - 56;

  roundRect(ctx, 60, brandY - 28, CARD_W - 120, 48, 24);
  ctx.fillStyle = T.surface;
  ctx.fill();

  ctx.font = `600 22px -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`;
  ctx.fillStyle = T.watermark;
  ctx.textAlign = 'center';
  ctx.fillText('pomodoro-study-card.vercel.app', CARD_W / 2, brandY + 4);

  // 테두리
  drawCardBorder(ctx, theme);
}

/* ---------- 초기화 ---------- */
window.renderStudyCard = renderStudyCard;
