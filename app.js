/**
 * 마비노기 모바일 캐릭터 & 직업별 목표 스탯 매니저
 * - 100% 정적 웹 (GitHub Pages 호환, LocalStorage 자동 저장 + JSON 백업/복원)
 * - 계층 구조: 서버(던컨 등) > 캐릭터(로산나 등) > 클래스 세팅 슬롯(석궁사수 등)
 * - 인게임 스탯 창과 동일한 21종 스탯 레이아웃 + OCR 자동 추출 지원
 */

const STORAGE_KEY = 'MABI_MOBILE_STAT_MANAGER_V1';

// 인게임 스크린샷과 완벽히 동일한 스탯 정의
const PRIMARY_STATS = [
  { key: 'str', label: '힘', icon: '✊', color: 'text-rose-400', badgeBg: 'bg-rose-500/15' },
  { key: 'dex', label: '솜씨', icon: '🤲', color: 'text-amber-400', badgeBg: 'bg-amber-500/15' },
  { key: 'int', label: '지력', icon: '🧠', color: 'text-sky-400', badgeBg: 'bg-sky-500/15' },
  { key: 'wil', label: '의지', icon: '🔮', color: 'text-purple-400', badgeBg: 'bg-purple-500/15' },
  { key: 'luk', label: '행운', icon: '🍀', color: 'text-emerald-400', badgeBg: 'bg-emerald-500/15' }
];

const COMBAT_STATS = [
  { key: 'atk', label: '공격력', icon: '🗡️', color: 'text-gray-100' },
  { key: 'def', label: '방어력', icon: '🛡️', color: 'text-gray-100' }
];

// 인게임 세부 스탯 14종 (좌/우 2열 7행 순서 그대로 배치)
const DETAIL_STATS = [
  { key: 'breakPower', label: '브레이크', aliases: ['브레이크'], icon: '💥', color: 'text-orange-400' },
  { key: 'dmgReduce', label: '피해 감소', aliases: ['피해감소', '피해 감소'], icon: '🛡️', color: 'text-orange-400' },
  { key: 'smashBoost', label: '강타 강화', aliases: ['강타강화', '강타 강화', '강타'], icon: '☄️', color: 'text-red-400' },
  { key: 'atkSpeed', label: '빠른 공격', aliases: ['빠른공격', '빠른 공격'], icon: '⚡', color: 'text-amber-400' },
  { key: 'comboBoost', label: '콤보 강화', aliases: ['콤보강화', '콤보 강화', '콤보'], icon: '🌙', color: 'text-amber-400' },
  { key: 'multiHit', label: '연타 강화', aliases: ['연타강화', '연타 강화', '연타'], icon: '🏹', color: 'text-amber-300' },
  { key: 'skillPower', label: '스킬 위력', aliases: ['스킬위력', '스킬 위력'], icon: '✨', color: 'text-cyan-400' },
  { key: 'skillSpeed', label: '빠른 스킬', aliases: ['빠른스킬', '빠른 스킬'], icon: '💫', color: 'text-cyan-400' },
  { key: 'aoeBoost', label: '광역 강화', aliases: ['광역강화', '광역 강화', '광역'], icon: '🌀', color: 'text-sky-400' },
  { key: 'bonusHp', label: '추가 체력', aliases: ['추가체력', '추가 체력'], icon: '💜', color: 'text-fuchsia-400' },
  { key: 'healPower', label: '회복력', aliases: ['회복력'], icon: '➕', color: 'text-pink-400' },
  { key: 'ultimate', label: '궁극기', aliases: ['궁극기'], icon: '🌌', color: 'text-purple-400' },
  { key: 'critEvasion', label: '급소 회피', aliases: ['급소회피', '급소 회피'], icon: '🏃', color: 'text-emerald-400' },
  { key: 'critRate', label: '치명타', aliases: ['치명타'], icon: '✳️', color: 'text-green-400' },
  { key: 'extraHit', label: '추가타', aliases: ['추가타'], icon: '🟢', color: 'text-emerald-300' }
];

const ALL_STATS = [...PRIMARY_STATS, ...COMBAT_STATS, ...DETAIL_STATS];
const STAT_MAP = Object.fromEntries(ALL_STATS.map(s => [s.key, s]));

