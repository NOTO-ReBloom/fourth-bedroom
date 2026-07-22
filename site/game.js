(() => {
  'use strict';

  const DATA = window.GAME_DATA;
  const nodes = new Map(DATA.nodes.map(n => [n.id, n]));
  const nodeOrder = new Map(DATA.nodes.map((n, i) => [n.id, i]));
  const SAVE_PREFIX = 'fourth-bedroom-production-v19';
  const LEGACY_SAVE_PREFIX = 'fourth-bedroom-production-v18';
  const SAVE_KEYS = {
    auto: `${SAVE_PREFIX}-autosave`,
    slot1: `${SAVE_PREFIX}-slot1`,
    slot2: `${SAVE_PREFIX}-slot2`,
    slot3: `${SAVE_PREFIX}-slot3`
  };

  const CHAPTER_INFO = {
    PROLOGUE: ['PROLOGUE', '目録にない部屋', '一枚の絵が、まだ名前を持たない夜。'],
    'ACT 1': ['ACT 1', '休息の部屋', '描かれた当時の色と、現在見えている色。'],
    'ACT 2': ['ACT 2', '来客のための椅子', '人を迎える期待は、同じ形では返ってこない。'],
    'ACT 3': ['ACT 3', '描き直された部屋', '同じ構図にも、同じ時間は戻らない。'],
    'ACT 4': ['ACT 4', '部屋を写した女', '失われた部屋を、残された差異から組み直す。'],
    'ACT 5': ['ACT 5', '売られる物語', '作品へ付け足された、分かりやすい物語。'],
    'ACT 6': ['ACT 6', '夜明けまで、彼はまだ画家だった', '知っている未来ではなく、現在の証拠で人を動かす。'],
    ENDING: ['ENDING', '記録の行方', '何を残し、何を事実として書くか。']
  };

  const $ = sel => document.querySelector(sel);
  const els = {
    title: $('#title-screen'), game: $('#game-screen'), gameover: $('#gameover-screen'), ending: $('#ending-screen'),
    scene: $('#scene'), paintingStage: $('#painting-stage'), characterLayer: $('#character-layer'), hotspotLayer: $('#hotspot-layer'),
    dialogue: $('#dialogue-panel'), speaker: $('#speaker-name'), emotion: $('#emotion-label'), text: $('#dialogue-text'), readStatus: $('#read-status'),
    choices: $('#choice-panel'), inv: $('#investigation-panel'), invTitle: $('#investigation-title'), invProgress: $('#investigation-progress'), invFinish: $('#finish-investigation'),
    chapter: $('#chapter-label'), location: $('#location-label'), time: $('#time-label'), loop: $('#loop-label'), toast: $('#toast'),
    progressLabel: $('#progress-label'), progressFill: $('#story-progress-fill'),
    audioToggle: $('#audio-toggle'), autoToggle: $('#auto-toggle'), skipToggle: $('#skip-toggle'), uiToggle: $('#ui-toggle'), restoreUi: $('#restore-ui'),
    gameoverTitle: $('#gameover-title'), gameoverBody: $('#gameover-body'), deathCounter: $('#death-counter'), returnButton: $('#return-button'),
    endingSummary: $('#ending-summary'), endingStats: $('#ending-stats'), continue: $('#continue-game'),
    chapterCard: $('#chapter-card'), chapterCardKicker: $('#chapter-card-kicker'), chapterCardTitle: $('#chapter-card-title'), chapterCardSubtitle: $('#chapter-card-subtitle'),
    placeCard: $('#place-card'), placeCardLocation: $('#place-card-location'), placeCardTime: $('#place-card-time'),
    beatCard: $('#beat-card'), beatCardText: $('#beat-card-text'),
    invHint: $('#investigation-hint'), playtestSummary: $('#playtest-summary'),
    menuStatus: $('#menu-status')
  };

  const defaultSettings = () => ({
    speed: 12,
    autoDelay: 1050,
    fontSize: 18,
    lineHeight: 19,
    panelOpacity: 90,
    reduceMotion: false,
    ambient: true,
    ambientVolume: 65,
    sfxVolume: 70,
    highContrast: false,
    skipReadOnly: true,
    assistMode: 'standard'
  });

  const defaultMetrics = () => ({
    startedAt: Date.now(),
    lastNodeAt: Date.now(),
    nodeVisits: {},
    choiceSelections: {},
    investigation: {},
    puzzleAttempts: {},
    deathsById: {},
    chapterMs: {},
    hintsUsed: 0,
    exportedAt: null
  });

  const defaultState = () => ({
    nodeId: 'p01',
    loop: 1,
    paintingLoop: 0,
    flags: {},
    evidence: [],
    visited: [],
    readNodes: {},
    readSegments: {},
    segmentIndex: 0,
    log: [],
    deaths: 0,
    currentChapter: 'PROLOGUE',
    currentLocation: '—',
    currentTime: '—',
    paintingRevealed: false,
    settings: defaultSettings(),
    playStartedAt: Date.now(),
    totalPlayMs: 0,
    metrics: defaultMetrics(),
    saveVersion: '1.9.0'
  });

  let state = defaultState();
  let node = null;
  let typingTimer = null;
  let typingDone = true;
  let fullText = '';
  let invState = null;
  let pendingEvidenceToast = null;
  let toastTimer = null;
  let autoTimer = null;
  let chapterTimer = null;
  let placeTimer = null;
  let beatTimer = null;
  let hintTimer = null;
  let audio = null;
  let autoMode = false;
  let skipMode = false;
  let uiHidden = false;
  let currentWasRead = false;
  let lastSceneBg = '';
  let afterTextRanFor = null;
  let currentScript = [];
  let currentSegment = null;
  let segmentIndex = 0;

  function normalizeState(saved) {
    const base = defaultState();
    const normalized = {
      ...base,
      ...(saved || {}),
      settings: {...base.settings, ...((saved && saved.settings) || {})},
      flags: {...((saved && saved.flags) || {})},
      readNodes: {...((saved && saved.readNodes) || {})},
      readSegments: {...((saved && saved.readSegments) || {})},
      metrics: {...base.metrics, ...((saved && saved.metrics) || {}),
        nodeVisits: {...(((saved && saved.metrics) || {}).nodeVisits || {})},
        choiceSelections: {...(((saved && saved.metrics) || {}).choiceSelections || {})},
        investigation: {...(((saved && saved.metrics) || {}).investigation || {})},
        puzzleAttempts: {...(((saved && saved.metrics) || {}).puzzleAttempts || {})},
        deathsById: {...(((saved && saved.metrics) || {}).deathsById || {})},
        chapterMs: {...(((saved && saved.metrics) || {}).chapterMs || {})}}
    };
    if (!Object.keys(normalized.readNodes).length && Array.isArray(normalized.visited)) {
      normalized.visited.forEach(id => { normalized.readNodes[id] = true; });
    }
    normalized.playStartedAt = Date.now();
    normalized.metrics.lastNodeAt = Date.now();
    normalized.saveVersion = '1.9.0';
    return normalized;
  }

  function legacyKey(name) {
    const suffix = name === 'auto' ? 'autosave' : name;
    return `${LEGACY_SAVE_PREFIX}-${suffix}`;
  }

  function migrateLegacySaves() {
    const names = ['auto','slot1','slot2','slot3'];
    for (const name of names) {
      try {
        if (!localStorage.getItem(SAVE_KEYS[name]) && localStorage.getItem(legacyKey(name))) {
          const parsed = JSON.parse(localStorage.getItem(legacyKey(name)));
          localStorage.setItem(SAVE_KEYS[name], JSON.stringify(normalizeState(parsed)));
        }
      } catch (e) { console.warn('legacy save migration failed', name, e); }
    }
  }

  function readSave(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? normalizeState(JSON.parse(raw)) : null;
    } catch (e) {
      console.warn('save load failed', e);
      return null;
    }
  }

  function snapshotState() {
    state.totalPlayMs += Date.now() - state.playStartedAt;
    state.playStartedAt = Date.now();
    return JSON.parse(JSON.stringify(state));
  }

  function writeSave(key, manual = false) {
    try {
      localStorage.setItem(key, JSON.stringify(snapshotState()));
      updateContinueState();
      if (manual) {
        audio?.sfx('save');
        showToast('現在の記録を保存しました。');
      }
      renderSaveSlots();
      return true;
    } catch (e) {
      if (manual) showToast('保存に失敗しました。');
      return false;
    }
  }

  function saveGame(manual = false, key = SAVE_KEYS.auto) {
    return writeSave(key, manual);
  }

  function deleteSave(key) {
    try { localStorage.removeItem(key); } catch (_) {}
    updateContinueState();
    renderSaveSlots();
  }

  function allSaves() {
    return Object.fromEntries(Object.entries(SAVE_KEYS).map(([name, key]) => [name, readSave(key)]));
  }

  function latestSave() {
    const saves = Object.values(allSaves()).filter(Boolean);
    saves.sort((a, b) => (b.savedAt || b.playStartedAt || 0) - (a.savedAt || a.playStartedAt || 0));
    return saves[0] || null;
  }

  function updateContinueState() {
    const any = Object.values(SAVE_KEYS).some(key => {
      try { return !!localStorage.getItem(key); } catch (_) { return false; }
    });
    els.continue.disabled = !any;
  }

  function clearAllSaves() {
    Object.values(SAVE_KEYS).forEach(key => { try { localStorage.removeItem(key); } catch (_) {} });
    updateContinueState();
  }

  function formatPlaytime(ms) {
    const minutes = Math.max(0, Math.round(ms / 60000));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? `${h}時間${String(m).padStart(2, '0')}分` : `${m}分`;
  }

  function saveMetadata(saved) {
    if (!saved) return null;
    const nodeData = nodes.get(saved.nodeId);
    const stamp = saved.savedAt || saved.playStartedAt || Date.now();
    return {
      chapter: saved.currentChapter || nodeData?.chapter || '—',
      location: saved.currentLocation || nodeData?.location || '—',
      time: saved.currentTime || nodeData?.time || '—',
      deaths: saved.deaths || 0,
      play: formatPlaytime(saved.totalPlayMs || 0),
      stamp: new Intl.DateTimeFormat('ja-JP', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'}).format(stamp)
    };
  }

  function applySettings() {
    const s = state.settings;
    document.documentElement.style.setProperty('--font-size', `${s.fontSize}px`);
    document.documentElement.style.setProperty('--dialogue-line-height', `${s.lineHeight / 10}`);
    document.documentElement.style.setProperty('--panel-opacity', `${s.panelOpacity / 100}`);
    document.body.classList.toggle('reduce-motion', s.reduceMotion);
    document.body.classList.toggle('high-contrast', s.highContrast);

    const inputs = {
      '#text-speed': s.speed,
      '#auto-delay': s.autoDelay,
      '#font-size': s.fontSize,
      '#line-height': s.lineHeight,
      '#panel-opacity': s.panelOpacity,
      '#ambient-volume': s.ambientVolume,
      '#sfx-volume': s.sfxVolume
    };
    Object.entries(inputs).forEach(([selector, value]) => { const el = $(selector); if (el) el.value = value; });
    $('#reduce-motion').checked = s.reduceMotion;
    $('#ambient-enabled').checked = s.ambient;
    $('#high-contrast').checked = s.highContrast;
    $('#skip-read-only').checked = s.skipReadOnly;
    if ($('#assist-mode')) $('#assist-mode').value = s.assistMode || 'standard';
    if (audio) {
      audio.enabled = s.ambient;
      audio.ambientVolume = s.ambientVolume / 100;
      audio.sfxVolume = s.sfxVolume / 100;
      audio.refreshVolume();
    }
    updateModeButtons();
  }

  class AudioSystem {
    constructor() {
      this.ctx = null;
      this.ambientNodes = [];
      this.ambientMaster = null;
      this.enabled = true;
      this.current = '';
      this.ambientVolume = .65;
      this.sfxVolume = .7;
    }
    init() {
      if (this.ctx) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
    }
    resume() {
      this.init();
      if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    }
    stopAmbient() {
      this.ambientNodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch (_) {} });
      this.ambientNodes = [];
      this.ambientMaster = null;
      this.current = '';
    }
    refreshVolume() {
      if (this.ambientMaster) this.ambientMaster.gain.setTargetAtTime(this.enabled ? .095 * this.ambientVolume : 0, this.ctx.currentTime, .08);
    }
    set(type) {
      if (!this.enabled) { this.stopAmbient(); return; }
      this.resume();
      if (!this.ctx || this.current === type) { this.refreshVolume(); return; }
      this.stopAmbient();
      this.current = type;
      const ctx = this.ctx;
      const master = ctx.createGain();
      master.gain.value = .095 * this.ambientVolume;
      master.connect(ctx.destination);
      this.ambientMaster = master;
      this.ambientNodes.push(master);
      const osc = (freq, vol, wave = 'sine') => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = wave; o.frequency.value = freq; g.gain.value = vol;
        o.connect(g).connect(master); o.start(); this.ambientNodes.push(o, g); return o;
      };
      const noise = (vol, low = 500) => {
        const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = b; s.loop = true; f.type = 'lowpass'; f.frequency.value = low; g.gain.value = vol;
        s.connect(f).connect(g).connect(master); s.start(); this.ambientNodes.push(s, f, g);
      };
      switch (type) {
        case 'train': osc(54,.36); osc(108,.06,'triangle'); noise(.16,280); osc(1.7,.018,'sine'); break;
        case 'trainQuiet': osc(52,.28); noise(.11,240); break;
        case 'summer': case 'summerNight': noise(.12,1600); osc(4300,.008); break;
        case 'arlesNight': noise(.10,2100); osc(3200,.006); osc(63,.025); break;
        case 'stoneHall': osc(49,.16); osc(98,.025); noise(.035,520); break;
        case 'cooling': osc(47,.23); osc(94,.05); noise(.075,600); break;
        case 'preEmergency': osc(43,.24); osc(86,.07,'triangle'); noise(.12,430); break;
        case 'memory': osc(57,.10); osc(114,.025,'triangle'); noise(.025,300); break;
        case 'paintRoom': noise(.075,1900); osc(55,.035); osc(110,.012,'triangle'); break;
        case 'hum': case 'room': case 'lab': osc(50,.27); osc(100,.05); noise(.05,420); break;
        case 'machine': osc(62,.32); osc(124,.08); noise(.08,720); break;
        case 'scanner': osc(84,.20); osc(168,.04); noise(.07,1000); break;
        case 'scannerLow': osc(47,.38); osc(94,.08); noise(.11,540); break;
        case 'blackout': osc(28,.16); break;
        case 'fire': noise(.30,900); osc(38,.12); break;
        case 'electric': osc(180,.18,'sawtooth'); noise(.16,2200); break;
        case 'portal': osc(73,.23); osc(146,.08,'triangle'); noise(.07,800); break;
        case 'arlesRoom': noise(.09,1800); osc(55,.04); break;
        case 'crumble': noise(.23,950); osc(34,.12); break;
        case 'void': osc(25,.14); noise(.03,180); break;
        case 'rain': noise(.18,1800); osc(46,.04); break;
        case 'warehouse': osc(43,.14); noise(.07,420); break;
        case 'quiet': noise(.03,1200); osc(57,.025); break;
        case 'lowTone': osc(42,.16); break;
        case 'yellowHouseQuiet': noise(.055,1800); osc(55,.035); osc(220,.006,'triangle'); break;
        case 'dinner': noise(.045,1400); osc(52,.04); osc(104,.012,'triangle'); break;
        case 'roomTension': noise(.065,900); osc(39,.12); osc(78,.025,'triangle'); break;
        case 'saintRemyMorning': noise(.045,2200); osc(61,.028); osc(244,.004,'sine'); break;
        case 'gardenLoop': noise(.055,2600); osc(3320,.004); osc(59,.025); break;
        case 'paperGrid': noise(.032,1000); osc(46,.045); osc(184,.006,'triangle'); break;
        case 'rainWorkshop': noise(.20,1850); osc(44,.045); osc(176,.005,'triangle'); break;
        case 'photoPlate': noise(.038,950); osc(51,.045); osc(306,.005,'sine'); break;
        case 'rationedWarmth': noise(.035,1250); osc(56,.035); osc(112,.007,'triangle'); break;
        case 'archivePaper': noise(.045,780); osc(42,.055); break;
        case 'typewriterRoom': noise(.055,620); osc(45,.06); osc(90,.012,'triangle'); break;
        case 'additionRoom': noise(.052,720); osc(39,.08); osc(156,.008,'triangle'); break;
        case 'solventWarehouse': noise(.085,420); osc(37,.11); break;
        case 'institutionalLow': noise(.038,480); osc(41,.085); osc(82,.012,'triangle'); break;
        case 'overheatForecast': noise(.105,680); osc(46,.16); osc(92,.035,'triangle'); break;
        case 'smokeExposure': noise(.09,520); osc(34,.13); osc(68,.02,'triangle'); break;
        case 'falseRelief': noise(.055,1800); osc(61,.025); osc(244,.004,'sine'); break;
        case 'delayedPoison': noise(.04,260); osc(31,.14); osc(62,.025,'sine'); break;
        case 'finalNight': noise(.055,1500); osc(48,.055); osc(192,.006,'triangle'); break;
        case 'sharedPlan': noise(.035,780); osc(52,.045); osc(104,.009,'triangle'); break;
        case 'controlledShutdown': noise(.045,460); osc(41,.09); osc(82,.018,'triangle'); break;
        case 'controlledFire': noise(.13,760); osc(36,.12); osc(72,.022,'triangle'); break;
        case 'countdown': noise(.028,420); osc(48,.065); osc(96,.012,'triangle'); break;
        case 'reportRoom': noise(.03,620); osc(55,.035); osc(220,.004,'sine'); break;
        case 'dawnQuiet': noise(.055,2200); osc(58,.025); osc(232,.004,'sine'); break;
        case 'museumQuiet': noise(.018,1300); osc(61,.018); break;
        case 'finalPainting': noise(.05,1800); osc(55,.035); osc(165,.006,'triangle'); break;
        case 'spectacle': noise(.06,1200); osc(46,.06); osc(184,.009,'triangle'); break;
        case 'erasure': noise(.04,360); osc(34,.09); osc(68,.015,'triangle'); break;
        case 'deferral': noise(.025,300); osc(32,.08); break;
        default: noise(.025,500);
      }
    }
    sfx(type) {
      this.resume();
      if (!this.ctx || this.sfxVolume <= 0) return;
      const ctx = this.ctx;
      const master = ctx.createGain();
      master.gain.value = .12 * this.sfxVolume;
      master.connect(ctx.destination);
      const tone = (frequency, duration, wave = 'sine', start = 0, gain = 1) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = wave; o.frequency.setValueAtTime(frequency, ctx.currentTime + start);
        g.gain.setValueAtTime(gain, ctx.currentTime + start);
        g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + start + duration);
        o.connect(g).connect(master); o.start(ctx.currentTime + start); o.stop(ctx.currentTime + start + duration);
      };
      switch(type) {
        case 'advance': tone(460,.045,'sine',0,.16); break;
        case 'choice': tone(320,.08,'triangle',0,.35); tone(520,.10,'triangle',.05,.26); break;
        case 'evidence': tone(420,.16,'sine',0,.38); tone(630,.22,'sine',.09,.30); break;
        case 'save': tone(380,.10,'triangle',0,.30); tone(570,.14,'triangle',.08,.24); break;
        case 'error': tone(130,.16,'sawtooth',0,.38); break;
        case 'death': tone(92,.75,'sawtooth',0,.45); tone(46,1.1,'sine',.08,.52); break;
        case 'chapter': tone(220,.35,'sine',0,.25); tone(330,.45,'sine',.16,.18); break;
        case 'door': tone(82,.22,'triangle',0,.42); tone(58,.34,'sine',.03,.28); break;
        case 'knock': tone(118,.08,'triangle',0,.55); tone(94,.10,'triangle',.13,.48); break;
        case 'metal': tone(160,.12,'sawtooth',0,.34); tone(72,.26,'sine',.04,.30); break;
        case 'breath': tone(68,.26,'sine',0,.16); break;
        case 'paper': tone(780,.045,'triangle',0,.11); tone(620,.06,'triangle',.04,.09); break;
        case 'powerdown': tone(180,.28,'sawtooth',0,.25); tone(90,.42,'sine',.12,.34); break;
        case 'paintcrack': tone(230,.08,'triangle',0,.28); tone(170,.10,'triangle',.07,.24); tone(110,.18,'sine',.15,.30); break;
        case 'heartbeat': tone(62,.12,'sine',0,.55); tone(58,.11,'sine',.18,.42); break;
        case 'chair': tone(126,.09,'triangle',0,.30); tone(72,.20,'sine',.04,.22); break;
        case 'layerShift': tone(210,.09,'triangle',0,.20); tone(140,.16,'triangle',.08,.18); tone(70,.35,'sine',.16,.25); break;
        case 'pencil': tone(920,.035,'triangle',0,.08); tone(760,.04,'triangle',.04,.07); break;
        case 'plate': tone(690,.045,'triangle',0,.16); tone(255,.16,'sine',.04,.12); break;
        case 'rain': tone(820,.025,'triangle',0,.05); tone(740,.03,'triangle',.08,.04); break;
        case 'water': tone(520,.06,'sine',0,.08); tone(390,.08,'sine',.04,.06); break;
        case 'cup': tone(410,.045,'triangle',0,.12); tone(290,.08,'sine',.03,.08); break;
        case 'paperTear': tone(520,.12,'sawtooth',0,.16); tone(180,.24,'triangle',.08,.12); break;
        case 'typewriter': tone(180,.035,'triangle',0,.18); tone(245,.028,'triangle',.07,.14); tone(150,.04,'triangle',.14,.14); break;
        case 'drawer': tone(92,.14,'triangle',0,.22); tone(58,.22,'sine',.06,.18); break;
        case 'stamp': tone(105,.07,'triangle',0,.34); tone(68,.16,'sine',.03,.18); break;
        case 'bell': tone(760,.13,'sine',0,.18); tone(690,.13,'sine',.22,.15); break;
        case 'clock': tone(840,.035,'triangle',0,.10); tone(840,.035,'triangle',.5,.08); break;
        case 'hash': tone(330,.07,'sine',0,.16); tone(495,.09,'sine',.08,.13); tone(660,.11,'sine',.18,.10); break;
        case 'message': tone(620,.06,'sine',0,.14); tone(820,.08,'sine',.09,.10); break;
      }
      setTimeout(() => { try { master.disconnect(); } catch (_) {} }, 1800);
    }
  }

  function startGame(saved = null) {
    const fresh = {...defaultState(), settings: {...defaultSettings(), ...(state?.settings || {})}};
    state = normalizeState(saved || fresh);
    state.playStartedAt = Date.now();
    applySettings();
    audio = audio || new AudioSystem();
    audio.enabled = state.settings.ambient;
    audio.ambientVolume = state.settings.ambientVolume / 100;
    audio.sfxVolume = state.settings.sfxVolume / 100;
    audio.init();
    autoMode = false; skipMode = false; uiHidden = false;
    updateModeButtons(); toggleUi(false);
    els.title.classList.add('hidden');
    els.gameover.classList.add('hidden');
    els.ending.classList.add('hidden');
    els.game.classList.remove('hidden');
    renderNode(state.nodeId, false, true, Number(state.segmentIndex || 0));
    saveGame(false, SAVE_KEYS.auto);
  }

  function inferMood(n, id, active) {
    if (!active) return n.listenerMood || 'quiet';
    if (n.mood) return n.mood;
    const t = `${n.emotion || ''} ${n.text || ''}`;
    if (/笑|微笑|安心|よかった|助かった/.test(t)) return 'soft';
    if (/怒|違う|やめろ|警戒|険し|苛立|不機嫌/.test(t)) return 'tense';
    if (/怖|震|死|煙|火|危険|崩|落ち|消え/.test(t) || ['emergency','smoke','instituteFire','layerCollapse','bedroomCrumble'].includes(n.bg)) return 'alarm';
    if (/疲|沈黙|罪悪感|覚えていない|失った|知らない/.test(t)) return 'down';
    if (id === 'vincent' && /絵|色|描|構図|椅子|部屋/.test(t)) return 'focused';
    return 'neutral';
  }

  function characterSvg(id, mood = 'neutral') {
    const specs = {
      sumi:{skin:'#d6b09c',shadow:'#91695f',hair:'#171b22',coat:'#56606c',shirt:'#cbc6bb',accent:'#8f9aa8',light:'#e6cfb2'},
      claire:{skin:'#ddbda8',shadow:'#966b61',hair:'#30262b',coat:'#d4d0c8',shirt:'#536b79',accent:'#ad554d',light:'#ead9c4'},
      marc:{skin:'#cfb4a3',shadow:'#87665d',hair:'#817d78',coat:'#c6c4bd',shirt:'#293647',accent:'#8f7857',light:'#e1d1bd'},
      leon:{skin:'#d4b39b',shadow:'#896152',hair:'#b9b3aa',coat:'#182337',shirt:'#687484',accent:'#c0a15e',light:'#ebd8bc'},
      marta:{skin:'#cba783',shadow:'#845d4d',hair:'#4d4039',coat:'#c9c2b4',shirt:'#65594e',accent:'#756889',light:'#e4cda9'},
      andre:{skin:'#bc8767',shadow:'#71493f',hair:'#282225',coat:'#55463e',shirt:'#252a34',accent:'#98704f',light:'#d8af8e'}
    };
    const sp = specs[id] || specs.sumi;
    const expression = {
      neutral:{browL:'M147 210q16-6 31-1',browR:'M213 206q15-4 29 2',eyeL:'M151 224q14 7 27-1',eyeR:'M214 222q13 7 25 0',mouth:'M182 304q19 3 37-2',turn:0,open:0},
      quiet:{browL:'M148 213q15-3 30 0',browR:'M213 210q14-2 28 2',eyeL:'M151 226q14 5 27 0',eyeR:'M214 225q13 5 25 0',mouth:'M183 306h35',turn:-1,open:0},
      soft:{browL:'M147 209q16-6 31-2',browR:'M212 205q16-5 30 2',eyeL:'M151 224q14 8 27-1',eyeR:'M214 222q13 8 25 0',mouth:'M180 299q21 13 41-1',turn:-2,open:0},
      tense:{browL:'M147 214l31-9',browR:'M212 205l30 10',eyeL:'M151 225q14 5 27-1',eyeR:'M214 224q13 5 25 0',mouth:'M182 309q19-7 38 0',turn:1,open:0},
      alarm:{browL:'M147 204q16-11 31 0',browR:'M212 204q16-12 30 0',eyeL:'M151 222q14 9 27-1',eyeR:'M214 220q13 10 25 0',mouth:'M190 299q13 18 25 0',turn:2,open:1},
      down:{browL:'M147 210q16 0 31 7',browR:'M212 216q16-7 30-7',eyeL:'M151 228q14 3 27 0',eyeR:'M214 227q13 3 25 0',mouth:'M183 310q19-6 37 0',turn:-2,open:0},
      focused:{browL:'M147 214l31-5',browR:'M212 209l30 5',eyeL:'M151 225q14 5 27-1',eyeR:'M214 224q13 5 25 0',mouth:'M182 303q19 4 38 0',turn:0,open:0}
    }[mood] || null;
    const e = expression || {browL:'M147 210q16-6 31-1',browR:'M213 206q15-4 29 2',eyeL:'M151 224q14 7 27-1',eyeR:'M214 222q13 7 25 0',mouth:'M182 304q19 3 37-2',turn:0,open:0};
    const hair = {
      sumi:'M119 219Q119 122 198 106Q281 113 290 220Q270 177 220 169Q162 166 119 219M125 179Q99 261 120 364Q98 314 104 239Z',
      claire:'M122 215Q129 122 204 111Q283 117 292 222Q267 176 218 170Q163 169 122 215M127 178Q98 235 111 303Q124 264 138 211Z',
      marc:'M128 207Q138 145 202 133Q264 138 283 213Q255 183 217 176Q166 174 128 207',
      leon:'M128 205Q139 148 205 132Q268 138 282 211Q255 183 216 176Q167 175 128 205',
      marta:'M128 212Q140 132 205 119Q274 127 287 216Q260 178 216 172Q165 171 128 212M130 184Q113 253 129 322',
      andre:'M122 213Q130 127 203 116Q281 121 291 218Q264 178 216 171Q162 169 122 213'
    }[id] || '';
    const glasses = id==='marc'||id==='marta' ? `<g fill="none" stroke="#36373b" stroke-width="3.2" opacity=".72"><path d="M145 225q17-12 38 0q-4 26-23 28q-16-2-15-28ZM207 223q17-11 36 1q-2 24-20 27q-17-1-16-28ZM183 226q12-5 24-1"/></g>` : '';
    const earrings = id==='claire' ? `<circle cx="137" cy="274" r="5" fill="${sp.accent}"/><path d="M126 178Q105 206 110 256" stroke="${sp.accent}" stroke-width="6" opacity=".24" fill="none"/>` : '';
    const tie = id==='leon' ? `<path d="M196 408l24 0 10 98-23 29-23-29z" fill="${sp.accent}" opacity=".9"/>` : '';
    const hairExtra = {
      marta:`<ellipse cx="282" cy="166" rx="34" ry="39" fill="${sp.hair}"/><path d="M263 143q24-22 43 3" stroke="#c9b49d" stroke-width="3" opacity=".16" fill="none"/>`,
      andre:`<path d="M128 171Q177 119 252 130" stroke="#0e0d10" stroke-width="12" opacity=".55" fill="none"/><path d="M252 132q31 18 37 66" stroke="#0e0d10" stroke-width="9" opacity=".45" fill="none"/>`,
      marc:`<path d="M145 168q58-34 116 4" stroke="#d7d2c8" stroke-width="5" opacity=".18" fill="none"/>`,
      leon:`<path d="M135 169q61-32 125 3" stroke="#f0e8dc" stroke-width="6" opacity=".22" fill="none"/>`
    }[id] || '';
    const faceDetails = {
      marta:`<path d="M142 256q10 5 18 1M241 255q10-4 18 2M169 292q31 11 65-1" stroke="${sp.shadow}" stroke-width="2.2" opacity=".46" fill="none"/><path d="M153 198q19-10 37-2M211 195q20-9 38 3" stroke="#5b4941" stroke-width="2" opacity=".42" fill="none"/>`,
      andre:`<path d="M177 286q24-10 49 0q-22 15-49 0Z" fill="#35272a" opacity=".82"/><path d="M183 314q18 9 34 0" stroke="#3a2a2b" stroke-width="5" opacity=".7" fill="none"/><path d="M145 270q13 17 27 20M248 268q-11 17-25 21" stroke="${sp.shadow}" stroke-width="3" opacity=".42" fill="none"/>`,
      marc:`<path d="M142 258q11 8 21 3M240 258q11-6 20 2M162 291q38 13 73-2" stroke="${sp.shadow}" stroke-width="2.2" opacity=".38" fill="none"/>`,
      leon:`<path d="M137 214q13-20 28-29M262 188q16 14 22 34" stroke="#d7d0c7" stroke-width="8" opacity=".44" fill="none"/>`,
      claire:`<path d="M134 178q-17 38-9 87" stroke="#1f1920" stroke-width="8" opacity=".7" fill="none"/>`
    }[id] || '';
    return `<svg viewBox="0 0 420 650" aria-hidden="true">
      <defs>
        <linearGradient id="face-${id}" x1="0" y1="0" x2="1" y2=".75"><stop stop-color="${sp.light}"/><stop offset=".38" stop-color="${sp.skin}"/><stop offset="1" stop-color="${sp.shadow}"/></linearGradient>
        <linearGradient id="coat-${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${sp.coat}"/><stop offset="1" stop-color="#191e29"/></linearGradient>
        <filter id="ink-${id}" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="2" seed="${id.length*17}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale=".75"/></filter>
        <filter id="blur-${id}"><feGaussianBlur stdDeviation="18"/></filter>
      </defs>
      <ellipse cx="216" cy="610" rx="152" ry="25" fill="#000" opacity=".42" filter="url(#blur-${id})"/>
      <path d="M38 278Q90 106 235 73Q337 57 403 230" fill="none" stroke="${sp.accent}" stroke-width="10" opacity=".26"/>
      <path d="M28 370Q92 209 167 165" fill="none" stroke="#f4e4c7" stroke-width="3" opacity=".13"/>
      <g transform="rotate(${e.turn} 210 260)" filter="url(#ink-${id})">
        <path d="M45 650Q58 487 121 410Q163 375 205 372Q259 372 306 411Q369 486 385 650Z" fill="url(#coat-${id})"/>
        <path d="M76 642Q99 505 142 433M352 642Q326 505 288 432" fill="none" stroke="${sp.accent}" stroke-width="12" opacity=".31"/>
        <path d="M160 389Q202 429 252 389L281 650H131Z" fill="${sp.shirt}" opacity=".9"/>
        ${tie}
        <path d="M173 338L244 334L249 410Q211 434 168 407Z" fill="url(#face-${id})"/>
        <path d="M120 210Q126 127 207 114Q286 121 295 220L283 294Q267 350 214 365Q159 349 133 296Z" fill="url(#face-${id})"/>
        <path d="M124 213Q113 242 126 288Q135 315 155 334Q132 317 118 289Q105 250 124 213Z" fill="${sp.shadow}" opacity=".34"/>
        <path d="M225 151Q274 161 289 216Q280 177 246 159Z" fill="#fff" opacity=".08"/>
        ${hairExtra}<path d="${hair}" fill="${sp.hair}"/>
        <path d="${e.browL}" stroke="#302b2c" stroke-width="4" stroke-linecap="round" fill="none"/><path d="${e.browR}" stroke="#302b2c" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="${e.eyeL}" stroke="#2a292c" stroke-width="3.8" stroke-linecap="round" fill="none"/><path d="${e.eyeR}" stroke="#2a292c" stroke-width="3.8" stroke-linecap="round" fill="none"/>
        <circle cx="166" cy="226" r="3.3" fill="#22252b"/><circle cx="226" cy="224" r="3.3" fill="#22252b"/>
        <path d="M200 221Q190 269 201 285Q210 291 220 281" stroke="${sp.shadow}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="${e.mouth}" stroke="#774d49" stroke-width="3.7" fill="none" stroke-linecap="round"/>${faceDetails}
        <path d="M140 190Q159 156 199 151M232 153Q263 163 280 194" stroke="#fff" stroke-width="4" fill="none" opacity=".11"/>
        ${glasses}${earrings}
      </g>
      <path d="M104 524Q200 566 320 510" fill="none" stroke="#fff" stroke-width="2" opacity=".08"/>
    </svg>`;
  }

  function speakerToId(speaker) {
    const s = speaker || '';
    if (/クレール/.test(s)) return 'claire';
    if (/フィンセント|ゴッホ/.test(s)) return 'vincent';
    if (/ゴーギャン/.test(s)) return 'gauguin';
    if (/マルタ/.test(s)) return 'marta';
    if (/アンドレ/.test(s)) return 'andre';
    if (/マルク/.test(s)) return 'marc';
    if (/レオン/.test(s)) return 'leon';
    if (/澄/.test(s)) return 'sumi';
    return null;
  }

  function setCharacters(n) {
    els.characterLayer.innerHTML = '';
    let ids = [];
    if (n.characters) ids = n.characters;
    else if (n.character) ids = [n.character];
    if (!ids.length) return;
    const speakerId = speakerToId(n.speaker);
    ids.slice(0,2).forEach((id, i) => {
      const active = speakerId ? speakerId === id : true;
      const roleClass = speakerId ? (active ? 'speaking' : 'listening') : 'present';
      const mood = inferMood(n, id, active);
      const d = document.createElement('div');
      d.className = `character-card ${ids.length === 1 ? 'right' : (i === 0 ? 'left' : 'right')} ${roleClass} mood-${mood}`;
      const paintedPortraits = {vincent:'assets/portrait-vincent.jpg', gauguin:'assets/portrait-gauguin.jpg'};
      if (paintedPortraits[id]) {
        d.classList.add('painted-portrait', `portrait-${id}`);
        d.innerHTML = `<div class="portrait-canvas"><img src="${paintedPortraits[id]}" alt=""><span class="portrait-glaze"></span></div>`;
      } else {
        d.innerHTML = characterSvg(id, mood);
      }
      els.characterLayer.appendChild(d);
    });
  }

  function setScene(n) {
    const newBg = n.bg || 'train';
    if (lastSceneBg && lastSceneBg !== newBg && !state.settings.reduceMotion) {
      els.scene.classList.add('scene-changing');
      setTimeout(() => els.scene.classList.remove('scene-changing'), 420);
    }
    lastSceneBg = newBg;
    const sceneState = n.visualState || 'normal';
    const sceneTone = n.sceneTone || 'default';
    els.scene.className = `scene bg-${newBg} state-${sceneState} tone-${sceneTone}${els.scene.classList.contains('scene-changing') ? ' scene-changing' : ''}`;
    els.scene.dataset.state = sceneState;
    els.scene.dataset.tone = sceneTone;
    const paintBgs = ['labPainting','scan','infrared','scanSafe','screenGlow','portal'];
    if (n.type === 'revealPainting') state.paintingRevealed = true;
    els.paintingStage.classList.toggle('hidden', !(state.paintingRevealed && paintBgs.includes(n.bg)));
    setCharacters(n);
    audio?.set(n.ambient || ambientForBg(n.bg));
  }

  function ambientForBg(bg) {
    const map = {train:'train',arles:'summer',alley:'summer',avenue:'summer',instituteExterior:'summerNight',loadingBay:'hum',corridor:'hum',breakRoom:'room',recovery:'room',labPainting:'lab',archive:'room',courtyard:'summerNight',equipment:'machine',scan:'scanner',infrared:'scannerLow',scanSafe:'scanner',screenGlow:'lowTone',blackout:'blackout',emergency:'fire',smoke:'fire',electric:'electric',portal:'portal',bedroomWorld:'arlesRoom',guestRoom:'arlesRoom',yellowHouse:'arlesRoom',chairLayer:'lowTone',keyholeRoom:'lowTone',layerCollapse:'crumble',saintRemy:'quiet',comparisonRoom:'quiet',martaWorkshop:'rainWorkshop',paperArchive:'archivePaper',andreWarehouse:'typewriterRoom',warehouseDeep:'solventWarehouse',warehouseDark:'void',documentLayer:'typewriterRoom',provenanceRoom:'room',fireControl:'overheatForecast',instituteFire:'fire',outsideDawn:'summerNight',finalLab:'lab',finalGallery:'quiet',darkGallery:'void',bedroomCrumble:'crumble',unpainted:'void'};
    return map[bg] || 'room';
  }

  function clearTyping() {
    if (typingTimer) { clearTimeout(typingTimer); typingTimer = null; }
  }

  function clearAutoTimer() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  }

  function canonicalChapter(chapter) {
    const c = chapter || '';
    if (/^PROLOGUE|^RETURN/.test(c)) return 'PROLOGUE';
    for (let i = 1; i <= 6; i++) if (new RegExp(`ACT\\s*${i}`).test(c)) return `ACT ${i}`;
    if (/ENDING|END/.test(c)) return 'ENDING';
    return c;
  }

  function showChapterCard(chapter) {
    const info = CHAPTER_INFO[canonicalChapter(chapter)];
    if (!info) return;
    clearTimeout(chapterTimer);
    els.chapterCardKicker.textContent = info[0];
    els.chapterCardTitle.textContent = info[1];
    els.chapterCardSubtitle.textContent = info[2];
    els.chapterCard.classList.remove('hidden');
    audio?.sfx('chapter');
    chapterTimer = setTimeout(() => els.chapterCard.classList.add('hidden'), state.settings.reduceMotion ? 700 : 2200);
  }

  function showPlaceCard(location, time) {
    clearTimeout(placeTimer);
    els.placeCardLocation.textContent = location || '—';
    els.placeCardTime.textContent = time || '—';
    els.placeCard.classList.remove('hidden');
    placeTimer = setTimeout(() => els.placeCard.classList.add('hidden'), state.settings.reduceMotion ? 650 : 1900);
  }

  function showBeatCard(text) {
    if (!els.beatCard || !text) return;
    clearTimeout(beatTimer);
    els.beatCardText.textContent = text;
    els.beatCard.classList.remove('hidden','beat-in');
    void els.beatCard.offsetWidth;
    els.beatCard.classList.add('beat-in');
    beatTimer = setTimeout(() => els.beatCard.classList.add('hidden'), state.settings.reduceMotion ? 750 : 1950);
  }

  function trackNodeTime(nextChapter) {
    const now = Date.now();
    const metrics = state.metrics || (state.metrics = defaultMetrics());
    const delta = Math.max(0, Math.min(300000, now - (metrics.lastNodeAt || now)));
    const chapter = canonicalChapter(state.currentChapter || 'PROLOGUE');
    metrics.chapterMs[chapter] = (metrics.chapterMs[chapter] || 0) + delta;
    metrics.lastNodeAt = now;
    if (nextChapter) metrics.currentChapter = canonicalChapter(nextChapter);
  }

  function metricIncrement(bucket, key, amount = 1) {
    const metrics = state.metrics || (state.metrics = defaultMetrics());
    metrics[bucket] ||= {};
    metrics[bucket][key] = (metrics[bucket][key] || 0) + amount;
  }

  function updateProgress(id) {
    const i = nodeOrder.get(id) || 0;
    const pct = Math.max(0, Math.min(100, Math.round((i / Math.max(1, DATA.nodes.length - 1)) * 100)));
    els.progressLabel.textContent = `${pct}%`;
    els.progressFill.style.width = `${pct}%`;
  }

  function scriptForNode(n) {
    if (Array.isArray(n?.script) && n.script.length) return n.script;
    return [{
      mode: n?.voice === 'inner' ? 'inner' : (n?.type === 'evidenceText' ? 'document' : 'dialogue'),
      speaker: n?.speaker || (n?.voice === 'inner' ? '澄' : ''),
      emotion: n?.emotion || '',
      voice: n?.voice || (n?.speaker === '澄（内心）' ? 'inner' : 'normal'),
      text: n?.text || ''
    }];
  }

  function segmentPresentation(n, seg) {
    return {
      ...n,
      ...seg,
      bg: seg?.bg || n.bg,
      ambient: seg?.ambient || n.ambient,
      visualState: seg?.visualState || n.visualState,
      sceneTone: seg?.sceneTone || n.sceneTone,
      characters: seg?.characters || n.characters,
      character: seg?.character || n.character,
      mood: seg?.mood || n.mood,
      listenerMood: seg?.listenerMood || n.listenerMood,
      speaker: seg?.speaker ?? n.speaker ?? '',
      emotion: seg?.emotion ?? '',
      text: seg?.text ?? ''
    };
  }

  function renderSegment(index, save = true) {
    if (!node) return;
    segmentIndex = Math.max(0, Math.min(index, Math.max(0, currentScript.length - 1)));
    state.segmentIndex = segmentIndex;
    currentSegment = currentScript[segmentIndex] || {mode:'inner',speaker:'澄',emotion:'内心',voice:'inner',text:''};
    const presentation = segmentPresentation(node, currentSegment);
    afterTextRanFor = null;
    const segmentKey = `${node.id}:${segmentIndex}`;
    currentWasRead = !!state.readSegments[segmentKey];
    state.readSegments[segmentKey] = true;
    els.readStatus.textContent = `${currentWasRead ? '既読' : ''}${currentScript.length > 1 ? `${currentWasRead ? ' · ' : ''}${segmentIndex + 1}/${currentScript.length}` : ''}`;
    setScene(presentation);
    const cue = currentSegment.sfx || (segmentIndex === 0 ? node.sfx : null);
    if (cue) setTimeout(() => audio?.sfx(cue), currentSegment.sfxDelay || node.sfxDelay || 40);
    els.speaker.textContent = currentSegment.speaker || (currentSegment.mode === 'inner' ? '澄' : '');
    els.emotion.textContent = currentSegment.emotion || ({inner:'内心',document:'文書',system:'観察'}[currentSegment.mode] || '');
    els.dialogue.dataset.voice = currentSegment.voice || currentSegment.mode || 'normal';
    els.dialogue.dataset.delivery = currentSegment.delivery || 'neutral';
    fullText = currentSegment.text || '';
    if (['investigate','investigatePainting','puzzle'].includes(node.type) && !fullText) els.dialogue.classList.add('hidden');
    else els.dialogue.classList.remove('hidden');
    addLog(node, currentSegment, segmentIndex);
    typeText(fullText, () => afterTextComplete(node));
    if (save) saveGame(false, SAVE_KEYS.auto);
    updateMenuStatus();
  }

  function renderNode(id, save = true, suppressCards = false, resumeSegment = 0) {
    clearTyping(); clearAutoTimer(); hideTransient(); afterTextRanFor = null;
    const nextNode = nodes.get(id);
    if (!nextNode) { console.error('missing node', id); return; }
    trackNodeTime(nextNode.chapter || state.currentChapter);
    metricIncrement('nodeVisits', id);
    const previousChapter = state.currentChapter;
    const previousLocation = state.currentLocation;
    const previousTime = state.currentTime;
    node = nextNode;
    state.nodeId = id;
    if (!state.visited.includes(id)) state.visited.push(id);
    if (node.set) applySet(node.set);
    if (node.chapter) state.currentChapter = node.chapter;
    if (node.location) state.currentLocation = node.location;
    if (node.time) state.currentTime = node.time;
    state.savedAt = Date.now();
    state.readNodes[id] = true;

    els.chapter.textContent = state.currentChapter;
    els.location.textContent = state.currentLocation;
    els.time.textContent = state.currentTime;
    els.loop.textContent = state.paintingLoop ? `絵画記録 ${String(state.paintingLoop).padStart(2,'0')}` : `記録 ${String(state.loop).padStart(2,'0')}`;
    updateProgress(id);

    if (!suppressCards && canonicalChapter(state.currentChapter) !== canonicalChapter(previousChapter)) showChapterCard(state.currentChapter);
    if (!suppressCards && (state.currentLocation !== previousLocation || state.currentTime !== previousTime)) showPlaceCard(state.currentLocation, state.currentTime);
    if (!suppressCards && node.beat) showBeatCard(node.beat);

    currentScript = scriptForNode(node);
    if (node.evidence && !state.evidence.includes(node.evidence)) {
      addEvidence(node.evidence, false);
      pendingEvidenceToast = node.evidence;
    }
    renderSegment(Number.isFinite(resumeSegment) ? resumeSegment : 0, save);
  }

  function applySet(obj) {
    Object.entries(obj).forEach(([k,v]) => {
      if (k === 'loop' || k === 'paintingLoop') state[k] = v;
      else state.flags[k] = v;
    });
  }

  function typingDelayFor(char) {
    const pace = Number(currentSegment?.pace || node?.pace || 1);
    const base = Number(state.settings.speed) * pace;
    if (base === 0 || state.settings.reduceMotion) return 0;
    if (char === '。' || char === '！' || char === '？' || char === '\n') return base + 80;
    if (char === '、') return base + 35;
    return base;
  }

  function typeText(text, done) {
    els.text.textContent = '';
    typingDone = false;
    let i = 0;
    const shouldInstant = state.settings.speed === 0 || state.settings.reduceMotion || (skipMode && (!state.settings.skipReadOnly || currentWasRead));
    if (shouldInstant) {
      els.text.textContent = text;
      typingDone = true;
      done?.();
      return;
    }
    const step = () => {
      i++;
      els.text.textContent = text.slice(0, i);
      if (i >= text.length) {
        typingDone = true;
        typingTimer = null;
        done?.();
        return;
      }
      typingTimer = setTimeout(step, typingDelayFor(text[i - 1]));
    };
    typingTimer = setTimeout(step, Math.max(1, state.settings.speed));
  }

  function completeTyping() {
    if (typingDone) return false;
    clearTyping();
    els.text.textContent = fullText;
    typingDone = true;
    afterTextComplete(node);
    return true;
  }

  function isInteractiveNode(n) {
    return ['choice','investigate','investigatePainting','puzzle','earlyEnding','ending'].includes(n.type);
  }

  function isDangerNode(n) {
    return n.type === 'deathSequence' || ['blackout','emergency','smoke','electric','instituteFire','layerCollapse','bedroomCrumble','void'].includes(n.bg) || ['preblackout','collapse','death','memory'].includes(n.visualState);
  }

  function scheduleAuto(n) {
    clearAutoTimer();
    if (!autoMode && !skipMode) return;
    if (!n || isInteractiveNode(n)) return;
    let delay;
    if (skipMode && (!state.settings.skipReadOnly || currentWasRead)) delay = 110;
    else {
      const presented = segmentPresentation(n, currentSegment || {});
      const deliveryPause = ({quick:-80,direct:40,measured:220,dry:120,precise:180,formal:150,restrained:200,persuasive:80,controlled:80,constrained:420,radio:140}[currentSegment?.delivery] || 0);
      delay = Number(state.settings.autoDelay) + Math.min(2100, (currentSegment?.text || n.text || '').length * 18) + Number(currentSegment?.autoExtra || n.autoExtra || 0) + deliveryPause;
      delay = Math.max(220, delay);
      if (isDangerNode(presented)) delay += 900;
    }
    autoTimer = setTimeout(() => advance(true), delay);
  }

  function afterTextComplete(n) {
    const segmentKey = n ? `${n.id}:${segmentIndex}` : '';
    if (!n || afterTextRanFor === segmentKey) return;
    afterTextRanFor = segmentKey;
    typingDone = true;
    const finalSegment = segmentIndex >= currentScript.length - 1;
    if (!finalSegment) { scheduleAuto(n); return; }
    if (pendingEvidenceToast) {
      const ev = pendingEvidenceToast; pendingEvidenceToast = null; showEvidenceToast(ev);
    }
    if (n.type === 'choice') { pauseAutoAtInteraction(); showChoices(n.choices); return; }
    if (n.type === 'investigate' || n.type === 'investigatePainting') { pauseAutoAtInteraction(); startInvestigation(n); return; }
    if (n.type === 'puzzle') { pauseAutoAtInteraction(); showPuzzle(n); return; }
    if (n.type === 'earlyEnding') { pauseAutoAtInteraction(); setTimeout(() => showEnding('early'), 500); return; }
    if (n.type === 'ending') { pauseAutoAtInteraction(); setTimeout(() => showEnding(n.endingKind || 'demo'), 500); return; }
    scheduleAuto(n);
  }

  function advance(fromAuto = false) {
    if (completeTyping()) return;
    if (!node) return;
    clearAutoTimer();
    if (!fromAuto) audio?.sfx('advance');
    if (segmentIndex < currentScript.length - 1) {
      renderSegment(segmentIndex + 1, true);
      return;
    }
    if (isInteractiveNode(node)) return;
    if (node.type === 'deathSequence') { showGameover(node.death); return; }
    if (node.next) renderNode(node.next);
  }

  function hideTransient() {
    if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; }
    els.dialogue.classList.remove('hidden');
    els.choices.classList.add('hidden'); els.choices.innerHTML = '';
    els.inv.classList.add('hidden'); els.hotspotLayer.innerHTML = ''; invState = null;
    document.querySelector('.puzzle-panel')?.remove();
  }

  function pauseAutoAtInteraction() {
    clearAutoTimer();
  }

  function showChoices(choices) {
    els.choices.innerHTML = '';
    choices.forEach((c, index) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<span class="choice-number">${String(index + 1).padStart(2,'0')}</span><span>${escapeHtml(c.text)}</span>`;
      b.addEventListener('click', e => {
        e.stopPropagation();
        audio?.sfx('choice');
        metricIncrement('choiceSelections', `${node.id}:${index + 1}`);
        if (c.set) applySet(c.set);
        renderNode(c.next);
      });
      els.choices.appendChild(b);
    });
    els.choices.classList.remove('hidden');
  }

  function startInvestigation(n) {
    invState = {found:new Set(), min:n.min || n.hotspots.length, node:n, startedAt:Date.now(), hints:0};
    els.invTitle.textContent = n.title || '調査';
    updateInvProgress();
    els.inv.classList.remove('hidden');
    renderHotspots();
    configureInvestigationHint();
    els.invFinish.onclick = e => {
      e.stopPropagation();
      if (invState.found.size >= invState.min) {
        audio?.sfx('choice');
        const elapsed = Date.now() - invState.startedAt;
        const record = state.metrics.investigation[n.id] || {runs:0,totalMs:0,hints:0};
        record.runs += 1; record.totalMs += elapsed; record.hints += invState.hints;
        state.metrics.investigation[n.id] = record;
        renderNode(n.next);
      }
    };
  }

  function configureInvestigationHint() {
    if (!els.invHint || !invState) return;
    const mode = state.settings.assistMode || 'standard';
    els.invHint.classList.toggle('hidden', mode === 'off');
    els.invHint.disabled = mode !== 'story';
    els.invHint.textContent = mode === 'story' ? '観察の手引き' : '手引き準備中';
    els.invHint.onclick = e => { e.stopPropagation(); useInvestigationHint(); };
    if (mode === 'off') return;
    const wait = mode === 'story' ? 3500 : 14000;
    hintTimer = setTimeout(() => {
      if (!invState) return;
      els.invHint.disabled = false;
      els.invHint.textContent = '観察の手引き';
    }, state.settings.reduceMotion ? 300 : wait);
  }

  function useInvestigationHint() {
    if (!invState || !els.invHint || els.invHint.disabled) return;
    const target = (invState.node.hotspots || []).find(h => !invState.found.has(h.id));
    if (!target) { showToast('未確認の場所はありません。'); return; }
    const button = els.hotspotLayer.querySelector(`[data-id="${target.id}"]`);
    button?.classList.add('hinted');
    setTimeout(() => button?.classList.remove('hinted'), state.settings.reduceMotion ? 900 : 3300);
    invState.hints += 1; state.metrics.hintsUsed += 1;
    showToast(`<strong>視線を向ける</strong><br>${escapeHtml(target.label)}の周辺を確認してください。`, false, true);
    els.invHint.disabled = true;
    els.invHint.textContent = '手引きを使用済み';
  }

  function renderHotspots() {
    els.hotspotLayer.innerHTML = '';
    if (!invState) return;
    const painting = invState.node.type === 'investigatePainting';
    invState.node.hotspots.forEach(h => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hotspot'; b.dataset.id = h.id;
      const lab = document.createElement('span'); lab.className = 'hotspot-label'; lab.textContent = h.label; b.appendChild(lab);
      const pos = () => {
        if (painting) {
          const r = els.paintingStage.getBoundingClientRect();
          b.style.left = `${r.left + r.width * h.x / 100}px`; b.style.top = `${r.top + r.height * h.y / 100}px`;
          b.style.width = `${r.width * h.w / 100}px`; b.style.height = `${r.height * h.h / 100}px`;
        } else {
          b.style.left = `${h.x}%`; b.style.top = `${h.y}%`; b.style.width = `${h.w}%`; b.style.height = `${h.h}%`;
        }
      };
      pos(); b._position = pos;
      if (invState.found.has(h.id)) b.classList.add('found');
      b.addEventListener('click', e => {
        e.stopPropagation();
        const isNew = !invState.found.has(h.id);
        invState.found.add(h.id); b.classList.add('found');
        if (isNew) audio?.sfx('evidence');
        if (h.evidence) addEvidence(h.evidence, true);
        showToast(`<strong>${escapeHtml(h.label)}</strong><br>${escapeHtml(h.text)}`, false, true);
        updateInvProgress();
      });
      els.hotspotLayer.appendChild(b);
    });
  }

  function updateInvProgress() {
    const n = invState?.node;
    if (!n) return;
    els.invProgress.textContent = `発見 ${invState.found.size} / 必要 ${invState.min}`;
    els.invFinish.disabled = invState.found.size < invState.min;
  }

  window.addEventListener('resize', () => document.querySelectorAll('.hotspot').forEach(h => h._position?.()));

  function addEvidence(id, toast = true) {
    if (!DATA.evidence[id]) return;
    if (!state.evidence.includes(id)) {
      state.evidence.push(id);
      if (toast) showEvidenceToast(id);
      renderNotebook();
    }
  }

  function showEvidenceToast(id) {
    const e = DATA.evidence[id];
    if (!e) return;
    audio?.sfx('evidence');
    showToast(`<strong>${escapeHtml(e.title)}</strong><br>${escapeHtml(e.text)}`, true, true);
  }

  function showToast(msg, evidence = false, html = false) {
    clearTimeout(toastTimer);
    els.toast.className = `toast${evidence ? ' evidence' : ''}`;
    if (html) els.toast.innerHTML = msg; else els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    toastTimer = setTimeout(() => els.toast.classList.add('hidden'), evidence ? 4800 : 3800);
  }

  function showGameover(id) {
    const g = DATA.gameovers[id];
    if (!g) return;
    pauseModes(true);
    state.deaths++;
    metricIncrement('deathsById', id);
    const repeatDeath = state.metrics.deathsById[id] || 1;
    let cause = g.cause;
    if (g.causeByPath) cause = g.causeByPath[state.flags.death_path] || Object.values(g.causeByPath)[0];
    if (id === 'GO01') addEvidence('marc_card', false);
    if (id === 'GO04') { addEvidence('unfinished_floor', false); addEvidence('mdv_signature', false); }
    for (const ev of g.evidence || []) addEvidence(ev, false);
    state.flags.lastGameover = id; state.flags.returnTo = g.returnTo;
    state.savedAt = Date.now();
    audio?.sfx('death');
    document.body.classList.add('death-transition');
    setTimeout(() => {
      document.body.classList.remove('death-transition');
      els.game.classList.add('hidden'); els.gameover.classList.remove('hidden');
      els.gameoverTitle.textContent = g.title;
      els.deathCounter.innerHTML = `DEATH ${String(state.deaths).padStart(2,'0')} · ${id}${repeatDeath > 1 ? `<span class="gameover-repeat">同一死因 ${repeatDeath}回</span>` : ''}`;
      const warnings = (g.warnings || []).map((x, i) => `<li><span>${String(i + 1).padStart(2,'0')}</span><p>${escapeHtml(x)}</p></li>`).join('');
      els.gameoverBody.innerHTML = `
        <section class="cause-chain"><div class="cause-step"><span>01</span><div><h3>判断</h3><p>${escapeHtml(cause || '原因を特定できなかった。')}</p></div></div>
        <div class="cause-step"><span>02</span><div><h3>事前に確認できた兆候</h3><ol class="warning-list">${warnings}</ol></div></div>
        <div class="cause-step residue-step"><span>03</span><div><h3>最後に残った観察</h3><p>${escapeHtml(g.residue || '持ち越せる観察はない。')}</p></div></div></section>`;
      audio?.set('void');
      saveGame(false, SAVE_KEYS.auto);
    }, state.settings.reduceMotion ? 50 : 620);
  }

  function returnFromGameover() {
    const target = state.flags.returnTo || 'r01';
    els.gameover.classList.add('hidden'); els.game.classList.remove('hidden');
    renderNode(target);
  }

  function showPuzzle(n) {
    const cfg = n.puzzle || {
      fields: [
        {key:'chair',label:'椅子',options:[['window','窓際のまま'],['line','鉛筆線へ戻す'],['door','扉の前へ置く']],correct:'line'},
        {key:'door',label:'左扉',options:[['open','開いたまま'],['half','半開き'],['closed','完全に閉じる']],correct:'closed'},
        {key:'bed',label:'ベッド',options:[['wall','壁へ密着'],['oneboard','床板一枚分離す'],['center','中央へ寄せる']],correct:'oneboard'}
      ],
      success:'スケッチ、鉛筆線、家具の影が一致した。', button:'構図を確定する'
    };
    const panel = document.createElement('section'); panel.className = 'puzzle-panel';
    const fields = cfg.fields || [];
    panel.innerHTML = `<div class="puzzle-heading"><p class="eyebrow">RESTORATION ANALYSIS</p><h2>${escapeHtml(n.title)}</h2><p>${escapeHtml(n.text)}</p></div><div class="puzzle-items">${fields.map(f => `<label><span>${escapeHtml(f.label)}</span><select data-key="${escapeHtml(f.key)}">${f.options.map(o => {const v = Array.isArray(o) ? o[0] : o.value, l = Array.isArray(o) ? o[1] : o.label; return `<option value="${escapeHtml(v)}">${escapeHtml(l)}</option>`;}).join('')}</select></label>`).join('')}</div><p class="puzzle-feedback" aria-live="polite"></p><div class="puzzle-progressive-hint hidden" aria-live="polite"></div><button class="primary puzzle-check">${escapeHtml(cfg.button || '確定する')}</button><div class="puzzle-secondary-actions"><button type="button" class="puzzle-notebook">観察手帳を開く</button><button type="button" class="puzzle-assist hidden">一項目の候補を示す</button></div>`;
    document.body.appendChild(panel);
    const selects = panel.querySelectorAll('select');
    panel.querySelector('.puzzle-notebook').onclick = e => { e.stopPropagation(); openDialog('notebook'); };
    let localAttempts = 0;
    panel.querySelector('.puzzle-check').onclick = e => {
      e.stopPropagation();
      localAttempts += 1;
      metricIncrement('puzzleAttempts', n.id);
      const vals = Object.fromEntries([...selects].map(s => [s.dataset.key, s.value]));
      const wrong = fields.filter(f => vals[f.key] !== f.correct);
      const fb = panel.querySelector('.puzzle-feedback');
      if (!wrong.length) {
        audio?.sfx('evidence');
        fb.textContent = cfg.success || '観察と配置が一致した。';
        panel.querySelector('.puzzle-check').disabled = true;
        if (cfg.set) applySet(cfg.set);
        for (const ev of cfg.evidence || []) addEvidence(ev, false);
        setTimeout(() => { panel.remove(); renderNode(n.next); }, 850);
      } else {
        audio?.sfx('error');
        fb.textContent = cfg.failure || `まだ一致しない：${wrong.map(f => f.label).join('、')}。手帳と室内の痕跡を確認できる。`;
        const progressive = panel.querySelector('.puzzle-progressive-hint');
        if (localAttempts >= 2 && state.settings.assistMode !== 'off') {
          progressive.classList.remove('hidden');
          progressive.textContent = `見直す範囲：${wrong.slice(0,2).map(f => f.label).join('、')}。現在の記録を、事実・推定・後世の追加に分けて確認してください。`;
        }
        const assist = panel.querySelector('.puzzle-assist');
        if (localAttempts >= 2 && state.settings.assistMode === 'story') {
          assist.classList.remove('hidden');
          assist.onclick = ev => {
            ev.stopPropagation();
            const field = wrong[0];
            const select = [...selects].find(x => x.dataset.key === field.key);
            if (select) select.value = field.correct;
            state.metrics.hintsUsed += 1;
            assist.disabled = true; assist.textContent = `${field.label}の候補を反映済み`;
            progressive.classList.remove('hidden'); progressive.textContent = `${field.label}は、現在の物証と矛盾しない候補へ合わせました。残りは手帳から判断してください。`;
          };
        }
        panel.classList.remove('puzzle-error'); void panel.offsetWidth; panel.classList.add('puzzle-error');
      }
    };
  }

  function showEnding(kind) {
    pauseModes(true);
    els.game.classList.add('hidden'); els.ending.classList.remove('hidden');
    if (kind === 'early') {
      $('#ending-screen .eyebrow').textContent = 'NORMAL END — 見なかった夜';
      $('#ending-screen h2').textContent = '誰も死ななかった。誰の名前も戻らなかった。';
      els.endingSummary.textContent = node.text;
    } else {
      const info = DATA.endings?.[kind] || {eyebrow:'CHAPTER COMPLETE', title:'記録は次の層へ続く。', summary:node.text || ''};
      $('#ending-screen .eyebrow').textContent = info.eyebrow;
      $('#ending-screen h2').textContent = info.title;
      els.endingSummary.textContent = info.summary || node.text || '';
    }
    const minutes = Math.max(1, Math.round((state.totalPlayMs + Date.now() - state.playStartedAt) / 60000));
    const readPercent = Math.round((Object.keys(state.readNodes).length / DATA.nodes.length) * 100);
    els.endingStats.innerHTML = `<div class="stat"><strong>${state.deaths}</strong>死亡</div><div class="stat"><strong>${state.evidence.length}</strong>記録</div><div class="stat"><strong>${minutes}</strong>分</div><div class="stat"><strong>${readPercent}%</strong>読了</div>`;
    saveGame(false, SAVE_KEYS.auto);
  }

  function renderNotebook() {
    const query = ($('#notebook-search')?.value || '').trim().toLowerCase();
    const filter = $('#notebook-filter')?.value || 'all';
    const allItems = state.evidence.map(id => DATA.evidence[id]).filter(Boolean);
    const groups = [...new Set(allItems.map(e => e.group))];
    const filterEl = $('#notebook-filter');
    if (filterEl) {
      const selected = filterEl.value || 'all';
      filterEl.innerHTML = `<option value="all">すべての分類</option>${groups.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('')}`;
      filterEl.value = groups.includes(selected) ? selected : 'all';
    }
    const visible = allItems.filter(e => (filter === 'all' || e.group === filter) && (!query || `${e.title} ${e.text} ${e.group}`.toLowerCase().includes(query)));
    const grouped = {};
    visible.forEach(e => (grouped[e.group] ??= []).push(e));
    $('#notebook-count').textContent = `${visible.length} / ${allItems.length}件`;
    $('#notebook-content').innerHTML = Object.entries(grouped).map(([g, items]) => `<section class="note-group"><div class="note-group-heading"><h3>${escapeHtml(g)}</h3><span>${items.length}</span></div>${items.map(e => `<article class="note-item"><strong>${escapeHtml(e.title)}</strong><p>${escapeHtml(e.text)}</p></article>`).join('')}</section>`).join('') || '<p class="empty-state">条件に合う記録はありません。</p>';
  }

  function renderLog() {
    const query = ($('#log-search')?.value || '').trim().toLowerCase();
    const entries = state.log.slice(-400).filter(x => !query || `${x.speaker} ${x.text}`.toLowerCase().includes(query));
    $('#log-content').innerHTML = entries.reverse().map(x => `<div class="log-entry"><b>${escapeHtml(x.speaker || (x.mode === 'inner' ? '澄' : x.mode === 'document' ? '記録' : '観察'))}</b><p>${escapeHtml(x.text)}</p></div>`).join('') || '<p class="empty-state">条件に合う会話はありません。</p>';
  }

  function addLog(n, seg = null, index = 0) {
    const text = seg?.text ?? n.text;
    if (!text) return;
    const key = `${n.id}:${index}`;
    const prev = state.log[state.log.length - 1];
    if (prev?.segmentKey === key) return;
    state.log.push({nodeId:n.id, segmentKey:key, mode:seg?.mode || 'dialogue', speaker:seg?.speaker || n.speaker || '', text, chapter:state.currentChapter});
    if (state.log.length > 1200) state.log.shift();
  }

  function renderSaveSlots() {
    const holder = $('#save-slots');
    if (!holder) return;
    const rows = [
      ['auto', 'AUTO', '各場面で自動更新'],
      ['slot1', 'SLOT 1', '手動記録'],
      ['slot2', 'SLOT 2', '手動記録'],
      ['slot3', 'SLOT 3', '手動記録']
    ];
    holder.innerHTML = rows.map(([name, label, note]) => {
      const saved = readSave(SAVE_KEYS[name]);
      const meta = saveMetadata(saved);
      const empty = !meta;
      return `<article class="save-slot ${empty ? 'empty' : ''}" data-slot="${name}">
        <div class="save-slot-index"><strong>${label}</strong><span>${note}</span></div>
        <div class="save-slot-body">${empty ? '<p>記録なし</p>' : `<h3>${escapeHtml(meta.chapter)}</h3><p>${escapeHtml(meta.location)} · ${escapeHtml(meta.time)}</p><small>${escapeHtml(meta.stamp)} · ${escapeHtml(meta.play)} · ${meta.deaths}死亡</small>`}</div>
        <div class="save-slot-actions">${name !== 'auto' ? '<button data-action="save">上書き保存</button>' : ''}<button data-action="load" ${empty ? 'disabled' : ''}>読み込む</button>${name !== 'auto' ? `<button data-action="delete" ${empty ? 'disabled' : ''}>削除</button>` : ''}</div>
      </article>`;
    }).join('');
    holder.querySelectorAll('.save-slot').forEach(slot => {
      const name = slot.dataset.slot;
      slot.querySelector('[data-action="save"]')?.addEventListener('click', () => {
        if (els.game.classList.contains('hidden')) { showToast('ゲーム中に保存してください。'); return; }
        saveGame(true, SAVE_KEYS[name]);
      });
      slot.querySelector('[data-action="load"]')?.addEventListener('click', () => {
        const saved = readSave(SAVE_KEYS[name]);
        if (!saved) return;
        slot.closest('dialog')?.close();
        startGame(saved);
      });
      slot.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteSave(SAVE_KEYS[name]));
    });
  }

  function currentPlaytestData() {
    trackNodeTime(state.currentChapter);
    const m = state.metrics || defaultMetrics();
    const investigationRuns = Object.values(m.investigation || {});
    const invRuns = investigationRuns.reduce((a,x) => a + (x.runs || 0), 0);
    const invMs = investigationRuns.reduce((a,x) => a + (x.totalMs || 0), 0);
    return {
      gameVersion: DATA.meta.version,
      exportedAt: new Date().toISOString(),
      nodeId: state.nodeId,
      chapter: state.currentChapter,
      totalPlayMs: state.totalPlayMs + Date.now() - state.playStartedAt,
      deaths: state.deaths,
      evidence: state.evidence.length,
      readNodes: Object.keys(state.readNodes).length,
      hintsUsed: m.hintsUsed || 0,
      nodeVisits: m.nodeVisits || {},
      choiceSelections: m.choiceSelections || {},
      investigation: m.investigation || {},
      puzzleAttempts: m.puzzleAttempts || {},
      deathsById: m.deathsById || {},
      chapterMs: m.chapterMs || {},
      averageInvestigationMs: invRuns ? Math.round(invMs / invRuns) : 0,
      settings: {...state.settings}
    };
  }

  function renderPlaytest() {
    if (!els.playtestSummary) return;
    const report = currentPlaytestData();
    const chapters = Object.entries(report.chapterMs).sort((a,b) => a[0].localeCompare(b[0], 'ja'));
    const puzzleRetries = Object.values(report.puzzleAttempts).reduce((a,x) => a + Math.max(0, x - 1), 0);
    els.playtestSummary.innerHTML = `<div class="playtest-metrics">
      <div class="playtest-metric"><span>総プレイ時間</span><strong>${escapeHtml(formatPlaytime(report.totalPlayMs))}</strong></div>
      <div class="playtest-metric"><span>死亡</span><strong>${report.deaths}</strong></div>
      <div class="playtest-metric"><span>パズル再試行</span><strong>${puzzleRetries}</strong></div>
      <div class="playtest-metric"><span>ヒント使用</span><strong>${report.hintsUsed}</strong></div>
    </div><table class="playtest-table"><thead><tr><th>章</th><th>滞在時間</th><th>読了状況</th></tr></thead><tbody>${chapters.map(([c,ms]) => `<tr><td>${escapeHtml(c)}</td><td>${escapeHtml(formatPlaytime(ms))}</td><td>${c === canonicalChapter(state.currentChapter) ? '現在地' : '記録済み'}</td></tr>`).join('') || '<tr><td colspan="3">まだ章ごとの計測がありません。</td></tr>'}</tbody></table><p class="modal-note">平均調査時間：${report.averageInvestigationMs ? Math.round(report.averageInvestigationMs / 1000) + '秒' : '未計測'}　読了：${report.readNodes} / ${DATA.nodes.length}ノード</p>`;
  }

  function exportPlaytest() {
    const report = currentPlaytestData();
    const blob = new Blob([JSON.stringify(report, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `fourth-bedroom-playtest-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    state.metrics.exportedAt = report.exportedAt;
    showToast('プレイ記録を書き出しました。');
  }

  function resetPlaytestMetrics() {
    if (!confirm('物語の進行やセーブは残し、計測データだけをリセットします。よろしいですか？')) return;
    state.metrics = defaultMetrics();
    renderPlaytest();
  }

  function updateMenuStatus() {
    if (!els.menuStatus) return;
    els.menuStatus.innerHTML = `<strong>${escapeHtml(state.currentChapter)}</strong><span>${escapeHtml(state.currentLocation)} · ${escapeHtml(state.currentTime)}</span><span>${state.evidence.length}記録 · ${state.deaths}死亡 · ${formatPlaytime(state.totalPlayMs + Date.now() - state.playStartedAt)}</span>`;
  }

  function openDialog(id) {
    const d = $(`#${id}-dialog`);
    if (!d) return;
    if (id === 'notebook') renderNotebook();
    if (id === 'log') renderLog();
    if (id === 'saves') renderSaveSlots();
    if (id === 'playtest') renderPlaytest();
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function updateModeButtons() {
    els.autoToggle?.classList.toggle('active', autoMode);
    els.skipToggle?.classList.toggle('active', skipMode);
    els.autoToggle?.setAttribute('aria-pressed', String(autoMode));
    els.skipToggle?.setAttribute('aria-pressed', String(skipMode));
    if (els.audioToggle) els.audioToggle.textContent = state.settings.ambient ? '音' : '消音';
  }

  function toggleAuto(force) {
    autoMode = typeof force === 'boolean' ? force : !autoMode;
    if (autoMode) skipMode = false;
    updateModeButtons();
    if (autoMode && typingDone) scheduleAuto(node); else clearAutoTimer();
  }

  function toggleSkip(force) {
    skipMode = typeof force === 'boolean' ? force : !skipMode;
    if (skipMode) autoMode = false;
    updateModeButtons();
    if (skipMode) {
      if (!typingDone && (!state.settings.skipReadOnly || currentWasRead)) completeTyping();
      if (typingDone) scheduleAuto(node);
    } else clearAutoTimer();
  }

  function pauseModes(hard = false) {
    clearAutoTimer();
    if (hard) { autoMode = false; skipMode = false; updateModeButtons(); }
  }

  function toggleUi(force) {
    uiHidden = typeof force === 'boolean' ? force : !uiHidden;
    document.body.classList.toggle('ui-hidden', uiHidden);
    els.restoreUi.classList.toggle('hidden', !uiHidden);
  }

  document.querySelectorAll('.close-modal').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => { b.closest('dialog')?.close(); openDialog(b.dataset.open); }));

  $('#new-game').addEventListener('click', () => {
    const hasSave = Object.values(SAVE_KEYS).some(k => { try { return !!localStorage.getItem(k); } catch (_) { return false; } });
    if (hasSave && !confirm('現在のオートセーブとは別に開始します。手動スロットは残ります。よろしいですか？')) return;
    try { localStorage.removeItem(SAVE_KEYS.auto); } catch (_) {}
    startGame();
  });
  els.continue.addEventListener('click', () => { const saved = readSave(SAVE_KEYS.auto) || latestSave(); if (saved) startGame(saved); });
  $('#title-load').addEventListener('click', () => openDialog('saves'));
  $('#title-settings').addEventListener('click', () => openDialog('settings'));
  $('#title-credits').addEventListener('click', () => openDialog('credits'));
  els.dialogue.addEventListener('click', () => advance());
  els.returnButton.addEventListener('click', returnFromGameover);
  $('#gameover-notebook').addEventListener('click', () => openDialog('notebook'));
  $('#menu-button').addEventListener('click', () => { updateMenuStatus(); $('#menu-dialog').showModal(); });
  $('#manual-save').addEventListener('click', () => {
    const empty = ['slot1','slot2','slot3'].find(name => !readSave(SAVE_KEYS[name]));
    saveGame(true, SAVE_KEYS[empty || 'slot1']);
  });
  $('#go-title').addEventListener('click', () => {
    saveGame(false, SAVE_KEYS.auto); $('#menu-dialog').close(); els.game.classList.add('hidden'); els.title.classList.remove('hidden'); updateContinueState();
  });
  $('#restart-demo').addEventListener('click', () => { try { localStorage.removeItem(SAVE_KEYS.auto); } catch (_) {} els.ending.classList.add('hidden'); startGame(); });
  $('#return-title').addEventListener('click', () => { els.ending.classList.add('hidden'); els.title.classList.remove('hidden'); updateContinueState(); });

  els.autoToggle.addEventListener('click', () => toggleAuto());
  els.skipToggle.addEventListener('click', () => toggleSkip());
  els.uiToggle.addEventListener('click', () => toggleUi());
  els.restoreUi.addEventListener('click', () => toggleUi(false));
  els.audioToggle.addEventListener('click', () => {
    state.settings.ambient = !state.settings.ambient;
    audio.enabled = state.settings.ambient;
    audio.set(state.settings.ambient ? (node?.ambient || ambientForBg(node?.bg)) : '');
    updateModeButtons();
  });

  const settingHandlers = {
    '#text-speed': v => state.settings.speed = Number(v),
    '#auto-delay': v => state.settings.autoDelay = Number(v),
    '#font-size': v => state.settings.fontSize = Number(v),
    '#line-height': v => state.settings.lineHeight = Number(v),
    '#panel-opacity': v => state.settings.panelOpacity = Number(v),
    '#ambient-volume': v => state.settings.ambientVolume = Number(v),
    '#sfx-volume': v => state.settings.sfxVolume = Number(v)
  };
  Object.entries(settingHandlers).forEach(([selector, handler]) => $(selector).addEventListener('input', e => { handler(e.target.value); applySettings(); }));
  $('#reduce-motion').addEventListener('change', e => { state.settings.reduceMotion = e.target.checked; applySettings(); });
  $('#ambient-enabled').addEventListener('change', e => { state.settings.ambient = e.target.checked; applySettings(); audio?.set(e.target.checked ? (node?.ambient || ambientForBg(node?.bg)) : ''); });
  $('#high-contrast').addEventListener('change', e => { state.settings.highContrast = e.target.checked; applySettings(); });
  $('#skip-read-only').addEventListener('change', e => { state.settings.skipReadOnly = e.target.checked; applySettings(); });
  $('#assist-mode').addEventListener('change', e => { state.settings.assistMode = e.target.value; applySettings(); if (invState) configureInvestigationHint(); });
  $('#export-playtest').addEventListener('click', exportPlaytest);
  $('#reset-playtest').addEventListener('click', resetPlaytestMetrics);
  $('#notebook-search').addEventListener('input', renderNotebook);
  $('#notebook-filter').addEventListener('change', renderNotebook);
  $('#log-search').addEventListener('input', renderLog);

  document.addEventListener('keydown', e => {
    const open = document.querySelector('dialog[open]');
    if (open) { if (e.key === 'Escape') open.close(); return; }
    if (e.key === 'Escape') { if (!els.game.classList.contains('hidden')) { updateMenuStatus(); $('#menu-dialog').showModal(); } return; }
    if (e.key.toLowerCase() === 'n') { openDialog('notebook'); return; }
    if (e.key.toLowerCase() === 'l') { openDialog('log'); return; }
    if (e.key.toLowerCase() === 'a' && !els.game.classList.contains('hidden')) { toggleAuto(); return; }
    if (e.key.toLowerCase() === 's' && !els.game.classList.contains('hidden')) { toggleSkip(); return; }
    if (e.key.toLowerCase() === 'h' && !els.game.classList.contains('hidden')) { toggleUi(); return; }
    if (e.key.toLowerCase() === 'g' && !els.game.classList.contains('hidden') && invState) { useInvestigationHint(); return; }
    if (/^[1-9]$/.test(e.key) && !els.choices.classList.contains('hidden')) {
      const choice = els.choices.querySelectorAll('button')[Number(e.key) - 1];
      if (choice) { e.preventDefault(); choice.click(); }
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && !els.game.classList.contains('hidden')) { e.preventDefault(); advance(); }
  });

  window.addEventListener('beforeunload', () => { if (!els.game.classList.contains('hidden')) saveGame(false, SAVE_KEYS.auto); });

  window.FB_DEBUG = {
    getState: () => JSON.parse(JSON.stringify(state)),
    getNode: () => node ? {id:node.id, type:node.type, bg:node.bg} : null,
    goto: (id, showCards = false) => renderNode(id, false, !showCards),
    completeText: () => completeTyping(),
    evidence: () => [...state.evidence],
    toggleAuto: value => toggleAuto(value),
    toggleSkip: value => toggleSkip(value),
    saveKeys: () => ({...SAVE_KEYS}),
    renderSaveSlots,
    renderPlaytest,
    useInvestigationHint,
    currentPlaytestData,
    clearAllSaves
  };

  audio = new AudioSystem();
  migrateLegacySaves();
  const initial = latestSave();
  state = normalizeState(initial || defaultState());
  applySettings();
  renderNotebook();
  renderLog();
  renderSaveSlots();
  updateContinueState();
})();
