/* ============================================
   app.js — 뽀모도로 타이머 + 과목 기록 관리
   ============================================ */

// ---------- 상수 ----------
const DURATIONS = {
  work: 25 * 60,       // 25분
  shortBreak: 5 * 60,  // 5분
  longBreak: 30 * 60,  // 30분
};

const SUBJECT_COLORS = [
  '#6366F1', // 인디고
  '#EC4899', // 핑크
  '#F59E0B', // 앰버
  '#10B981', // 에메랄드
  '#3B82F6', // 블루
];

const MAX_SUBJECTS = 5;
const RING_CIRCUMFERENCE = 553; // 2π × 88

// ---------- 상태 ----------
let state = {
  mode: 'work',          // 'work' | 'shortBreak' | 'longBreak'
  timeLeft: DURATIONS.work,
  isRunning: false,
  pomodoroCount: 0,      // 오늘 완료된 뽀모도로 수
  currentCycle: 1,       // 현재 사이클 (1~4)
  currentSubject: null,  // 현재 선택된 과목명
  subjects: [],          // [{name, seconds, color}]
  sessionStartTime: null,// 현재 세션 시작 시간 (ms)
  date: getTodayString(),
};

let timerInterval = null;
let audioCtx = null;

// ---------- 날짜 유틸 ----------
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ---------- localStorage ----------
function saveState() {
  const data = {
    date: state.date,
    pomodoroCount: state.pomodoroCount,
    subjects: state.subjects,
  };
  localStorage.setItem('psc_state', JSON.stringify(data));
}

function loadState() {
  try {
    const raw = localStorage.getItem('psc_state');
    if (!raw) return;
    const data = JSON.parse(raw);
    // 날짜가 다르면 초기화 (새 날)
    if (data.date !== getTodayString()) {
      localStorage.removeItem('psc_state');
      return;
    }
    state.pomodoroCount = data.pomodoroCount || 0;
    state.subjects = data.subjects || [];
    state.date = data.date;
  } catch (e) {
    console.warn('상태 불러오기 실패:', e);
  }
}

// ---------- Web Audio API 비프음 ----------
function playBeep(freq = 880, duration = 0.3, vol = 0.4) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('오디오 재생 실패:', e);
  }
}

function playCompletionSound() {
  // 세 음 연속 재생
  playBeep(660, 0.2, 0.4);
  setTimeout(() => playBeep(880, 0.2, 0.4), 220);
  setTimeout(() => playBeep(1100, 0.3, 0.4), 440);
}

// ---------- 과목 관리 ----------
function getSubjectByName(name) {
  return state.subjects.find(s => s.name === name);
}

function addSubject(name) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (state.subjects.length >= MAX_SUBJECTS) {
    showToast(`과목은 최대 ${MAX_SUBJECTS}개까지 추가할 수 있어요`);
    return false;
  }
  if (getSubjectByName(trimmed)) {
    showToast('이미 추가된 과목이에요');
    return false;
  }
  const color = SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length];
  state.subjects.push({ name: trimmed, seconds: 0, color });
  saveState();
  renderSubjectSelect();
  renderSubjectChips();
  renderStats();
  return true;
}

function removeSubject(name) {
  state.subjects = state.subjects.filter(s => s.name !== name);
  if (state.currentSubject === name) {
    state.currentSubject = null;
  }
  saveState();
  renderSubjectSelect();
  renderSubjectChips();
  renderStats();
}