// 초기 기본 샘플 데이터 (유저가 요청한 던컨 > 로산나 > 석궁사수 + 업로드한 스크린샷 수치 100% 반영)
function getInitialSampleState() {
  return {
    servers: ['던컨', '데이안', '아이라', '메이븐', '칼릭스'],
    selectedServer: '던컨',
    selectedCharacterId: 'char_rosanna',
    selectedSlotId: 'slot_rosanna_crossbow',
    editingPresetId: 'preset_crossbow_s1',

    // 직업별 목표 스탯 기준표 사전
    jobPresets: [
      {
        id: 'preset_crossbow_s1',
        jobName: '석궁사수',
        seasonTag: '시즌 표준 세팅 (연타 몰빵)',
        highlightPrimary: 'dex', // 솜씨 주스탯
        targets: {
          // 필수 목표(min) 및 고점 권장(rec)
          skillPower: { min: 5000, rec: 5000, priority: '필수', note: '스킬 위력 5000+ 커트라인' },
          critRate:   { min: 8500, rec: 9000, priority: '필수', note: '기본 8500+ / 고점 세팅 시 9000+ 권장' },
          extraHit:   { min: 2500, rec: 2500, priority: '필수', note: '추가타 2500+ 커트라인' }
        },
        dumpStats: ['multiHit'], // 남은 스탯 몰빵 항목: 연타 강화
        guideMemo: '스킬 위력 5000+ / 치명타 8500+ / 추가타 2500+ 를 우선 맞추고, 남은 스탯은 [연타 강화]에 몰빵해 주세요.\n치명타를 더 주고 싶으신 분들은 9000+도 좋습니다.'
      },
      {
        id: 'preset_warrior_sample',
        jobName: '전사',
        seasonTag: '강타·브레이크 표준 (예시)',
        highlightPrimary: 'str',
        targets: {
          critRate:   { min: 7500, rec: 8500, priority: '필수', note: '치명타 기본 확보' },
          smashBoost: { min: 5500, rec: 6500, priority: '필수', note: '주력 강타 딜링 강화' },
          skillPower: { min: 4500, rec: 5000, priority: '권장', note: '스킬 위력 확보' }
        },
        dumpStats: ['smashBoost', 'breakPower'],
        guideMemo: '시즌 및 착용 룬에 따라 목표 수치를 직접 수정해 사용하세요.'
      },
      {
        id: 'preset_bard_sample',
        jobName: '음유시인',
        seasonTag: '빠른 스킬·회복 서포터 (예시)',
        highlightPrimary: 'dex',
        targets: {
          skillPower: { min: 5000, rec: 6000, priority: '필수', note: '버프/스킬 효율' },
          skillSpeed: { min: 4500, rec: 5500, priority: '필수', note: '스킬 쿨타임 및 선후딜 감소' },
          healPower:  { min: 4000, rec: 5000, priority: '권장', note: '파티 유지력 강화' }
        },
        dumpStats: ['skillSpeed', 'healPower'],
        guideMemo: '서포팅/딜링 세팅 여부에 맞춰 기준표를 자유롭게 변경하세요.'
      }
    ],

    // 내 캐릭터 목록 (서버 > 캐릭터 > 보유 클래스 슬롯)
    characters: [
      {
        id: 'char_rosanna',
        server: '던컨',
        name: '로산나',
        slots: [
          {
            id: 'slot_rosanna_crossbow',
            slotName: '석궁사수',
            presetId: 'preset_crossbow_s1',
            updatedAt: '2026-10-17',
            memo: '업로드한 스크린샷 기준 스탯 (스킬 위력·치명타·추가타 보완 후 연타 강화 몰빵 예정)',
            stats: {
              // 업로드된 스크린샷과 100% 동일한 수치
              str: 5388,
              dex: 6356,
              int: 5489,
              wil: 4981,
              luk: 5754,
              atk: 40320,
              def: 20383,
              breakPower: 1820,
              dmgReduce: 3085,
              smashBoost: 2292,
              atkSpeed: 2914,
              comboBoost: 1947,
              multiHit: 3383,
              skillPower: 4507,
              skillSpeed: 1565,
              aoeBoost: 1506,
              bonusHp: 47657,
              healPower: 2141,
              ultimate: 1781,
              critEvasion: 2238,
              critRate: 7972,
              extraHit: 1672
            }
          }
        ]
      }
    ]
  };
}

let appState = loadState();
let pendingOcrStats = {};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialSampleState();
    const parsed = JSON.parse(raw);
    if (!parsed.characters || !parsed.jobPresets) return getInitialSampleState();
    return parsed;
  } catch (e) {
    console.error('Failed to load state:', e);
    return getInitialSampleState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

function formatNum(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('ko-KR');
}

// 현재 선택된 캐릭터/슬롯/프리셋 헬퍼
function getCurrentCharacter() {
  let char = appState.characters.find(c => c.id === appState.selectedCharacterId && c.server === appState.selectedServer);
  if (!char) {
    char = appState.characters.find(c => c.server === appState.selectedServer);
    if (char) appState.selectedCharacterId = char.id;
  }
  return char || null;
}

function getCurrentSlot() {
  const char = getCurrentCharacter();
  if (!char || !char.slots || char.slots.length === 0) return null;
  let slot = char.slots.find(s => s.id === appState.selectedSlotId);
  if (!slot) {
    slot = char.slots[0];
    appState.selectedSlotId = slot.id;
  }
  return slot;
}

function getCurrentPreset() {
  const slot = getCurrentSlot();
  if (!slot) return appState.jobPresets[0];
  return appState.jobPresets.find(p => p.id === slot.presetId) || appState.jobPresets[0];
}

// ================= VIEW SWITCHING =================
function switchMainView(view) {
  const viewChar = document.getElementById('viewCharacter');
  const viewPresets = document.getElementById('viewPresets');
  const btnChar = document.getElementById('tabBtnCharacter');
  const btnPresets = document.getElementById('tabBtnPresets');

  if (view === 'character') {
    viewChar.classList.remove('hidden');
    viewPresets.classList.add('hidden');
    btnChar.className = 'px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all bg-amber-500 text-slate-950 shadow';
    btnPresets.className = 'px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all text-gray-400 hover:text-white';
    renderCharacterView();
  } else {
    viewChar.classList.add('hidden');
    viewPresets.classList.remove('hidden');
    btnPresets.className = 'px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all bg-amber-500 text-slate-950 shadow';
    btnChar.className = 'px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all text-gray-400 hover:text-white';
    renderPresetsView();
  }
}

// ================= RENDER CHARACTER VIEW =================
function renderCharacterView() {
  renderHierarchySelectors();
  renderLeftStatPanel();
  renderRightComparisonPanel();
}

function renderHierarchySelectors() {
  const serverSelect = document.getElementById('serverSelect');
  const characterSelect = document.getElementById('characterSelect');
  const slotSelect = document.getElementById('slotSelect');
  const linkedPresetSelect = document.getElementById('linkedPresetSelect');
  const breadcrumb = document.getElementById('hierarchyBreadcrumb');

  // 1. 서버 목록
  serverSelect.innerHTML = appState.servers.map(srv => {
    const count = appState.characters.filter(c => c.server === srv).length;
    return `<option value="${srv}" ${srv === appState.selectedServer ? 'selected' : ''}>${srv} (${count}캐릭)</option>`;
  }).join('');

  // 2. 현재 서버의 캐릭터 목록
  const charsInServer = appState.characters.filter(c => c.server === appState.selectedServer);
  const currentChar = getCurrentCharacter();

  if (charsInServer.length === 0) {
    characterSelect.innerHTML = `<option value="">캐릭터 없음 (+ 추가해주세요)</option>`;
  } else {
    characterSelect.innerHTML = charsInServer.map(c =>
      `<option value="${c.id}" ${currentChar && c.id === currentChar.id ? 'selected' : ''}>${c.name} (${c.slots.length}세팅)</option>`
    ).join('');
  }

  // 3. 현재 캐릭터의 클래스 슬롯 목록
  const currentSlot = getCurrentSlot();
  if (!currentChar || currentChar.slots.length === 0) {
    slotSelect.innerHTML = `<option value="">직업 세팅 없음</option>`;
  } else {
    slotSelect.innerHTML = currentChar.slots.map(s => {
      const preset = appState.jobPresets.find(p => p.id === s.presetId);
      const presetLabel = preset ? `${preset.jobName} - ${preset.seasonTag}` : '기준표 미지정';
      return `<option value="${s.id}" ${currentSlot && s.id === currentSlot.id ? 'selected' : ''}>${s.slotName} [${presetLabel}]</option>`;
    }).join('');
  }

  // 4. 연결된 직업 기준표 드롭다운
  const currentPreset = getCurrentPreset();
  linkedPresetSelect.innerHTML = appState.jobPresets.map(p =>
    `<option value="${p.id}" ${currentPreset && p.id === currentPreset.id ? 'selected' : ''}>${p.jobName} (${p.seasonTag})</option>`
  ).join('');

  // 5. 브레드크럼 표시 (던컨 > 로산나 > 석궁사수)
  if (currentChar && currentSlot) {
    breadcrumb.innerHTML = `
      <span class="text-gray-300">${appState.selectedServer}</span>
      <span class="text-gray-600">›</span>
      <span class="text-white">${currentChar.name}</span>
      <span class="text-gray-600">›</span>
      <span class="text-amber-400 font-bold">${currentSlot.slotName}</span>
    `;
    document.getElementById('currentSlotBadge').textContent = currentSlot.slotName;
    document.getElementById('slotMemoInput').value = currentSlot.memo || '';
  } else {
    breadcrumb.innerHTML = `<span class="text-gray-400">서버에 캐릭터를 먼저 추가해주세요</span>`;
    document.getElementById('currentSlotBadge').textContent = '-';
    document.getElementById('slotMemoInput').value = '';
  }
}

function renderLeftStatPanel() {
  const primaryGrid = document.getElementById('primaryStatsGrid');
  const combatGrid = document.getElementById('combatStatsGrid');
  const detailGrid = document.getElementById('detailStatsGrid');

  const slot = getCurrentSlot();
  const preset = getCurrentPreset();

  if (!slot) {
    primaryGrid.innerHTML = `<div class="col-span-5 text-center py-6 text-xs text-gray-500">캐릭터 또는 직업 슬롯을 추가해주세요.</div>`;
    combatGrid.innerHTML = '';
    detailGrid.innerHTML = '';
    return;
  }

  const stats = slot.stats || {};
  const targets = (preset && preset.targets) ? preset.targets : {};
  const dumpStats = (preset && preset.dumpStats) ? preset.dumpStats : [];
  const highlightPrimary = preset ? preset.highlightPrimary : 'dex';

  // 1. 5대 기본 스탯 (힘, 솜씨, 지력, 의지, 행운)
  primaryGrid.innerHTML = PRIMARY_STATS.map(st => {
    const isMain = st.key === highlightPrimary;
    const val = stats[st.key] ?? 0;
    return `
      <div class="flex flex-col items-center p-2 rounded-xl transition ${isMain ? 'bg-amber-500/10 border border-amber-500/40 stat-glow-gold' : 'hover:bg-white/5'}">
        <div class="text-lg mb-0.5">${st.icon}</div>
        <span class="text-xs font-semibold ${st.color} mb-1">${st.label}</span>
        <input
          type="number"
          value="${val}"
          onchange="updateStatValue('${st.key}', this.value)"
          class="w-full text-center bg-transparent font-extrabold text-sm md:text-base text-white focus:outline-none focus:bg-black/40 rounded py-0.5"
        />
      </div>
    `;
  }).join('');

  // 2. 공격력 / 방어력
  combatGrid.innerHTML = COMBAT_STATS.map(st => {
    const val = stats[st.key] ?? 0;
    return `
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs md:text-sm font-semibold text-gray-300 flex items-center gap-1.5">
          <span>${st.icon}</span> ${st.label}
        </span>
        <input
          type="number"
          value="${val}"
          onchange="updateStatValue('${st.key}', this.value)"
          class="w-24 text-right bg-black/25 border border-transparent focus:border-amber-500 rounded-lg px-2 py-1 font-extrabold text-sm md:text-base text-white focus:outline-none"
        />
      </div>
    `;
  }).join('');

  // 3. 세부 스탯 14종 (인게임 2열 배치 동일)
  detailGrid.innerHTML = DETAIL_STATS.map(st => {
    const val = stats[st.key] ?? 0;
    const isTarget = Boolean(targets[st.key] && (targets[st.key].min > 0 || targets[st.key].rec > 0));
    const isDump = dumpStats.includes(st.key);

    let badgeHtml = '';
    let rowBorder = 'border-transparent';
    if (isTarget) {
      const minVal = targets[st.key].min || 0;
      const met = val >= minVal;
      badgeHtml = `<span class="text-[10px] px-1.5 py-0.2 rounded ${met ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'} font-bold">⭐필수</span>`;
      rowBorder = met ? 'border-emerald-500/30 bg-emerald-950/15' : 'border-rose-500/40 bg-rose-950/20';
    } else if (isDump) {
      badgeHtml = `<span class="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold">🔥몰빵</span>`;
      rowBorder = 'border-sky-500/40 bg-sky-950/20';
    }

    return `
      <div class="flex items-center justify-between px-2.5 py-1.5 rounded-xl border ${rowBorder} transition">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="text-xs ${st.color}">${st.icon}</span>
          <span class="text-xs md:text-sm font-medium text-gray-200 truncate">${st.label}</span>
          ${badgeHtml}
        </div>
        <input
          type="number"
          value="${val}"
          onchange="updateStatValue('${st.key}', this.value)"
          class="w-20 text-right bg-black/30 border border-gray-700/60 focus:border-amber-400 rounded-lg px-2 py-0.5 font-bold text-sm text-white focus:outline-none"
        />
      </div>
    `;
  }).join('');
}

function renderRightComparisonPanel() {
  const summaryCard = document.getElementById('diagnosisSummaryCard');
  const comparisonList = document.getElementById('targetComparisonList');
  const dumpAndGuideCard = document.getElementById('dumpAndGuideCard');

  const char = getCurrentCharacter();
  const slot = getCurrentSlot();
  const preset = getCurrentPreset();

  if (!char || !slot || !preset) {
    summaryCard.innerHTML = `<div class="text-sm text-gray-400">표시할 캐릭터나 직업 세팅이 없습니다.</div>`;
    comparisonList.innerHTML = '';
    dumpAndGuideCard.innerHTML = '';
    return;
  }

  const stats = slot.stats || {};
  const targetEntries = Object.entries(preset.targets || {}).filter(([_, cfg]) => (cfg.min > 0 || cfg.rec > 0));

  let metCount = 0;
  let recMetCount = 0;
  const lackingSummary = [];

  targetEntries.forEach(([key, cfg]) => {
    const cur = Number(stats[key]) || 0;
    const min = Number(cfg.min) || 0;
    const rec = Number(cfg.rec) || min;
    const stInfo = STAT_MAP[key] || { label: key };

    if (cur >= min) {
      metCount++;
    } else {
      lackingSummary.push({
        label: stInfo.label,
        lack: min - cur
      });
    }
    if (cur >= rec) recMetCount++;
  });

  const totalTargets = targetEntries.length;
  const allMinMet = totalTargets > 0 && metCount === totalTargets;

  // 1. 상단 종합 진단 카드 렌더링
  summaryCard.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            ${char.server} · ${char.name}
          </span>
          <span class="text-xs text-gray-400">기준표: <strong class="text-gray-200">${preset.jobName} (${preset.seasonTag})</strong></span>
        </div>
        <h2 class="text-lg md:text-xl font-extrabold text-white mt-2">
          ${allMinMet
            ? '🎉 모든 필수 기준 스탯을 달성했습니다! 남은 스탯을 주력(몰빵) 스탯에 투자하세요.'
            : `⚠️ 필수 목표 ${totalTargets}개 중 <span class="text-rose-400">${totalTargets - metCount}개 항목</span>이 아직 기준치보다 부족합니다.`
          }
        </h2>
      </div>
      <div class="bg-black/30 border border-gray-700/70 rounded-2xl px-4 py-2.5 text-center min-w-[120px]">
        <div class="text-[11px] text-gray-400">필수 커트라인 달성</div>
        <div class="text-xl font-black ${allMinMet ? 'text-emerald-400' : 'text-amber-400'}">${metCount} / ${totalTargets}</div>
      </div>
    </div>

    ${lackingSummary.length > 0 ? `
      <div class="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-3.5 flex flex-wrap items-center gap-2">
        <span class="text-xs font-bold text-rose-300 mr-1">🚨 당장 보완할 스탯:</span>
        ${lackingSummary.map(item => `
          <span class="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-xs font-bold text-rose-200">
            ${item.label} <span class="text-white">+${formatNum(item.lack)}</span> 더 필요
          </span>
        `).join('')}
      </div>
    ` : `
      <div class="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3.5 text-xs font-semibold text-emerald-200">
        ✅ 필수 커트라인을 모두 넘겼습니다! 고점 권장 수치나 몰빵 스탯을 추가로 올리세요.
      </div>
    `}
  `;

  // 2. 개별 목표 스탯 비교 리스트 렌더링
  if (targetEntries.length === 0) {
    comparisonList.innerHTML = `
      <div class="text-center py-8 text-sm text-gray-400">
        설정된 필수 목표 스탯이 없습니다. 우측 상단 <strong>[⚙️ 목표 스탯 빠른 설정]</strong> 버튼을 눌러 기준을 추가해보세요.
      </div>
    `;
  } else {
    comparisonList.innerHTML = targetEntries.map(([key, cfg]) => {
      const stInfo = STAT_MAP[key] || { label: key, icon: '📊', color: 'text-gray-200' };
      const cur = Number(stats[key]) || 0;
      const min = Number(cfg.min) || 0;
      const rec = Number(cfg.rec) || min;
      const hasDistinctRec = rec > min;

      const diffMin = cur - min;
      const diffRec = cur - rec;
      const pctMin = min > 0 ? Math.min(100, Math.round((cur / min) * 1000) / 10) : 100;
      const pctForBar = Math.max(5, Math.min(100, pctMin));

      let statusBadge = '';
      let barColor = '';
      let diffText = '';

      if (cur < min) {
        statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">🔴 ${formatNum(Math.abs(diffMin))} 부족</span>`;
        barColor = 'bg-gradient-to-r from-rose-500 to-amber-500';
        diffText = `필수 기준(${formatNum(min)})까지 <strong class="text-rose-400">+${formatNum(Math.abs(diffMin))}</strong> 필요`;
      } else if (hasDistinctRec && cur < rec) {
        statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">🟢 필수 달성 (고점까지 -${formatNum(Math.abs(diffRec))})</span>`;
        barColor = 'bg-gradient-to-r from-emerald-500 to-teal-400';
        diffText = `필수 기준은 <strong class="text-emerald-400">+${formatNum(diffMin)} 초과 달성</strong>! 고점 권장(${formatNum(rec)})까지는 <strong class="text-amber-300">+${formatNum(Math.abs(diffRec))}</strong> 남음`;
      } else {
        statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">💎 목표 완벽 졸업 (+${formatNum(diffMin)})</span>`;
        barColor = 'bg-gradient-to-r from-sky-400 to-indigo-400';
        diffText = `목표치 대비 <strong class="text-sky-300">+${formatNum(diffMin)}</strong> 여유 있게 달성 완료`;
      }

      return `
        <div class="bg-[#161920] border border-gray-800 hover:border-gray-700 rounded-2xl p-4 transition space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-lg">${stInfo.icon}</span>
              <span class="text-base font-bold text-white">${stInfo.label}</span>
              <span class="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                필수 ${formatNum(min)}+ ${hasDistinctRec ? `/ 고점 ${formatNum(rec)}+` : ''}
              </span>
            </div>
            ${statusBadge}
          </div>

          <!-- Progress Bar -->
          <div class="space-y-1">
            <div class="flex justify-between text-xs">
              <span class="text-gray-400">${diffText}</span>
              <span class="font-extrabold text-white">
                현재 <span class="text-amber-300 text-sm">${formatNum(cur)}</span> / ${formatNum(min)} <span class="text-gray-400">(${pctMin}%)</span>
              </span>
            </div>
            <div class="w-full h-3 bg-gray-800/90 rounded-full overflow-hidden p-0.5">
              <div class="h-full rounded-full ${barColor} transition-all duration-300" style="width: ${pctForBar}%"></div>
            </div>
          </div>

          ${cfg.note ? `<p class="text-[11px] text-gray-400">💡 ${cfg.note}</p>` : ''}
        </div>
      `;
    }).join('');
  }

  // 3. 남은 스탯 몰빵 항목 & 직업 공략 메모 렌더링
  const dumpKeys = preset.dumpStats || [];
  const dumpItemsHtml = dumpKeys.length > 0
    ? dumpKeys.map(k => {
        const st = STAT_MAP[k] || { label: k, icon: '🔥' };
        const curVal = Number(stats[k]) || 0;
        return `
          <div class="flex items-center justify-between bg-sky-950/30 border border-sky-500/30 rounded-xl px-3.5 py-2.5">
            <span class="text-sm font-bold text-sky-200 flex items-center gap-1.5">
              <span>${st.icon}</span> ${st.label} <span class="text-[11px] font-normal text-sky-400">(몰빵 스탯)</span>
            </span>
            <span class="text-base font-black text-white">${formatNum(curVal)}</span>
          </div>
        `;
      }).join('')
    : `<div class="text-xs text-gray-500">지정된 몰빵 스탯이 없습니다.</div>`;

  dumpAndGuideCard.innerHTML = `
    <div class="bg-mabi-card border border-mabi-border rounded-3xl p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-bold text-sky-300 flex items-center gap-1.5">
          🔥 남은 스탯 올인(몰빵) 추천 항목
        </h4>
        <span class="text-[11px] text-gray-400">다다익선 주력 스탯</span>
      </div>
      <p class="text-xs text-gray-400">필수 커트라인을 맞춘 뒤 남는 보석/각인/스탯을 집중 투자하는 항목입니다.</p>
      <div class="space-y-2">
        ${dumpItemsHtml}
      </div>
    </div>

    <div class="bg-mabi-card border border-mabi-border rounded-3xl p-5 space-y-2 flex flex-col">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-bold text-amber-300 flex items-center gap-1.5">
          📌 [${preset.jobName}] 스탯 배분 가이드 메모
        </h4>
        <button onclick="openCurrentPresetEditor()" class="text-xs text-gray-400 hover:text-white underline">메모 수정</button>
      </div>
      <div class="flex-1 bg-mabi-bg border border-gray-800 rounded-2xl p-3.5 text-xs text-gray-200 whitespace-pre-line leading-relaxed">
        ${preset.guideMemo || '등록된 가이드 메모가 없습니다.'}
      </div>
    </div>
  `;
}