// ---------- 시간 포맷 ----------
function formatSeconds(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${s}초`;
}

function formatTimer(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

// ---------- 렌더링 ----------
function renderTimer() {
  const el = document.getElementById('timerDisplay');
  if (el) el.textContent = formatTimer(state.timeLeft);

  // 프로그레스 링 업데이트
  const total = DURATIONS[state.mode];
  const progress = state.timeLeft / total;
  const offset = RING_CIRCUMFERENCE * (1 - progress);
  const ring = document.getElementById('ringProgress');
  if (ring) {
    ring.style.strokeDashoffset = offset;
    ring.className = 'ring-progress' + (state.mode === 'shortBreak' ? ' break' : state.mode === 'longBreak' ? ' long-break' : '');
  }
}

function renderModeLabel() {
  const el = document.getElementById('modeLabel');
  if (!el) return;
  const labels = {
    work: '집중 시간',
    shortBreak: '짧은 휴식',
    longBreak: '긴 휴식 ☕',
  };
  el.textContent = labels[state.mode];
  el.className = 'timer-mode-label' + (state.mode === 'shortBreak' ? ' break' : state.mode === 'longBreak' ? ' long-break' : '');
}

function renderDots() {
  const dots = document.querySelectorAll('.dot');
  dots.forEach((dot, i) => {
    dot.className = 'dot';
    const cycleIndex = i; // 0-based
    const completed = state.pomodoroCount % 4; // 현재 사이클에서 몇 개 완료
    const totalCompleted = state.pomodoroCount;

    if (i < completed % 4 || (completed === 4 && state.mode !== 'work')) {
      // 현재 사이클에서 완료
    }

    // 더 단순하게: 현재 사이클 기준
    const cycleCompleted = (state.mode !== 'work') ? state.currentCycle - 1 : state.currentCycle - 1;
    const inCycle = state.pomodoroCount % 4;

    if (i < inCycle) {
      dot.classList.add('done');
    } else if (i === inCycle && state.mode === 'work') {
      dot.classList.add('current');
    }
  });
}

function renderSessionLabel() {
  const el = document.getElementById('sessionLabel');
  if (!el) return;
  if (state.mode === 'work') {
    const inCycle = (state.pomodoroCount % 4) + 1;
    el.textContent = `${inCycle} / 4`;
  } else if (state.mode === 'shortBreak') {
    el.textContent = '짧은 휴식 중';
  } else {
    el.textContent = '긴 휴식 중 🎉';
  }
}

function renderStartButton() {
  const iconPlay = document.getElementById('iconPlay');
  const iconPause = document.getElementById('iconPause');
  const btnStart = document.getElementById('btnStart');
  if (!btnStart) return;

  if (state.isRunning) {
    iconPlay && (iconPlay.style.display = 'none');
    iconPause && (iconPause.style.display = 'block');
    btnStart.classList.add('running');
    document.body.classList.add('is-running');
  } else {
    iconPlay && (iconPlay.style.display = 'block');
    iconPause && (iconPause.style.display = 'none');
    btnStart.classList.remove('running');
    document.body.classList.remove('is-running');
  }
}

function renderThemeIcons() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const moon = document.getElementById('iconMoon');
  const sun = document.getElementById('iconSun');
  if (isDark) {
    moon && (moon.style.display = 'block');
    sun && (sun.style.display = 'none');
  } else {
    moon && (moon.style.display = 'none');
    sun && (sun.style.display = 'block');
  }
}

function renderSubjectSelect() {
  const select = document.getElementById('subjectSelect');
  if (!select) return;
  const current = state.currentSubject;
  select.innerHTML = '<option value="">과목 선택 (선택사항)</option>';
  state.subjects.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.name;
    opt.textContent = s.name;
    if (s.name === current) opt.selected = true;
    select.appendChild(opt);
  });
}

function renderSubjectChips() {
  const container = document.getElementById('subjectChips');
  if (!container) return;
  container.innerHTML = '';
  state.subjects.forEach(s => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `
      <span class="chip-dot" style="background:${s.color}"></span>
      <span>${s.name}</span>
      <button class="chip-remove" data-name="${s.name}" aria-label="${s.name} 삭제">×</button>
    `;
    container.appendChild(chip);
  });

  container.querySelectorAll('.chip-remove').forEach(btn => {
    btn.addEventListener('click', () => removeSubject(btn.dataset.name));
  });
}

function renderStats() {
  const skeleton = document.getElementById('skeletonList');
  const statsEl = document.getElementById('subjectStats');
  const emptyEl = document.getElementById('emptyState');
  const btnCard = document.getElementById('btnCreateCard');
  const totalEl = document.getElementById('totalTimeDisplay');

  // 스켈레톤 제거
  if (skeleton) skeleton.style.display = 'none';

  const totalSeconds = state.subjects.reduce((acc, s) => acc + s.seconds, 0);
  const hasPomodoroData = state.pomodoroCount > 0;

  if (totalEl) {
    totalEl.textContent = hasPomodoroData ? formatSeconds(totalSeconds) : '0분';
  }

  if (!hasPomodoroData && state.subjects.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    if (statsEl) statsEl.style.display = 'none';
    if (btnCard) btnCard.style.display = 'none';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  // 과목 데이터 있으면 표시
  if (state.subjects.some(s => s.seconds > 0)) {
    if (statsEl) {
      statsEl.style.display = 'flex';
      statsEl.innerHTML = '';
      const maxSeconds = Math.max(...state.subjects.map(s => s.seconds), 1);
      state.subjects
        .filter(s => s.seconds > 0)
        .forEach(s => {
          const item = document.createElement('div');
          item.className = 'subject-stat-item';
          const pct = Math.round((s.seconds / maxSeconds) * 100);
          item.innerHTML = `
            <span class="subject-color-dot" style="background:${s.color}"></span>
            <div class="subject-stat-info">
              <div class="subject-stat-name">
                <span>${s.name}</span>
                <span class="subject-stat-time">${formatSeconds(s.seconds)}</span>
              </div>
              <div class="subject-progress-bar">
                <div class="subject-progress-fill" style="width:${pct}%;background:${s.color}"></div>
              </div>
            </div>
          `;
          statsEl.appendChild(item);
        });
    }
  } else if (hasPomodoroData) {
    // 뽀모도로는 했지만 과목 미선택
    if (statsEl) {
      statsEl.style.display = 'flex';
      statsEl.innerHTML = `<div style="font-size:14px;color:var(--text-sub)">🍅 뽀모도로 ${state.pomodoroCount}개 완료<br><small style="color:var(--text-muted)">과목을 선택하면 과목별 시간이 기록돼요</small></div>`;
    }
  }

  // 카드 버튼 표시
  if (btnCard) {
    btnCard.style.display = hasPomodoroData ? 'flex' : 'none';
  }
}

// ---------- 타이머 로직 ----------
function startTimer() {
  if (state.isRunning) return;

  // AudioContext 재개 (사용자 제스처 필요)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  state.isRunning = true;
  state.sessionStartTime = Date.now();
  renderStartButton();

  timerInterval = setInterval(() => {
    state.timeLeft--;
    renderTimer();

    if (state.timeLeft <= 0) {
      onTimerComplete();
    }
  }, 1000);
}

function pauseTimer() {
  if (!state.isRunning) return;
  clearInterval(timerInterval);
  timerInterval = null;
  state.isRunning = false;

  // 일시정지 시 현재 과목에 시간 누적
  if (state.mode === 'work' && state.currentSubject && state.sessionStartTime) {
    const elapsed = Math.floor((Date.now() - state.sessionStartTime) / 1000);
    accumulateSubjectTime(state.currentSubject, elapsed);
    state.sessionStartTime = Date.now(); // 리셋
  }

  renderStartButton();
  renderStats();
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  state.isRunning = false;
  state.timeLeft = DURATIONS[state.mode];
  state.sessionStartTime = null;
  renderTimer();
  renderStartButton();
  renderDots();
}

function skipSession() {
  if (state.isRunning) pauseTimer();
  advanceMode();
}

function onTimerComplete() {
  clearInterval(timerInterval);
  timerInterval = null;
  state.isRunning = false;

  playCompletionSound();

  if (state.mode === 'work') {
    // 뽀모도로 완료
    state.pomodoroCount++;

    // 과목 시간 누적
    if (state.currentSubject && state.sessionStartTime) {
      accumulateSubjectTime(state.currentSubject, DURATIONS.work);
    }

    saveState();
    renderStats();

    // 4사이클마다 긴 휴식
    if (state.pomodoroCount % 4 === 0) {
      showToast('🎉 4사이클 완료! 긴 휴식을 취해요 (30분)');
      setMode('longBreak');
    } else {
      showToast('✅ 뽀모도로 완료! 짧게 쉬어요 (5분)');
      setMode('shortBreak');
    }
    state.currentCycle++;
  } else {
    // 휴식 완료 → 작업 모드
    showToast('💪 다시 집중해봐요!');
    setMode('work');
  }

  renderDots();
  renderSessionLabel();
  renderStartButton();
  document.body.classList.remove('is-running');
}

function advanceMode() {
  if (state.mode === 'work') {
    state.pomodoroCount++;
    setMode(state.pomodoroCount % 4 === 0 ? 'longBreak' : 'shortBreak');
  } else {
    setMode('work');
  }
  renderDots();
  renderSessionLabel();
}

function setMode(mode) {
  state.mode = mode;
  state.timeLeft = DURATIONS[mode];
  state.sessionStartTime = null;
  renderTimer();
  renderModeLabel();
}

function accumulateSubjectTime(subjectName, seconds) {
  const subj = getSubjectByName(subjectName);
  if (subj && seconds > 0) {
    subj.seconds += seconds;
    saveState();
  }
}

// ---------- 주제 누적 (타이머 실행 중) ----------
// 1분마다 현재 진행 중인 과목 시간 중간 저장
let accumulateInterval = null;

function startAccumulating() {
  clearInterval(accumulateInterval);
  accumulateInterval = setInterval(() => {
    if (state.isRunning && state.mode === 'work' && state.currentSubject && state.sessionStartTime) {
      const elapsed = Math.floor((Date.now() - state.sessionStartTime) / 1000);
      const subj = getSubjectByName(state.currentSubject);
      if (subj) {
        // 임시로 화면만 업데이트 (saveState는 주기적으로)
        renderStats();
      }
    }
  }, 30000); // 30초마다 UI 업데이트
}

// ---------- 토스트 ----------
let toastTimeout = null;
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ---------- 테마 토글 ----------
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
  renderThemeIcons();
  localStorage.setItem('psc_theme', html.getAttribute('data-theme'));
}

function loadTheme() {
  const saved = localStorage.getItem('psc_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    renderThemeIcons();
  }
}

// ---------- 이벤트 바인딩 ----------
function bindEvents() {
  // 시작/일시정지
  document.getElementById('btnStart')?.addEventListener('click', () => {
    if (state.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });

  // 리셋
  document.getElementById('btnReset')?.addEventListener('click', () => {
    resetTimer();
    showToast('타이머 리셋됨');
  });

  // 건너뛰기
  document.getElementById('btnSkip')?.addEventListener('click', skipSession);

  // 테마 전환
  document.getElementById('btnTheme')?.addEventListener('click', toggleTheme);

  // 과목 선택
  document.getElementById('subjectSelect')?.addEventListener('change', (e) => {
    state.currentSubject = e.target.value || null;
  });

  // 과목 추가 모달 열기
  document.getElementById('btnAddSubject')?.addEventListener('click', openAddSubjectModal);

  // 모달 닫기
  document.getElementById('btnCloseModal')?.addEventListener('click', closeAddSubjectModal);
  document.getElementById('addSubjectModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAddSubjectModal();
  });

  // 과목 확인
  document.getElementById('btnConfirmSubject')?.addEventListener('click', confirmAddSubject);
  document.getElementById('subjectInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAddSubject();
  });

  // 카드 생성
  document.getElementById('btnCreateCard')?.addEventListener('click', openCardModal);

  // 카드 모달 닫기
  document.getElementById('btnCloseCardModal')?.addEventListener('click', closeCardModal);
  document.getElementById('cardModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCardModal();
  });

  // 카드 테마
  document.getElementById('btnCardThemeDark')?.addEventListener('click', () => {
    renderStudyCard('dark');
    updateCardThemeButtons('dark');
  });
  document.getElementById('btnCardThemeLight')?.addEventListener('click', () => {
    renderStudyCard('light');
    updateCardThemeButtons('light');
  });

  // 다운로드
  document.getElementById('btnDownloadCard')?.addEventListener('click', downloadCard);

  // 키보드 단축키
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (state.isRunning) pauseTimer();
      else startTimer();
    }
    if (e.key === 'Escape') {
      closeAddSubjectModal();
      closeCardModal();
    }
  });
}

function confirmAddSubject() {
  const input = document.getElementById('subjectInput');
  if (!input) return;
  const val = input.value.trim();
  if (addSubject(val)) {
    input.value = '';
    showToast(`'${val}' 추가됨`);
  }
}

function openAddSubjectModal() {
  const modal = document.getElementById('addSubjectModal');
  if (modal) {
    modal.classList.add('active');
    setTimeout(() => document.getElementById('subjectInput')?.focus(), 100);
    renderSubjectChips();
  }
}

function closeAddSubjectModal() {
  document.getElementById('addSubjectModal')?.classList.remove('active');
}

function openCardModal() {
  const modal = document.getElementById('cardModal');
  if (modal) {
    modal.classList.add('active');
    setTimeout(() => {
      renderStudyCard('dark');
      updateCardThemeButtons('dark');
    }, 50);
  }
}

function closeCardModal() {
  document.getElementById('cardModal')?.classList.remove('active');
}

function updateCardThemeButtons(theme) {
  const darkBtn = document.getElementById('btnCardThemeDark');
  const lightBtn = document.getElementById('btnCardThemeLight');
  if (darkBtn) darkBtn.classList.toggle('active', theme === 'dark');
  if (lightBtn) lightBtn.classList.toggle('active', theme === 'light');
}

function downloadCard() {
  const canvas = document.getElementById('studyCard');
  if (!canvas) return;
  const link = document.createElement('a');
  const today = getTodayString().replace(/-/g, '');
  link.download = `공부기록_${today}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('카드 저장 완료! 📱 인스타에 올려보세요');
}

// ---------- 초기화 ----------
function init() {
  loadState();
  loadTheme();
  bindEvents();

  // 스켈레톤 → 실제 데이터
  setTimeout(() => {
    renderStats();
    renderSubjectSelect();
    renderDots();
    renderSessionLabel();
    renderTimer();
    renderModeLabel();
  }, 800); // 스켈레톤 보여주는 척

  startAccumulating();
}

// DOM 준비 후 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// card.js에서 접근할 수 있도록 state 노출
window.appState = state;
window.getTodayString = getTodayString;
window.formatSeconds = formatSeconds;