// ================= INTERACTIONS & HANDLERS =================
function updateStatValue(statKey, rawValue) {
  const slot = getCurrentSlot();
  if (!slot) return;
  const num = Math.max(0, parseInt(rawValue, 10) || 0);
  slot.stats[statKey] = num;
  slot.updatedAt = new Date().toISOString().slice(0, 10);
  saveState();
  renderLeftStatPanel();
  renderRightComparisonPanel();
}

function onSlotMemoChange(val) {
  const slot = getCurrentSlot();
  if (!slot) return;
  slot.memo = val;
  saveState();
}

function onServerChange(srv) {
  appState.selectedServer = srv;
  const firstChar = appState.characters.find(c => c.server === srv);
  appState.selectedCharacterId = firstChar ? firstChar.id : '';
  appState.selectedSlotId = (firstChar && firstChar.slots[0]) ? firstChar.slots[0].id : '';
  saveState();
  renderCharacterView();
}

function onCharacterChange(charId) {
  appState.selectedCharacterId = charId;
  const char = getCurrentCharacter();
  appState.selectedSlotId = (char && char.slots[0]) ? char.slots[0].id : '';
  saveState();
  renderCharacterView();
}

function onSlotChange(slotId) {
  appState.selectedSlotId = slotId;
  saveState();
  renderCharacterView();
}

function onChangeLinkedPreset(presetId) {
  const slot = getCurrentSlot();
  if (!slot) return;
  slot.presetId = presetId;
  saveState();
  renderCharacterView();
}

function promptAddServer() {
  const name = prompt('추가할 서버 이름을 입력하세요 (예: 알리사, 칼릭스 등):');
  if (!name || !name.trim()) return;
  const clean = name.trim();
  if (!appState.servers.includes(clean)) {
    appState.servers.push(clean);
  }
  appState.selectedServer = clean;
  saveState();
  renderCharacterView();
}

function promptAddCharacter() {
  const name = prompt(`[${appState.selectedServer}] 서버에 추가할 캐릭터 이름을 입력하세요:`, '');
  if (!name || !name.trim()) return;
  const newCharId = 'char_' + Date.now();
  const defaultPreset = appState.jobPresets[0];
  const newSlotId = 'slot_' + Date.now();

  // 기본 빈 스탯 생성
  const emptyStats = {};
  ALL_STATS.forEach(s => { emptyStats[s.key] = 0; });

  appState.characters.push({
    id: newCharId,
    server: appState.selectedServer,
    name: name.trim(),
    slots: [
      {
        id: newSlotId,
        slotName: defaultPreset ? defaultPreset.jobName : '기본 세팅',
        presetId: defaultPreset ? defaultPreset.id : '',
        updatedAt: new Date().toISOString().slice(0, 10),
        memo: '',
        stats: emptyStats
      }
    ]
  });

  appState.selectedCharacterId = newCharId;
  appState.selectedSlotId = newSlotId;
  saveState();
  renderCharacterView();
}

function promptRenameCharacter() {
  const char = getCurrentCharacter();
  if (!char) return;
  const next = prompt('변경할 캐릭터 이름을 입력하세요:', char.name);
  if (!next || !next.trim()) return;
  char.name = next.trim();
  saveState();
  renderCharacterView();
}

function deleteCurrentCharacter() {
  const char = getCurrentCharacter();
  if (!char) return;
  if (!confirm(`[${char.server}] '${char.name}' 캐릭터와 하위 세팅을 삭제하시겠습니까?`)) return;
  appState.characters = appState.characters.filter(c => c.id !== char.id);
  saveState();
  renderCharacterView();
}

function openAddSlotModal() {
  const char = getCurrentCharacter();
  if (!char) {
    alert('먼저 캐릭터를 추가해주세요.');
    return;
  }
  const modal = document.getElementById('addSlotModal');
  const select = document.getElementById('newSlotPresetSelect');
  select.innerHTML = appState.jobPresets.map(p =>
    `<option value="${p.id}">${p.jobName} (${p.seasonTag})</option>`
  ).join('');
  document.getElementById('newSlotNameInput').value = '';
  modal.classList.remove('hidden');
}

function closeAddSlotModal() {
  document.getElementById('addSlotModal').classList.add('hidden');
}

function confirmAddSlot() {
  const char = getCurrentCharacter();
  if (!char) return;
  const presetId = document.getElementById('newSlotPresetSelect').value;
  const preset = appState.jobPresets.find(p => p.id === presetId);
  const rawName = document.getElementById('newSlotNameInput').value.trim();
  const slotName = rawName || (preset ? preset.jobName : '새 직업 세팅');
  const copyCurrent = document.getElementById('copyCurrentStatsCheckbox').checked;

  const curSlot = getCurrentSlot();
  const stats = {};
  ALL_STATS.forEach(s => {
    stats[s.key] = (copyCurrent && curSlot && curSlot.stats) ? (curSlot.stats[s.key] || 0) : 0;
  });

  const newSlotId = 'slot_' + Date.now();
  char.slots.push({
    id: newSlotId,
    slotName,
    presetId,
    updatedAt: new Date().toISOString().slice(0, 10),
    memo: '',
    stats
  });

  appState.selectedSlotId = newSlotId;
  saveState();
  closeAddSlotModal();
  renderCharacterView();
}

function deleteCurrentSlot() {
  const char = getCurrentCharacter();
  const slot = getCurrentSlot();
  if (!char || !slot) return;
  if (char.slots.length <= 1) {
    alert('캐릭터당 최소 1개의 직업 세팅 슬롯이 필요합니다.');
    return;
  }
  if (!confirm(`'${slot.slotName}' 세팅 슬롯을 삭제하시겠습니까?`)) return;
  char.slots = char.slots.filter(s => s.id !== slot.id);
  appState.selectedSlotId = char.slots[0].id;
  saveState();
  renderCharacterView();
}

function openCurrentPresetEditor() {
  const preset = getCurrentPreset();
  if (preset) {
    appState.editingPresetId = preset.id;
  }
  switchMainView('presets');
}

function openQuickTargetModal() {
  openCurrentPresetEditor();
}

// ================= VIEW 2: JOB PRESETS MANAGER =================
function renderPresetsView() {
  const sidebar = document.getElementById('presetSidebarList');
  const editor = document.getElementById('presetEditorContainer');

  if (!appState.editingPresetId && appState.jobPresets.length > 0) {
    appState.editingPresetId = appState.jobPresets[0].id;
  }

  const currentPreset = appState.jobPresets.find(p => p.id === appState.editingPresetId) || appState.jobPresets[0];

  sidebar.innerHTML = appState.jobPresets.map(p => {
    const active = currentPreset && p.id === currentPreset.id;
    const targetCount = Object.values(p.targets || {}).filter(t => t.min > 0 || t.rec > 0).length;
    return `
      <div onclick="selectPresetForEdit('${p.id}')" class="cursor-pointer p-3.5 rounded-2xl border transition flex items-center justify-between ${
        active
          ? 'bg-amber-500/15 border-amber-500 text-white shadow'
          : 'bg-mabi-bg border-mabi-border text-gray-300 hover:border-gray-600'
      }">
        <div>
          <div class="font-bold text-sm text-white">${p.jobName}</div>
          <div class="text-xs text-gray-400">${p.seasonTag}</div>
        </div>
        <span class="text-xs px-2 py-0.5 rounded-full bg-black/40 text-amber-300 font-semibold">목표 ${targetCount}개</span>
      </div>
    `;
  }).join('');

  if (!currentPreset) {
    editor.innerHTML = `<div class="text-sm text-gray-400">직업 기준표를 추가해주세요.</div>`;
    return;
  }

  const targets = currentPreset.targets || {};
  const dumpStats = currentPreset.dumpStats || [];

  editor.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-mabi-border pb-4">
      <div>
        <span class="text-xs text-amber-400 font-semibold">직업 기준표 상세 설정</span>
        <h3 class="text-lg font-bold text-white">${currentPreset.jobName} — ${currentPreset.seasonTag}</h3>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="switchMainView('character')" class="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs">
          📊 내 캐릭터 비교 화면으로 돌아가기
        </button>
        <button onclick="deletePreset('${currentPreset.id}')" class="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-xs">
          삭제
        </button>
      </div>
    </div>

    <!-- Basic Info -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-xs text-gray-400 mb-1">직업 이름 (자유 입력)</label>
        <input type="text" value="${currentPreset.jobName}" oninput="updatePresetField('jobName', this.value)" class="w-full bg-mabi-card border border-mabi-border rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-amber-500" />
      </div>
      <div>
        <label class="block text-xs text-gray-400 mb-1">세팅 구분 / 시즌 태그</label>
        <input type="text" value="${currentPreset.seasonTag}" oninput="updatePresetField('seasonTag', this.value)" placeholder="예: 시즌1 연타 몰빵, 치명9000 고점" class="w-full bg-mabi-card border border-mabi-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
      </div>
      <div>
        <label class="block text-xs text-gray-400 mb-1">주스탯 (5대 기본 스탯 강조 표시)</label>
        <select onchange="updatePresetField('highlightPrimary', this.value)" class="w-full bg-mabi-card border border-mabi-border rounded-xl px-3 py-2 text-sm text-amber-300 focus:outline-none">
          ${PRIMARY_STATS.map(s => `<option value="${s.key}" ${currentPreset.highlightPrimary === s.key ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- Stat Target Table -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label class="text-xs font-bold text-gray-300">🎯 세부 스탯별 목표 수치 (0으로 두면 비교 대상에서 제외됩니다)</label>
        <span class="text-[11px] text-gray-400">예: 석궁사수 → 스킬 위력 5000 / 치명타 8500(고점 9000) / 추가타 2500 / 몰빵: 연타 강화 체크</span>
      </div>

      <div class="overflow-x-auto border border-mabi-border rounded-2xl">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-mabi-card text-gray-400 border-b border-mabi-border">
              <th class="py-2.5 px-3">스탯 항목</th>
              <th class="py-2.5 px-3">필수 목표치 (커트라인)</th>
              <th class="py-2.5 px-3">권장 고점 수치 (선택)</th>
              <th class="py-2.5 px-3 text-center">🔥 남은 스탯 몰빵</th>
              <th class="py-2.5 px-3">메모 / 팁</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800/70">
            ${DETAIL_STATS.map(st => {
              const cfg = targets[st.key] || { min: 0, rec: 0, note: '' };
              const isDump = dumpStats.includes(st.key);
              const isActive = (cfg.min > 0 || cfg.rec > 0 || isDump);
              return `
                <tr class="${isActive ? 'bg-amber-500/5' : 'hover:bg-white/5'}">
                  <td class="py-2 px-3 font-bold text-gray-200 whitespace-nowrap">
                    <span class="${st.color} mr-1">${st.icon}</span> ${st.label}
                  </td>
                  <td class="py-2 px-3">
                    <input type="number" value="${cfg.min || 0}" placeholder="0"
                      onchange="updatePresetTarget('${st.key}', 'min', this.value)"
                      class="w-24 bg-mabi-card border ${cfg.min > 0 ? 'border-amber-500/60 text-amber-300 font-bold' : 'border-gray-700 text-gray-400'} rounded-lg px-2 py-1 text-right focus:outline-none" />
                  </td>
                  <td class="py-2 px-3">
                    <input type="number" value="${cfg.rec || 0}" placeholder="0"
                      onchange="updatePresetTarget('${st.key}', 'rec', this.value)"
                      class="w-24 bg-mabi-card border ${cfg.rec > 0 ? 'border-sky-500/60 text-sky-300 font-bold' : 'border-gray-700 text-gray-400'} rounded-lg px-2 py-1 text-right focus:outline-none" />
                  </td>
                  <td class="py-2 px-3 text-center">
                    <input type="checkbox" ${isDump ? 'checked' : ''}
                      onchange="togglePresetDumpStat('${st.key}', this.checked)"
                      class="w-4 h-4 rounded accent-amber-500 cursor-pointer" />
                  </td>
                  <td class="py-2 px-3">
                    <input type="text" value="${cfg.note || ''}" placeholder="예: 8500+ 필수, 고점 9000+"
                      onchange="updatePresetTarget('${st.key}', 'note', this.value)"
                      class="w-full bg-mabi-card border border-gray-800 rounded-lg px-2 py-1 text-gray-200 focus:outline-none focus:border-amber-500" />
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Guide Memo -->
    <div>
      <label class="block text-xs font-bold text-gray-300 mb-1">📌 블로그/공략 출처 스탯 배분 가이드 메모</label>
      <textarea rows="3" oninput="updatePresetField('guideMemo', this.value)" class="w-full bg-mabi-card border border-mabi-border rounded-xl p-3 text-xs text-gray-200 focus:outline-none focus:border-amber-500" placeholder="블로그나 유튜브 공략에서 본 핵심 코멘트를 적어두면 대시보드에서 항상 함께 표시됩니다.">${currentPreset.guideMemo || ''}</textarea>
    </div>
  `;
}

function selectPresetForEdit(presetId) {
  appState.editingPresetId = presetId;
  saveState();
  renderPresetsView();
}

function createNewPreset() {
  const jobName = prompt('새로 추가할 직업 이름을 입력하세요 (예: 석궁사수, 마법사, 대검전사 등):');
  if (!jobName || !jobName.trim()) return;
  const newId = 'preset_' + Date.now();
  appState.jobPresets.push({
    id: newId,
    jobName: jobName.trim(),
    seasonTag: '커스텀 목표 세팅',
    highlightPrimary: 'dex',
    targets: {},
    dumpStats: [],
    guideMemo: ''
  });
  appState.editingPresetId = newId;
  saveState();
  renderPresetsView();
}

function updatePresetField(field, value) {
  const preset = appState.jobPresets.find(p => p.id === appState.editingPresetId);
  if (!preset) return;
  preset[field] = value;
  saveState();
  // 사이드바 제목 갱신
  if (field === 'jobName' || field === 'seasonTag') {
    renderPresetsView();
  }
}

function updatePresetTarget(statKey, field, rawVal) {
  const preset = appState.jobPresets.find(p => p.id === appState.editingPresetId);
  if (!preset) return;
  if (!preset.targets) preset.targets = {};
  if (!preset.targets[statKey]) {
    preset.targets[statKey] = { min: 0, rec: 0, note: '' };
  }
  if (field === 'min' || field === 'rec') {
    const num = Math.max(0, parseInt(rawVal, 10) || 0);
    preset.targets[statKey][field] = num;
    if (field === 'min' && (!preset.targets[statKey].rec || preset.targets[statKey].rec < num)) {
      preset.targets[statKey].rec = num;
    }
  } else {
    preset.targets[statKey][field] = rawVal;
  }
  saveState();
  renderPresetsView();
}

function togglePresetDumpStat(statKey, checked) {
  const preset = appState.jobPresets.find(p => p.id === appState.editingPresetId);
  if (!preset) return;
  if (!preset.dumpStats) preset.dumpStats = [];
  if (checked && !preset.dumpStats.includes(statKey)) {
    preset.dumpStats.push(statKey);
  } else if (!checked) {
    preset.dumpStats = preset.dumpStats.filter(k => k !== statKey);
  }
  saveState();
  renderPresetsView();
}

function deletePreset(presetId) {
  if (appState.jobPresets.length <= 1) {
    alert('최소 1개의 직업 목표 기준표는 남겨두어야 합니다.');
    return;
  }
  const target = appState.jobPresets.find(p => p.id === presetId);
  if (!confirm(`'${target.jobName} (${target.seasonTag})' 기준표를 삭제하시겠습니까?`)) return;
  appState.jobPresets = appState.jobPresets.filter(p => p.id !== presetId);
  appState.editingPresetId = appState.jobPresets[0].id;
  saveState();
  renderPresetsView();
}

// ================= OCR & TEXT PARSER =================
function openOcrModal() {
  pendingOcrStats = {};
  document.getElementById('ocrModal').classList.remove('hidden');
  document.getElementById('ocrPreviewBox').classList.add('hidden');
  document.getElementById('applyOcrBtn').disabled = true;
}

function closeOcrModal() {
  document.getElementById('ocrModal').classList.add('hidden');
}

// Ctrl+V 클립보드 이미지 붙여넣기 지원
window.addEventListener('paste', (e) => {
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile();
      if (file) {
        const modal = document.getElementById('ocrModal');
        if (modal.classList.contains('hidden')) {
          openOcrModal();
        }
        runOcrOnImageFile(file);
        break;
      }
    }
  }
});

function handleOcrFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  runOcrOnImageFile(file);
}

// 어두운 게임 UI 배경의 흰색/밝은 글씨 인식률을 높이기 위한 캔버스 전처리
function preprocessImageForOcr(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      document.getElementById('ocrPreviewImg').src = url;
      const canvas = document.createElement('canvas');
      const scale = 2; // 확대하여 작은 한글/숫자 인식률 향상
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      // 어두운 배경(#1b1d24)을 흰색으로, 밝은 텍스트를 검은색으로 반전 + 대비 강화
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const inverted = lum > 115 ? 0 : 255;
        data[i] = inverted;
        data[i + 1] = inverted;
        data[i + 2] = inverted;
      }
      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = url;
  });
}

async function runOcrOnImageFile(file) {
  const previewBox = document.getElementById('ocrPreviewBox');
  const statusText = document.getElementById('ocrStatusText');
  const pctText = document.getElementById('ocrProgressPercent');
  const bar = document.getElementById('ocrProgressBar');
  const resultList = document.getElementById('ocrParsedResultList');

  previewBox.classList.remove('hidden');
  statusText.textContent = '이미지 대비 전처리 및 한글/숫자 OCR 엔진 로딩 중...';
  pctText.textContent = '5%';
  bar.style.width = '5%';
  resultList.innerHTML = `<div class="text-gray-400">스탯 수치를 읽고 있습니다...</div>`;

  try {
    const processedDataUrl = await preprocessImageForOcr(file);
    const result = await Tesseract.recognize(processedDataUrl, 'kor+eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          const p = Math.round((m.progress || 0) * 100);
          statusText.textContent = '스탯 라벨 및 숫자 추출 중...';
          pctText.textContent = `${p}%`;
          bar.style.width = `${p}%`;
        }
      }
    });

    const rawText = result.data.text || '';
    document.getElementById('ocrRawTextInput').value = rawText;
    const extracted = extractStatsFromText(rawText);
    renderOcrExtractedPreview(extracted);
    statusText.textContent = `인식 완료! (${Object.keys(extracted).length}개 스탯 감지됨)`;
    pctText.textContent = '100%';
    bar.style.width = '100%';
  } catch (err) {
    console.error(err);
    statusText.textContent = 'OCR 처리 중 오류가 발생했습니다. 아래 텍스트 붙여넣기를 이용해주세요.';
  }
}

function parseRawTextToStats() {
  const raw = document.getElementById('ocrRawTextInput').value || '';
  const extracted = extractStatsFromText(raw);
  document.getElementById('ocrPreviewBox').classList.remove('hidden');
  renderOcrExtractedPreview(extracted);
}

function extractStatsFromText(rawText) {
  const found = {};
  const normalized = rawText.replace(/,/g, '');

  // 1) 세부 스탯 및 공격력/방어력 라벨 매칭
  const labelTargets = [
    ...COMBAT_STATS.map(s => ({ key: s.key, names: [s.label] })),
    ...DETAIL_STATS.map(s => ({ key: s.key, names: s.aliases || [s.label] }))
  ];

  labelTargets.forEach(item => {
    for (const name of item.names) {
      const compactName = name.replace(/\s+/g, '\\s*');
      const regex = new RegExp(compactName + '[^0-9\\n]{0,12}(\\d{3,6})', 'i');
      const match = normalized.match(regex);
      if (match && match[1]) {
        found[item.key] = parseInt(match[1], 10);
        break;
      }
    }
  });

  // 2) 상단 5대 스탯 (힘 솜씨 지력 의지 행운 아래에 5개의 숫자가 나란히 오는 패턴 또는 개별 매칭)
  PRIMARY_STATS.forEach(st => {
    const regex = new RegExp(st.label + '[^0-9]{0,15}(\\d{3,5})');
    const m = normalized.match(regex);
    if (m && m[1]) {
      found[st.key] = parseInt(m[1], 10);
    }
  });

  // 만약 상단 5개 연속 숫자 줄(예: 5,388 6,356 5,489 4,981 5,754)이 있는 경우 자동 매핑
  const lines = rawText.split(/\r?\n/);
  for (const line of lines) {
    const nums = line.replace(/,/g, '').match(/\b\d{4,5}\b/g);
    if (nums && nums.length === 5) {
      PRIMARY_STATS.forEach((st, idx) => {
        found[st.key] = parseInt(nums[idx], 10);
      });
      break;
    }
  }

  pendingOcrStats = found;
  return found;
}

function renderOcrExtractedPreview(extracted) {
  const resultList = document.getElementById('ocrParsedResultList');
  const applyBtn = document.getElementById('applyOcrBtn');
  const keys = Object.keys(extracted);

  if (keys.length === 0) {
    resultList.innerHTML = `<div class="text-rose-400">추출된 스탯이 없습니다. 이미지 화질을 확인하거나 텍스트 입력란을 확인해주세요.</div>`;
    applyBtn.disabled = true;
    return;
  }

  applyBtn.disabled = false;
  resultList.innerHTML = keys.map(k => {
    const st = STAT_MAP[k] || { label: k, icon: '•' };
    return `
      <div class="flex items-center justify-between bg-mabi-card px-2.5 py-1 rounded border border-gray-800">
        <span class="text-gray-300">${st.icon} ${st.label}</span>
        <span class="font-bold text-amber-300">${formatNum(extracted[k])}</span>
      </div>
    `;
  }).join('');
}

function applyOcrStatsToCurrentSlot() {
  const slot = getCurrentSlot();
  if (!slot) return;
  Object.entries(pendingOcrStats).forEach(([k, val]) => {
    if (typeof val === 'number' && !isNaN(val)) {
      slot.stats[k] = val;
    }
  });
  slot.updatedAt = new Date().toISOString().slice(0, 10);
  saveState();
  closeOcrModal();
  renderCharacterView();
}

// ================= JSON BACKUP & RESTORE =================
function exportDataJson() {
  const dataStr = JSON.stringify(appState, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `mabinogi_mobile_stats_backup_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importDataJson(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.characters || !parsed.jobPresets) {
        alert('올바른 마비노기 모바일 스탯 백업 파일이 아닙니다.');
        return;
      }
      appState = parsed;
      saveState();
      renderCharacterView();
      alert('백업 데이터를 성공적으로 불러왔습니다!');
    } catch (err) {
      alert('JSON 파일 읽기에 실패했습니다.');
    }
  };
  reader.readAsText(file);
}

function resetToSampleData() {
  if (!confirm('초기 샘플 상태(던컨 > 로산나 > 석궁사수)로 데이터를 초기화하시겠습니까?')) return;
  appState = getInitialSampleState();
  saveState();
  switchMainView('character');
}

// 초기 실행
document.addEventListener('DOMContentLoaded', () => {
  renderCharacterView();
});
