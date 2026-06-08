const BLANK = "□";
const APP_VERSION = "V1.0.1";
const LEGACY_BLANK = "_";
const TAPE_SYMBOL_CYCLE = [BLANK, "0", "1", "#", "X"];
const DRAG_THRESHOLD_PX = 6;
const HEAD_WRITE_PULSE_MS = 280;
const CELL_WRITE_MORPH_MS = 280;
const MOVE_AFTER_WRITE_DELAY_MS = HEAD_WRITE_PULSE_MS;
const TAPE_ROW_PAD_X = 4;
const TAPE_ROW_PAD_Y = 3;
const CELL_SIZE_MIN = 28;
const CELL_SIZE_MAX = 280;
const WORKSPACE_STORAGE_KEY = "chewring.workspace.v1";
const VISITED_STORAGE_KEY = "chewring.visited.v1";
const SUBSCRIPT_DIGITS = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉"
};
const appState = {
  rows: 1,
  cellSize: 46,
  minCol: -20,
  maxCol: 20,
  tape: new Map(),
  startTape: new Map(),
  head: { row: 0, col: 0 },
  startHead: { row: 0, col: 0 },
  startState: "s0",
  currentState: "s0",
  acceptStates: ["sa"],
  rejectStates: ["sr"],
  states: ["s0", "sa", "sr"],
  steps: 0,
  running: false,
  runTimer: null,
  tapeViewCol: 0,
  tapeViewRow: 0,
  tapeDrag: null,
  tapeSnapRaf: null,
  tapeMoveDelayTimer: null,
  headWritePulseUntil: 0,
  headPulseAnchor: null,
  headPulseRaf: null,
  writeMorph: null,
  lastPlacedSymbol: "0",
  haltedStatePulse: false,
  workspaceSaveEnabled: false,
  activeRuleId: null,
  stateModal: { open: false, originalName: null },
  modalOpenedAt: 0,
  diagramModalOpen: false,
  message: "Ready.",
  rules: [
    { id: crypto.randomUUID(), current: "s0", read: "1", write: "1", move: "R", next: "s0" },
    { id: crypto.randomUUID(), current: "s0", read: BLANK, write: BLANK, move: "S", next: "sa" }
  ]
};

const els = {
  tapeViewport: document.getElementById("tapeViewport"),
  cellSizeSlider: document.getElementById("cellSizeSlider"),
  btnAddRow: document.getElementById("btnAddRow"),
  btnRemoveRow: document.getElementById("btnRemoveRow"),
  btnResetTape: document.getElementById("btnResetTape"),
  btnResetMachine: document.getElementById("btnResetMachine"),
  btnStep: document.getElementById("btnStep"),
  btnRun: document.getElementById("btnRun"),
  btnPause: document.getElementById("btnPause"),
  statusState: document.getElementById("statusState"),
  statusStep: document.getElementById("statusStep"),
  statusMessage: document.getElementById("statusMessage"),
  rulesTableWrap: document.querySelector(".rules-table-wrap"),
  rulesTableBody: document.querySelector("#rulesTable tbody"),
  btnAddRule: document.getElementById("btnAddRule"),
  stateStartBadge: document.getElementById("stateStartBadge"),
  stateAcceptBadge: document.getElementById("stateAcceptBadge"),
  stateRejectBadge: document.getElementById("stateRejectBadge"),
  diagram: document.getElementById("diagram"),
  diagramExpanded: document.getElementById("diagramExpanded"),
  btnClearStates: document.getElementById("btnClearStates"),
  btnAddState: document.getElementById("btnAddState"),
  btnExpandDiagram: document.getElementById("btnExpandDiagram"),
  diagramModal: document.getElementById("diagramModal"),
  btnClearStatesExpanded: document.getElementById("btnClearStatesExpanded"),
  btnAddStateExpanded: document.getElementById("btnAddStateExpanded"),
  btnDiagramModalClose: document.getElementById("btnDiagramModalClose"),
  stateModal: document.getElementById("stateModal"),
  stateNameInput: document.getElementById("stateNameInput"),
  stateModalFeedback: document.getElementById("stateModalFeedback"),
  stateIsStart: document.getElementById("stateIsStart"),
  stateIsAccept: document.getElementById("stateIsAccept"),
  stateIsReject: document.getElementById("stateIsReject"),
  btnStateModalCloseX: document.getElementById("btnStateModalCloseX"),
  btnStateModalDelete: document.getElementById("btnStateModalDelete"),
  btnStateModalCancel: document.getElementById("btnStateModalCancel"),
  btnStateModalSave: document.getElementById("btnStateModalSave"),
  btnHamburger: document.getElementById("btnHamburger"),
  btnMenuClose: document.getElementById("btnMenuClose"),
  appMenu: document.getElementById("appMenu"),
  menuExamplesToggle: document.getElementById("menuExamplesToggle"),
  menuExamplesList: document.getElementById("menuExamplesList"),
  btnFooterHelp: document.getElementById("btnFooterHelp"),
  menuHelp: document.getElementById("menuHelp"),
  menuAbout: document.getElementById("menuAbout"),
  aboutVersion: document.getElementById("aboutVersion"),
  helpModal: document.getElementById("helpModal"),
  btnHelpCloseX: document.getElementById("btnHelpCloseX"),
  aboutModal: document.getElementById("aboutModal"),
  btnAboutCloseX: document.getElementById("btnAboutCloseX"),
  deleteAllConfirmModal: document.getElementById("deleteAllConfirmModal"),
  deleteAllConfirmMessage: document.getElementById("deleteAllConfirmMessage"),
  btnDeleteAllConfirmCancel: document.getElementById("btnDeleteAllConfirmCancel"),
  btnDeleteAllConfirmConfirm: document.getElementById("btnDeleteAllConfirmConfirm"),
  workspaceFoundModal: document.getElementById("workspaceFoundModal"),
  workspaceFoundMessage: document.getElementById("workspaceFoundMessage"),
  btnWorkspaceLoadSaved: document.getElementById("btnWorkspaceLoadSaved"),
  btnWorkspaceStartFresh: document.getElementById("btnWorkspaceStartFresh")
};

const DEFAULT_PROGRAMS = {
  "scan-right": {
    rows: 1,
    startState: "s0",
    acceptStates: ["sa"],
    rejectStates: ["sr"],
    head: { row: 0, col: 0 },
    tapeRows: ["101101"],
    rules: [
      { id: crypto.randomUUID(), current: "s0", read: "0", write: "0", move: "R", next: "s0" },
      { id: crypto.randomUUID(), current: "s0", read: "1", write: "1", move: "R", next: "s0" },
      { id: crypto.randomUUID(), current: "s0", read: BLANK, write: BLANK, move: "S", next: "sa" }
    ]
  },
  "unary-increment": {
    rows: 1,
    startState: "s0",
    acceptStates: ["sa"],
    rejectStates: ["sr"],
    head: { row: 0, col: 0 },
    tapeRows: ["1111"],
    rules: [
      { id: crypto.randomUUID(), current: "s0", read: "1", write: "1", move: "R", next: "s0" },
      { id: crypto.randomUUID(), current: "s0", read: BLANK, write: "1", move: "S", next: "sa" }
    ]
  },
  "parity-even-ones": {
    rows: 1,
    startState: "qe",
    acceptStates: ["sa"],
    rejectStates: ["sr"],
    head: { row: 0, col: 0 },
    tapeRows: ["1010"],
    rules: [
      { id: crypto.randomUUID(), current: "qe", read: "0", write: "0", move: "R", next: "qe" },
      { id: crypto.randomUUID(), current: "qe", read: "1", write: "1", move: "R", next: "qo" },
      { id: crypto.randomUUID(), current: "qe", read: "#", write: "#", move: "S", next: "sr" },
      { id: crypto.randomUUID(), current: "qe", read: "X", write: "X", move: "S", next: "sr" },
      { id: crypto.randomUUID(), current: "qe", read: BLANK, write: BLANK, move: "S", next: "sa" },
      { id: crypto.randomUUID(), current: "qo", read: "0", write: "0", move: "R", next: "qo" },
      { id: crypto.randomUUID(), current: "qo", read: "1", write: "1", move: "R", next: "qe" },
      { id: crypto.randomUUID(), current: "qo", read: "#", write: "#", move: "S", next: "sr" },
      { id: crypto.randomUUID(), current: "qo", read: "X", write: "X", move: "S", next: "sr" },
      { id: crypto.randomUUID(), current: "qo", read: BLANK, write: BLANK, move: "S", next: "sr" }
    ]
  },
  "binary-invert": {
    rows: 1,
    startState: "s0",
    acceptStates: ["sa"],
    rejectStates: ["sr"],
    head: { row: 0, col: 0 },
    tapeRows: ["101001"],
    rules: [
      { id: crypto.randomUUID(), current: "s0", read: "0", write: "1", move: "R", next: "s0" },
      { id: crypto.randomUUID(), current: "s0", read: "1", write: "0", move: "R", next: "s0" },
      { id: crypto.randomUUID(), current: "s0", read: "#", write: "#", move: "S", next: "sr" },
      { id: crypto.randomUUID(), current: "s0", read: "X", write: "X", move: "S", next: "sr" },
      { id: crypto.randomUUID(), current: "s0", read: BLANK, write: BLANK, move: "S", next: "sa" }
    ]
  },
  "two-row-copy": {
    rows: 2,
    startState: "s0",
    acceptStates: ["sa"],
    rejectStates: ["sr"],
    head: { row: 0, col: 0 },
    tapeRows: ["10110", ""],
    rules: [
      { id: crypto.randomUUID(), current: "s0", read: "0", write: "0", move: "D", next: "sd0" },
      { id: crypto.randomUUID(), current: "s0", read: "1", write: "1", move: "D", next: "sd1" },
      { id: crypto.randomUUID(), current: "s0", read: BLANK, write: BLANK, move: "S", next: "sa" },
      { id: crypto.randomUUID(), current: "sd0", read: BLANK, write: "0", move: "U", next: "su" },
      { id: crypto.randomUUID(), current: "sd1", read: BLANK, write: "1", move: "U", next: "su" },
      { id: crypto.randomUUID(), current: "su", read: "0", write: "0", move: "R", next: "s0" },
      { id: crypto.randomUUID(), current: "su", read: "1", write: "1", move: "R", next: "s0" }
    ]
  },
  "ones-complement": {
    rows: 2,
    startState: "go_r",
    acceptStates: ["sa"],
    rejectStates: [],
    head: { row: 0, col: 0 },
    tapeRows: ["10110", ""],
    rules: [
      // Phase 1: scan right to find the end of the binary number on row 1
      { id: crypto.randomUUID(), current: "go_r", read: "0", write: "0", move: "R", next: "go_r" },
      { id: crypto.randomUUID(), current: "go_r", read: "1", write: "1", move: "R", next: "go_r" },
      { id: crypto.randomUUID(), current: "go_r", read: BLANK, write: BLANK, move: "L", next: "back" },
      // Phase 2: scan left, copy each bit inverted onto row 2
      { id: crypto.randomUUID(), current: "back", read: "0", write: "0", move: "D", next: "d0" },
      { id: crypto.randomUUID(), current: "back", read: "1", write: "1", move: "D", next: "d1" },
      { id: crypto.randomUUID(), current: "back", read: BLANK, write: BLANK, move: "S", next: "sa" },
      { id: crypto.randomUUID(), current: "d0",   read: BLANK, write: "1", move: "U", next: "ul" },
      { id: crypto.randomUUID(), current: "d1",   read: BLANK, write: "0", move: "U", next: "ul" },
      { id: crypto.randomUUID(), current: "ul",   read: "0",   write: "0", move: "L", next: "back" },
      { id: crypto.randomUUID(), current: "ul",   read: "1",   write: "1", move: "L", next: "back" }
    ]
  }
};

function tapeKey(row, col) {
  return `${row}:${col}`;
}

function normalizeSymbol(symbol) {
  const clean = (symbol || "").trim();
  if (!clean) {
    return "";
  }
  if (clean === BLANK || clean === LEGACY_BLANK) {
    return BLANK;
  }
  return clean;
}

function symbolForDisplay(symbol) {
  const clean = normalizeSymbol(symbol);
  return clean || BLANK;
}

function symbolForTape(symbol) {
  const display = symbolForDisplay(symbol);
  return display === BLANK ? "" : display;
}

function getSymbol(row, col) {
  const value = appState.tape.get(tapeKey(row, col));
  return value ?? BLANK;
}

function setSymbol(row, col, symbol) {
  const normalized = normalizeSymbol(symbol);
  if (normalized === BLANK) {
    appState.tape.delete(tapeKey(row, col));
    return;
  }
  appState.tape.set(tapeKey(row, col), normalized);
}

function serialiseWorkspace() {
  return {
    version: 1,
    rows: appState.rows,
    cellSize: appState.cellSize,
    tape: Array.from(appState.tape.entries()),
    startTape: Array.from(appState.startTape.entries()),
    head: { ...appState.head },
    startHead: { ...appState.startHead },
    startState: appState.startState,
    currentState: appState.currentState,
    acceptStates: [...appState.acceptStates],
    rejectStates: [...appState.rejectStates],
    states: [...appState.states],
    steps: appState.steps,
    lastPlacedSymbol: appState.lastPlacedSymbol,
    rules: appState.rules.map((rule) => ({
      current: rule.current,
      read: rule.read,
      write: rule.write,
      move: rule.move,
      next: rule.next
    }))
  };
}

function readSavedWorkspace() {
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function hasMeaningfulSavedWorkspace(snapshot) {
  if (!snapshot || snapshot.version !== 1) {
    return false;
  }

  const hasTape = Array.isArray(snapshot.tape) && snapshot.tape.length > 0;
  const hasStartTape = Array.isArray(snapshot.startTape) && snapshot.startTape.length > 0;
  const hasRules = Array.isArray(snapshot.rules) && snapshot.rules.length > 0;
  const hasStates = Array.isArray(snapshot.states) && snapshot.states.length > 0;
  const hasStartState = typeof snapshot.startState === "string" && snapshot.startState.trim().length > 0;

  return hasTape || hasStartTape || hasRules || hasStates || hasStartState;
}

function hasVisitedBefore() {
  try {
    return localStorage.getItem(VISITED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markVisited() {
  try {
    localStorage.setItem(VISITED_STORAGE_KEY, "1");
  } catch {
    // Ignore storage failures.
  }
}

function persistWorkspace() {
  if (!appState.workspaceSaveEnabled) {
    return;
  }
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(serialiseWorkspace()));
  } catch {
    // Ignore storage failures so app functionality is unaffected.
  }
}

function parseSavedTape(entries) {
  const result = new Map();
  if (!Array.isArray(entries)) {
    return result;
  }
  for (const entry of entries) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      continue;
    }
    const key = String(entry[0]);
    const symbol = normalizeSymbol(String(entry[1]));
    if (!symbol || symbol === BLANK) {
      continue;
    }
    result.set(key, symbol);
  }
  return result;
}

function applySavedWorkspace(snapshot) {
  if (!snapshot) {
    return false;
  }

  stopRunLoop();
  stopTapeSnap();
  stopHeadPulse();
  clearTapeMoveDelay();
  clearHaltedStatePulse();

  appState.rows = Math.max(1, Number(snapshot.rows) || 1);
  appState.cellSize = Math.max(CELL_SIZE_MIN, Math.min(CELL_SIZE_MAX, Number(snapshot.cellSize) || 46));
  appState.tape = parseSavedTape(snapshot.tape);
  appState.startTape = parseSavedTape(snapshot.startTape);
  if (appState.startTape.size === 0) {
    appState.startTape = new Map(appState.tape);
  }

  const headRow = Math.max(0, Math.min(appState.rows - 1, Number(snapshot.head?.row) || 0));
  const startHeadRow = Math.max(0, Math.min(appState.rows - 1, Number(snapshot.startHead?.row) || 0));
  appState.head = { row: headRow, col: Number(snapshot.head?.col) || 0 };
  appState.startHead = { row: startHeadRow, col: Number(snapshot.startHead?.col) || 0 };

  appState.startState = formatStateName(snapshot.startState || "");
  appState.currentState = formatStateName(appState.startState || "");
  appState.acceptStates = uniqueStateList((snapshot.acceptStates || []).map((state) => formatStateName(state)));
  appState.rejectStates = uniqueStateList((snapshot.rejectStates || []).map((state) => formatStateName(state))).filter(
    (state) => !appState.acceptStates.includes(state)
  );
  appState.states = uniqueStateList((snapshot.states || []).map((state) => formatStateName(state)));
  appState.steps = 0;
  appState.lastPlacedSymbol = normalizeSymbol(snapshot.lastPlacedSymbol || "0") || "0";
  appState.activeRuleId = null;
  appState.message = "Loaded previous local work.";

  const rules = Array.isArray(snapshot.rules) ? snapshot.rules : [];
  appState.rules = rules.map((rule) => ({
    id: crypto.randomUUID(),
    current: formatStateName(rule.current || ""),
    read: normalizeSymbol(rule.read) || BLANK,
    write: normalizeSymbol(rule.write) || BLANK,
    move: (rule.move || "S").trim(),
    next: formatStateName(rule.next || "")
  }));

  if (!appState.startState) {
    const fallback = getAvailableStates()[0] || "";
    appState.startState = fallback;
    if (!appState.currentState) {
      appState.currentState = fallback;
    }
  }

  appState.head = { ...appState.startHead };

  applyCellSize();
  syncTapeViewToHead();
  syncStateRegistry();
  syncMachineConfigInputs();
  renderAll();
  return true;
}

function startFreshWorkspace() {
  stopRunLoop();
  stopTapeSnap();
  stopHeadPulse();
  clearTapeMoveDelay();
  clearHaltedStatePulse();
  appState.rows = 1;
  appState.cellSize = 46;
  appState.tape.clear();
  appState.startTape = new Map();
  appState.head = { row: 0, col: 0 };
  appState.startHead = { row: 0, col: 0 };
  appState.startState = "";
  appState.currentState = "";
  appState.acceptStates = [];
  appState.rejectStates = [];
  appState.states = [];
  appState.steps = 0;
  appState.activeRuleId = null;
  appState.rules = [];
  appState.message = "Started fresh workspace.";
  applyCellSize();
  syncTapeViewToHead();
  renderAll();
}

function closeWorkspaceFoundModal() {
  if (appState.workspaceFoundOverlay) {
    const content = appState.workspaceFoundOverlay.firstElementChild;
    if (content && els.workspaceFoundModal) {
      els.workspaceFoundModal.appendChild(content);
    }
    appState.workspaceFoundOverlay.remove();
    appState.workspaceFoundOverlay = null;
  }
}

function openWorkspaceFoundModal() {
  if (!els.workspaceFoundModal) {
    return;
  }
  appState.modalOpenedAt = performance.now();
  if (els.workspaceFoundMessage) {
    els.workspaceFoundMessage.textContent = "Saved local work was found from a previous session.";
  }
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;";
  const content = els.workspaceFoundModal.firstElementChild;
  if (content) {
    overlay.appendChild(content);
  }
  document.body.appendChild(overlay);
  appState.workspaceFoundOverlay = overlay;
}

function startupWithSavedWorkspaceDecision() {
  const saved = readSavedWorkspace();
  if (!saved || !hasMeaningfulSavedWorkspace(saved)) {
    if (hasVisitedBefore()) {
      startFreshWorkspace();
    } else {
      loadPreset("parity-even-ones");
    }
    appState.workspaceSaveEnabled = true;
    markVisited();
    persistWorkspace();
    return;
  }

  markVisited();
  startFreshWorkspace();
  appState.pendingSavedWorkspace = saved;
  openWorkspaceFoundModal();
  renderAll();
}

function loadSavedWorkspaceChoice() {
  const saved = appState.pendingSavedWorkspace;
  appState.pendingSavedWorkspace = null;
  closeWorkspaceFoundModal();
  if (!applySavedWorkspace(saved)) {
    startFreshWorkspace();
  }
  appState.workspaceSaveEnabled = true;
  markVisited();
  persistWorkspace();
}

function startFreshWorkspaceChoice() {
  appState.pendingSavedWorkspace = null;
  closeWorkspaceFoundModal();
  startFreshWorkspace();
  appState.workspaceSaveEnabled = true;
  markVisited();
  persistWorkspace();
}

function clearHaltedStatePulse() {
  appState.haltedStatePulse = false;
}

function maxCellSizeForViewportHeight() {
  const viewport = els.tapeViewport;
  if (!viewport) {
    return CELL_SIZE_MAX;
  }

  const viewportStyles = getComputedStyle(viewport);
  const padTop = Number.parseFloat(viewportStyles.paddingTop) || 0;
  const padBottom = Number.parseFloat(viewportStyles.paddingBottom) || 0;
  const contentHeight = Math.max(1, viewport.clientHeight - padTop - padBottom);
  const rows = Math.max(1, appState.rows);
  const maxByHeight = Math.floor(contentHeight / rows - TAPE_ROW_PAD_Y * 2);
  return Math.max(CELL_SIZE_MIN, Math.min(CELL_SIZE_MAX, maxByHeight));
}

function maxRowsForViewportAtMinCellSize() {
  const viewport = els.tapeViewport;
  if (!viewport) {
    return 1;
  }

  const viewportStyles = getComputedStyle(viewport);
  const padTop = Number.parseFloat(viewportStyles.paddingTop) || 0;
  const padBottom = Number.parseFloat(viewportStyles.paddingBottom) || 0;
  const contentHeight = Math.max(1, viewport.clientHeight - padTop - padBottom);
  const rowPitchAtMin = CELL_SIZE_MIN + TAPE_ROW_PAD_Y * 2;
  return Math.max(1, Math.floor(contentHeight / rowPitchAtMin));
}

function isMobileViewport() {
  const touchLandscapePhone = window.matchMedia(
    "(orientation: landscape) and (hover: none) and (pointer: coarse) and (max-width: 1024px)"
  ).matches;
  return window.innerWidth <= 768 || window.innerHeight <= 500 || touchLandscapePhone;
}

function canAddAnotherRow() {
  if (isMobileViewport()) return true;
  return appState.rows < maxRowsForViewportAtMinCellSize();
}

function getZoomScaledStrokeWidth() {
  return Math.max(3, Math.min(8, Math.round(appState.cellSize * 0.09)));
}

function applyCellSize() {
  let size;
  if (isMobileViewport()) {
    size = Math.max(CELL_SIZE_MIN, Math.min(CELL_SIZE_MAX, appState.cellSize));
  } else {
    const maxAllowed = maxCellSizeForViewportHeight();
    size = Math.max(CELL_SIZE_MIN, Math.min(maxAllowed, appState.cellSize));
    els.cellSizeSlider.max = String(maxAllowed);
    els.cellSizeSlider.value = String(size);
  }
  appState.cellSize = size;
  const strokeWidth = getZoomScaledStrokeWidth();
  document.documentElement.style.setProperty("--tape-cell-size", `${size}px`);
  document.documentElement.style.setProperty("--tape-rows", String(appState.rows));
  document.documentElement.style.setProperty("--tape-head-stroke", `${strokeWidth}px`);
  document.documentElement.style.setProperty("--tape-hover-stroke", `${strokeWidth}px`);
}

function changeCellSizeBy(delta) {
  appState.cellSize += delta;
  applyCellSize();
  renderTape();
}

function autoFitCellSize() {
  const viewport = els.tapeViewport;
  if (!viewport) {
    return;
  }

  if (isMobileViewport()) {
    // On mobile the panel grows to fit rows, so size purely from width.
    const width = viewport.clientWidth || 320;
    const targetCols = 10;
    const horizontalGap = 4;
    const sizeFromWidth = Math.floor((width - targetCols * horizontalGap) / targetCols);
    appState.cellSize = Math.max(CELL_SIZE_MIN, Math.min(CELL_SIZE_MAX, sizeFromWidth));
    applyCellSize();
    return;
  }

  const width = viewport.clientWidth || 1000;
  const height = viewport.clientHeight || 260;

  const horizontalGap = 4;
  const verticalGap = TAPE_ROW_PAD_Y * 2;
  const minCols = 5;

  // Size cells so they fill ~50% of available vertical space.
  const sizeFromHeight = Math.floor(
    (height * 0.5 - (appState.rows - 1) * verticalGap) / Math.max(1, appState.rows)
  );
  // Cap: never so large that fewer than minCols fit across.
  const maxSizeFromWidth = Math.floor((width - minCols * horizontalGap) / minCols);

  appState.cellSize = Math.max(CELL_SIZE_MIN, Math.min(CELL_SIZE_MAX, Math.min(sizeFromHeight, maxSizeFromWidth)));
  applyCellSize();
}

function parseCsvStates(text) {
  return text
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function loadTapeRows(rowStrings) {
  appState.tape.clear();
  for (let r = 0; r < rowStrings.length; r += 1) {
    const row = rowStrings[r] || "";
    for (let c = 0; c < row.length; c += 1) {
      const symbol = normalizeSymbol(row[c]);
      if (symbol !== BLANK) {
        setSymbol(r, c, symbol);
      }
    }
  }
}

function snapshotStartTape() {
  appState.startTape = new Map(appState.tape);
}

function restoreStartTape() {
  appState.tape = new Map(appState.startTape);
}

function cloneRules(rules) {
  return rules.map((rule) => ({ ...rule, id: crypto.randomUUID() }));
}

function formatStateName(rawName) {
  const trimmed = (rawName || "").trim();
  if (!trimmed) {
    return "";
  }

  const letterAndDigits = trimmed.match(/^([a-zA-Z])(\d+)$/);
  if (letterAndDigits) {
    const letter = letterAndDigits[1].toUpperCase();
    const digits = letterAndDigits[2]
      .split("")
      .map((digit) => SUBSCRIPT_DIGITS[digit] || digit)
      .join("");
    return `${letter}${digits}`;
  }

  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function normalizeRuleStateNames(rules) {
  return rules.map((rule) => ({
    ...rule,
    current: formatStateName(rule.current),
    next: formatStateName(rule.next)
  }));
}

function uniqueStateList(names) {
  const seen = new Set();
  const ordered = [];
  for (const raw of names) {
    const name = (raw || "").trim();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    ordered.push(name);
  }
  return ordered;
}

function getAvailableStates() {
  return uniqueStateList([
    ...appState.states,
    appState.startState,
    ...appState.acceptStates,
    ...appState.rejectStates,
    ...appState.rules.flatMap((rule) => [rule.current, rule.next])
  ]);
}

function syncStateRegistry() {
  appState.states = getAvailableStates();
}

function syncMachineConfigInputs() {
  const startLabel = appState.startState || "(none)";
  const acceptLabel = appState.acceptStates.length ? appState.acceptStates.join(", ") : "(none)";
  const rejectLabel = appState.rejectStates.length ? appState.rejectStates.join(", ") : "(none)";
  els.stateStartBadge.textContent = `Start: ${startLabel}`;
  els.stateAcceptBadge.textContent = `Accept: ${acceptLabel}`;
  els.stateRejectBadge.textContent = `Reject: ${rejectLabel}`;
}

function setStateRoleMembership(stateName, enabled, listName) {
  const set = new Set(appState[listName]);
  if (enabled) {
    set.add(stateName);
  } else {
    set.delete(stateName);
  }
  appState[listName] = Array.from(set);
}

function renameStateReferences(fromName, toName) {
  appState.states = appState.states.map((state) => (state === fromName ? toName : state));
  appState.rules = appState.rules.map((rule) => ({
    ...rule,
    current: rule.current === fromName ? toName : rule.current,
    next: rule.next === fromName ? toName : rule.next
  }));
  appState.acceptStates = appState.acceptStates.map((state) => (state === fromName ? toName : state));
  appState.rejectStates = appState.rejectStates.map((state) => (state === fromName ? toName : state));
  if (appState.startState === fromName) {
    appState.startState = toName;
  }
  if (appState.currentState === fromName) {
    appState.currentState = toName;
  }
}

function setStateModalFeedback(message = "") {
  if (!els.stateModalFeedback) {
    return;
  }
  els.stateModalFeedback.textContent = message;
  els.stateModalFeedback.hidden = !message;
}

function openStateModal(existingStateName = "") {
  clearHaltedStatePulse();
  appState.stateModal.open = true;
  appState.stateModal.originalName = existingStateName || null;
  setStateModalFeedback("");

  els.stateNameInput.value = existingStateName;
  els.stateIsStart.checked = Boolean(existingStateName && appState.startState === existingStateName);
  els.stateIsAccept.checked = Boolean(existingStateName && appState.acceptStates.includes(existingStateName));
  els.stateIsReject.checked = Boolean(existingStateName && appState.rejectStates.includes(existingStateName));
  els.btnStateModalDelete.hidden = !existingStateName;

  appState.modalOpenedAt = performance.now();

  // Create a fresh overlay element - works around iOS 26 Safari bug where
  // pre-existing elements ignore inline style changes.
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;";
  const content = els.stateModal.firstElementChild;
  if (content) overlay.appendChild(content);
  overlay.addEventListener("click", (event) => {
    if (performance.now() - appState.modalOpenedAt < 350) return;
    if (event.target === overlay) closeStateModal();
  });
  document.body.appendChild(overlay);
  appState.stateModalOverlay = overlay;

  requestAnimationFrame(() => {
    if (!appState.stateModalOverlay) return;
    els.stateNameInput.focus({ preventScroll: true });
  });
}

function closeStateModal() {
  appState.stateModal.open = false;
  appState.stateModal.originalName = null;
  setStateModalFeedback("");
  els.btnStateModalDelete.hidden = true;
  if (appState.stateModalOverlay) {
    const content = appState.stateModalOverlay.firstElementChild;
    if (content) els.stateModal.appendChild(content);
    appState.stateModalOverlay.remove();
    appState.stateModalOverlay = null;
  }
}


function deleteState(stateName) {
  clearHaltedStatePulse();
  const remainingStates = getAvailableStates().filter((state) => state !== stateName);

  stopRunLoop();
  appState.rules = appState.rules.filter((rule) => rule.current !== stateName && rule.next !== stateName);
  appState.states = appState.states.filter((state) => state !== stateName);
  appState.acceptStates = appState.acceptStates.filter((state) => state !== stateName);
  appState.rejectStates = appState.rejectStates.filter((state) => state !== stateName);

  const fallbackState = remainingStates[0] || "";
  if (appState.startState === stateName) {
    appState.startState = fallbackState;
  }
  if (appState.currentState === stateName) {
    appState.currentState = appState.startState || fallbackState || "";
  }

  appState.activeRuleId = null;
  syncStateRegistry();
  syncMachineConfigInputs();
  appState.message = `Deleted state '${stateName}' and removed referenced rules.`;
  closeStateModal();
  renderAll();
}

function openDeleteAllConfirmModal(messageText) {
  appState.modalOpenedAt = performance.now();
  if (els.deleteAllConfirmMessage) {
    els.deleteAllConfirmMessage.textContent = messageText;
  }
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;";
  const content = els.deleteAllConfirmModal?.firstElementChild;
  if (content) {
    overlay.appendChild(content);
  }
  overlay.addEventListener("click", (event) => {
    if (performance.now() - appState.modalOpenedAt < 350) return;
    if (event.target === overlay) closeDeleteAllConfirmModal();
  });
  document.body.appendChild(overlay);
  appState.deleteAllConfirmOverlay = overlay;
}

function closeDeleteAllConfirmModal() {
  if (appState.deleteAllConfirmOverlay) {
    const content = appState.deleteAllConfirmOverlay.firstElementChild;
    if (content && els.deleteAllConfirmModal) {
      els.deleteAllConfirmModal.appendChild(content);
    }
    appState.deleteAllConfirmOverlay.remove();
    appState.deleteAllConfirmOverlay = null;
  }
}

function performDeleteAllStates() {
  clearHaltedStatePulse();
  stopRunLoop();
  closeDeleteAllConfirmModal();
  closeStateModal();
  appState.rules = [];
  appState.states = [];
  appState.acceptStates = [];
  appState.rejectStates = [];
  appState.startState = "";
  appState.currentState = "";
  appState.activeRuleId = null;
  appState.message = "Deleted all states and associated transition rules.";
  renderAll();
}

function deleteAllStatesWithConfirm() {
  const stateCount = getAvailableStates().length;
  const ruleCount = appState.rules.length;
  if (stateCount === 0 && ruleCount === 0) {
    appState.message = "No states or transition rules to delete.";
    updateStatus();
    return;
  }

  const confirmText = `Delete all ${stateCount} state${stateCount === 1 ? "" : "s"} and ${ruleCount} transition rule${ruleCount === 1 ? "" : "s"}? This cannot be undone.`;
  openDeleteAllConfirmModal(confirmText);
}

function saveStateModal() {
  const originalName = appState.stateModal.originalName;
  const proposedName = formatStateName(els.stateNameInput.value || "");
  const isStart = els.stateIsStart.checked;
  const isAccept = els.stateIsAccept.checked;
  const isReject = els.stateIsReject.checked;

  if (!proposedName) {
    appState.message = "State name is required.";
    setStateModalFeedback(appState.message);
    updateStatus();
    return;
  }

  if (isAccept && isReject) {
    appState.message = "A state cannot be both accept and reject.";
    setStateModalFeedback(appState.message);
    updateStatus();
    return;
  }

  const availableStates = new Set(getAvailableStates());
  if (originalName !== proposedName && availableStates.has(proposedName)) {
    appState.message = `State '${proposedName}' already exists.`;
    setStateModalFeedback(appState.message);
    updateStatus();
    return;
  }

  if (originalName && originalName !== proposedName) {
    renameStateReferences(originalName, proposedName);
  }

  if (!originalName) {
    appState.states.push(proposedName);
  }

  if (isStart) {
    appState.startState = proposedName;
  }

  setStateRoleMembership(proposedName, isAccept, "acceptStates");
  setStateRoleMembership(proposedName, isReject, "rejectStates");

  syncStateRegistry();
  syncMachineConfigInputs();
  clearHaltedStatePulse();
  setStateModalFeedback("");
  appState.message = originalName
    ? `Updated state '${proposedName}'.`
    : `Added state '${proposedName}'.`;
  closeStateModal();
  renderAll();
}

function syncTapeViewToHead() {
  appState.tapeViewCol = appState.head.col;
  appState.tapeViewRow = appState.head.row;
}

function stopTapeSnap() {
  if (!appState.tapeSnapRaf) {
    return;
  }
  cancelAnimationFrame(appState.tapeSnapRaf);
  appState.tapeSnapRaf = null;
}

function clearTapeMoveDelay() {
  if (!appState.tapeMoveDelayTimer) {
    return;
  }
  clearTimeout(appState.tapeMoveDelayTimer);
  appState.tapeMoveDelayTimer = null;
}

function rgbPulseColour(progress) {
  const p = Math.max(0, Math.min(1, progress));
  if (p < 1 / 3) {
    return "#ff4d4d";
  }
  if (p < 2 / 3) {
    return "#3ad16a";
  }
  return "#4da3ff";
}

function stopHeadPulse() {
  if (appState.headPulseRaf) {
    cancelAnimationFrame(appState.headPulseRaf);
    appState.headPulseRaf = null;
  }
  appState.headWritePulseUntil = 0;
  appState.headPulseAnchor = null;
  appState.writeMorph = null;
}

function isVisualAnimationActive() {
  const now = performance.now();
  const pulseActive = now < appState.headWritePulseUntil;
  const morphActive = appState.writeMorph && now < appState.writeMorph.until;
  return pulseActive || morphActive;
}

function startHeadPulseLoop() {
  if (appState.headPulseRaf) {
    return;
  }
  const tick = () => {
    renderTape();
    if (isVisualAnimationActive()) {
      appState.headPulseRaf = requestAnimationFrame(tick);
      return;
    }
    appState.headPulseRaf = null;
    appState.headWritePulseUntil = 0;
    appState.headPulseAnchor = null;
    appState.writeMorph = null;
    renderTape();
  };
  appState.headPulseRaf = requestAnimationFrame(tick);
}

function triggerHeadWritePulse(row, col) {
  appState.headWritePulseUntil = performance.now() + HEAD_WRITE_PULSE_MS;
  appState.headPulseAnchor = { row, col };
  startHeadPulseLoop();
}

function triggerCellWriteMorph(row, col, fromSymbol, toSymbol) {
  appState.writeMorph = {
    row,
    col,
    fromSymbol: symbolForTape(fromSymbol),
    toSymbol: symbolForTape(toSymbol),
    startedAt: performance.now(),
    until: performance.now() + CELL_WRITE_MORPH_MS
  };
  startHeadPulseLoop();
}

function loadPreset(key) {
  const preset = DEFAULT_PROGRAMS[key];
  if (!preset) {
    appState.message = "Preset not found.";
    renderAll();
    return;
  }

  stopRunLoop();
  clearHaltedStatePulse();
  appState.rows = preset.rows;
  appState.startState = formatStateName(preset.startState);
  appState.currentState = appState.startState;
  appState.acceptStates = preset.acceptStates.map((state) => formatStateName(state));
  appState.rejectStates = preset.rejectStates.map((state) => formatStateName(state));
  appState.head = { ...preset.head };
  appState.startHead = { ...preset.head };
  syncTapeViewToHead();
  appState.steps = 0;
  appState.activeRuleId = null;
  appState.rules = normalizeRuleStateNames(cloneRules(preset.rules));
  appState.states = uniqueStateList([
    appState.startState,
    ...appState.acceptStates,
    ...appState.rejectStates,
    ...appState.rules.flatMap((rule) => [rule.current, rule.next])
  ]);

  loadTapeRows(preset.tapeRows);
  snapshotStartTape();

  syncMachineConfigInputs();

  const labels = { "scan-right": "Scan Right Until Blank", "unary-increment": "Unary Increment", "parity-even-ones": "Parity Check (Even 1s)", "binary-invert": "Binary Invert", "two-row-copy": "Two-Row Copy Demo", "ones-complement": "Ones' Complement (Bit Flip)" };
  appState.message = `Loaded: ${labels[key] || key}.`;
  autoFitCellSize();
  renderAll();
}

function loadSelectedProgram() {
  loadPreset(Object.keys(DEFAULT_PROGRAMS)[0]);
}

function updateMachineConfigFromInputs() {
  appState.startState = formatStateName(appState.startState);
  appState.currentState = formatStateName(appState.currentState);
  appState.states = appState.states.map((state) => formatStateName(state));
  appState.rules = normalizeRuleStateNames(appState.rules);
  appState.acceptStates = appState.acceptStates.map((state) => formatStateName(state));
  appState.rejectStates = appState.rejectStates.map((state) => formatStateName(state));
  appState.acceptStates = uniqueStateList(appState.acceptStates);
  appState.rejectStates = uniqueStateList(appState.rejectStates).filter((state) => !appState.acceptStates.includes(state));
  if (!appState.startState && appState.states.length > 0) {
    appState.startState = appState.states[0];
  }
  const availableStates = getAvailableStates();
  if (appState.currentState && !availableStates.includes(appState.currentState)) {
    appState.currentState = appState.startState || "";
  }
  if (!appState.currentState && appState.startState) {
    appState.currentState = appState.startState;
  }
  syncStateRegistry();
}

function movementOptions() {
  return appState.rows > 1 ? ["L", "R", "U", "D", "S"] : ["L", "R", "S"];
}

function normalizeRulesForRows() {
  const allowed = new Set(movementOptions());
  for (const rule of appState.rules) {
    if (!allowed.has(rule.move)) {
      rule.move = "S";
    }
  }
}

function renderTape() {
  const viewport = els.tapeViewport;
  if (!appState.tapeDrag && !appState.tapeSnapRaf) {
    appState.tapeViewRow = Math.max(0, Math.min(appState.rows - 1, Math.round(appState.tapeViewRow)));
  }
  const width = viewport.clientWidth || 1000;
  const cellPitch = appState.cellSize + 4;
  const rowPitch = appState.cellSize + TAPE_ROW_PAD_Y * 2;
  const cellsPerRow = Math.max(9, Math.floor(width / cellPitch));
  const half = Math.floor(cellsPerRow / 2);
  const centerCol = Number.isFinite(appState.tapeViewCol) ? appState.tapeViewCol : appState.head.col;
  const centerRow = Number.isFinite(appState.tapeViewRow) ? appState.tapeViewRow : appState.head.row;
  const anchorCol = Math.round(centerCol);
  const fromCol = anchorCol - half - 1;
  const toCol = anchorCol + half + 1;

  const viewportStyles = getComputedStyle(viewport);
  const padLeft = Number.parseFloat(viewportStyles.paddingLeft) || 0;
  const padRight = Number.parseFloat(viewportStyles.paddingRight) || 0;
  const contentWidth = Math.max(1, width - padLeft - padRight);
  const headCenterXContent = contentWidth / 2;
  const headCenterX = padLeft + headCenterXContent;
  const xOffset = headCenterXContent - (TAPE_ROW_PAD_X + (centerCol - fromCol) * cellPitch + appState.cellSize / 2);
  const yOffset = (appState.head.row - centerRow) * rowPitch;

  appState.minCol = Math.min(appState.minCol, fromCol - 5);
  appState.maxCol = Math.max(appState.maxCol, toCol + 5);

  const grid = document.createElement("div");
  grid.className = "tape-grid";
  grid.style.transform = `translateY(${yOffset}px)`;

  for (let r = 0; r < appState.rows; r += 1) {
    const rowEl = document.createElement("div");
    rowEl.className = "tape-row";
    rowEl.style.transform = `translateX(${xOffset}px)`;

    for (let c = fromCol; c <= toCol; c += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "tape-cell";
      const symbol = getSymbol(r, c);
      renderTapeCellContent(cell, r, c, symbolForTape(symbol));
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      rowEl.appendChild(cell);
    }

    grid.appendChild(rowEl);
  }

  const headIndicator = buildHeadIndicator(headCenterX, centerCol, centerRow);
  const targetGhost = buildTargetGhost(headCenterX, centerCol, centerRow, Number.parseFloat(headIndicator.style.top) || 0);
  if (targetGhost) {
    viewport.replaceChildren(grid, targetGhost, headIndicator);
    return;
  }
  viewport.replaceChildren(grid, headIndicator);
}

function renderTapeCellContent(cell, row, col, currentSymbol) {
  const morph = appState.writeMorph;
  if (!morph || morph.row !== row || morph.col !== col || morph.fromSymbol === morph.toSymbol) {
    cell.textContent = currentSymbol;
    return;
  }

  const now = performance.now();
  const span = Math.max(1, morph.until - morph.startedAt);
  const progress = Math.max(0, Math.min(1, (now - morph.startedAt) / span));
  const pulseColour = rgbPulseColour(progress);

  const stack = document.createElement("span");
  stack.className = "cell-symbol-stack";

  const oldSymbol = document.createElement("span");
  oldSymbol.className = "cell-symbol old";
  oldSymbol.textContent = morph.fromSymbol;
  oldSymbol.style.opacity = String(1 - progress);
  oldSymbol.style.color = pulseColour;
  oldSymbol.style.textShadow = `0 0 6px ${pulseColour}66`;

  const newSymbol = document.createElement("span");
  newSymbol.className = "cell-symbol new";
  newSymbol.textContent = morph.toSymbol;
  newSymbol.style.opacity = String(progress);
  newSymbol.style.color = pulseColour;
  newSymbol.style.textShadow = `0 0 8px ${pulseColour}99`;

  stack.appendChild(oldSymbol);
  stack.appendChild(newSymbol);
  cell.appendChild(stack);
}

function buildHeadIndicator(headCenterX, centerCol, centerRow) {
  const indicator = document.createElement("div");
  indicator.className = "tape-head-indicator";
  const headStroke = getZoomScaledStrokeWidth();
  const pulseRing = Math.max(2, Math.round(headStroke * 0.6));
  const pulseBlur = Math.max(14, Math.round(headStroke * 4));
  indicator.style.width = `${appState.cellSize}px`;
  indicator.style.height = `${appState.cellSize}px`;
  indicator.style.left = `${headCenterX - appState.cellSize / 2}px`;
  indicator.style.borderWidth = `${headStroke}px`;

  const rowPitch = appState.cellSize + TAPE_ROW_PAD_Y * 2;
  const viewportStyles = getComputedStyle(els.tapeViewport);
  const padTop = Number.parseFloat(viewportStyles.paddingTop) || 0;
  const padBottom = Number.parseFloat(viewportStyles.paddingBottom) || 0;
  const contentHeight = Math.max(1, els.tapeViewport.clientHeight - padTop - padBottom);
  const rowsHeight = appState.rows * rowPitch;
  const topStart = padTop + (contentHeight - rowsHeight) / 2;
  let indicatorRow = appState.head.row;

  const now = performance.now();
  const remaining = appState.headWritePulseUntil - now;
  if (remaining > 0) {
    if (appState.headPulseAnchor) {
      indicatorRow = appState.headPulseAnchor.row;
    }
    const progress = 1 - remaining / HEAD_WRITE_PULSE_MS;
    const pulseColour = rgbPulseColour(progress);
    indicator.style.borderColor = pulseColour;
    indicator.style.boxShadow = `0 0 0 ${pulseRing}px ${pulseColour}66, 0 0 ${pulseBlur}px ${pulseColour}88`;
  }
  indicator.style.top = `${topStart + indicatorRow * rowPitch + TAPE_ROW_PAD_Y}px`;

  // Keep diagnostics values for ghost rendering without recomputing layout terms.
  indicator.dataset.topStart = String(topStart);
  indicator.dataset.rowPitch = String(rowPitch);
  indicator.dataset.headCenterX = String(headCenterX);
  indicator.dataset.centerCol = String(centerCol);
  indicator.dataset.centerRow = String(centerRow);

  return indicator;
}

function buildTargetGhost(headCenterX, centerCol, centerRow, headTop) {
  const drag = appState.tapeDrag;
  if (!drag || !drag.moved) {
    return null;
  }

  const targetCol = Math.round(appState.tapeViewCol);
  const targetRow = Math.max(0, Math.min(appState.rows - 1, Math.round(appState.tapeViewRow)));
  const colDelta = targetCol - centerCol;
  const rowDelta = targetRow - centerRow;
  if (Math.abs(colDelta) < 0.001 && Math.abs(rowDelta) < 0.001) {
    return null;
  }

  const cellPitch = appState.cellSize + 4;
  const rowPitch = appState.cellSize + TAPE_ROW_PAD_Y * 2;
  const ghost = document.createElement("div");
  ghost.className = "tape-head-target";
  ghost.style.width = `${appState.cellSize}px`;
  ghost.style.height = `${appState.cellSize}px`;
  ghost.style.left = `${headCenterX - appState.cellSize / 2 + colDelta * cellPitch}px`;
  ghost.style.top = `${headTop + rowDelta * rowPitch}px`;
  return ghost;
}

function cycleTapeCell(row, col) {
  clearHaltedStatePulse();
  const current = symbolForDisplay(getSymbol(row, col));
  const index = TAPE_SYMBOL_CYCLE.indexOf(current);
  const next = TAPE_SYMBOL_CYCLE[(index + 1 + TAPE_SYMBOL_CYCLE.length) % TAPE_SYMBOL_CYCLE.length] || TAPE_SYMBOL_CYCLE[0];
  setSymbol(row, col, next);
  if (!appState.running) {
    snapshotStartTape();
  }
  appState.lastPlacedSymbol = normalizeSymbol(next);
  appState.message = `Set r${row}, c${col} to '${symbolForDisplay(next)}'.`;
}

function placeRememberedSymbol(row, col) {
  clearHaltedStatePulse();
  const symbol = normalizeSymbol(appState.lastPlacedSymbol) || "0";
  setSymbol(row, col, symbol);
  if (!appState.running) {
    snapshotStartTape();
  }
  appState.lastPlacedSymbol = symbol;
  appState.message = `Set r${row}, c${col} to remembered '${symbolForDisplay(symbol)}'.`;
}

function applyHeadFromTapeView() {
  const snapped = Math.round(appState.tapeViewCol);
  appState.head.col = snapped;
  const snappedRow = Math.max(0, Math.min(appState.rows - 1, Math.round(appState.tapeViewRow)));
  appState.head.row = snappedRow;
  if (!appState.running) {
    appState.startHead.col = snapped;
    appState.startHead.row = snappedRow;
  }
}

function animateTapeSnapTo(col, row, options = {}) {
  const duration = Math.max(60, Number(options.duration) || 170);
  const updateHead = options.updateHead !== false;
  stopTapeSnap();
  const start = performance.now();
  const fromCol = appState.tapeViewCol;
  const fromRow = Number.isFinite(appState.tapeViewRow) ? appState.tapeViewRow : appState.head.row;
  const toCol = col;
  const toRow = row;

  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    appState.tapeViewCol = fromCol + (toCol - fromCol) * eased;
    appState.tapeViewRow = fromRow + (toRow - fromRow) * eased;
    if (updateHead) {
      applyHeadFromTapeView();
    }
    renderTape();
    updateStatus();
    if (t < 1) {
      appState.tapeSnapRaf = requestAnimationFrame(tick);
      return;
    }
    appState.tapeViewCol = toCol;
    appState.tapeViewRow = toRow;
    if (updateHead) {
      applyHeadFromTapeView();
    }
    appState.tapeSnapRaf = null;
    renderTape();
    updateStatus();
  };

  appState.tapeSnapRaf = requestAnimationFrame(tick);
}

function animateTapeToHead(duration = 220, options = {}) {
  const includeRow = options.includeRow !== false;
  const targetCol = appState.head.col;
  if (!includeRow) {
    appState.tapeViewRow = appState.head.row;
  }
  const targetRow = includeRow ? appState.head.row : appState.tapeViewRow;
  if (Math.abs(appState.tapeViewCol - targetCol) < 0.001 && Math.abs(appState.tapeViewRow - targetRow) < 0.001) {
    appState.tapeViewCol = targetCol;
    appState.tapeViewRow = targetRow;
    return;
  }
  animateTapeSnapTo(targetCol, targetRow, { duration, updateHead: false });
}

function scheduleTapeMoveToHead(delayMs, duration, options = {}) {
  clearTapeMoveDelay();
  if (delayMs <= 0) {
    animateTapeToHead(duration, options);
    return;
  }
  appState.tapeMoveDelayTimer = setTimeout(() => {
    appState.tapeMoveDelayTimer = null;
    animateTapeToHead(duration, options);
  }, delayMs);
}

function handleTapeCellActivate(cell, pointerType = "") {
  if (!cell) {
    return;
  }
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);

  cycleTapeCell(row, col);

  if (pointerType === "touch" || pointerType === "pen") {
    cell.blur();
  }

  renderTape();
  updateStatus();
  persistWorkspace();
}

function initTapeInteractions() {
  const viewport = els.tapeViewport;

  viewport.addEventListener("contextmenu", (event) => {
    const cell = event.target.closest(".tape-cell");
    if (!cell || appState.running) {
      return;
    }
    event.preventDefault();
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    placeRememberedSymbol(row, col);
    renderTape();
    updateStatus();
    persistWorkspace();
  });

  viewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      document.body.classList.add("touch-input");
    } else if (event.pointerType === "mouse") {
      document.body.classList.remove("touch-input");
    }

    if (event.button !== 0 || appState.running) {
      return;
    }
    const cell = event.target.closest(".tape-cell");
    stopTapeSnap();
    appState.tapeDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCol: appState.tapeViewCol,
      startRow: Number.isFinite(appState.tapeViewRow) ? appState.tapeViewRow : appState.head.row,
      moved: false,
      pressedCell: cell || null
    };
    viewport.classList.add("dragging");
    try {
      viewport.setPointerCapture(event.pointerId);
    } catch {
      // iOS Safari may reject capture in some sequences; drag still works via direct events.
    }
    event.preventDefault();
  });

  viewport.addEventListener("pointermove", (event) => {
    const drag = appState.tapeDrag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.moved) {
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        drag.moved = true;
      }
    }

    if (!drag.moved) {
      return;
    }

    const cellPitch = appState.cellSize + 4;
    const rowPitch = appState.cellSize + TAPE_ROW_PAD_Y * 2;
    appState.tapeViewCol = drag.startCol - dx / cellPitch;
    appState.tapeViewRow = appState.rows > 1 ? drag.startRow - dy / rowPitch : appState.head.row;

    renderTape();
    updateStatus();
  });

  const finishPointer = (event, cancelled) => {
    const drag = appState.tapeDrag;
    if (!drag) {
      return;
    }

    const pointerId = event?.pointerId;
    const samePointer = pointerId === drag.pointerId;
    if (!samePointer && !cancelled) {
      return;
    }

    if (viewport.hasPointerCapture(drag.pointerId)) {
      viewport.releasePointerCapture(drag.pointerId);
    }
    viewport.classList.remove("dragging");

    if (!cancelled && drag.moved) {
      const snappedCol = Math.round(appState.tapeViewCol);
      const snappedRow = Math.max(0, Math.min(appState.rows - 1, Math.round(appState.tapeViewRow)));
      const previousHeadRow = appState.head.row;
      const rowDelta = snappedRow - previousHeadRow;

      // Preserve current visual offset at release, then animate back to canonical framing.
      appState.head.col = snappedCol;
      appState.head.row = snappedRow;
      appState.tapeViewRow += rowDelta;
      appState.startHead = { ...appState.head };
      animateTapeToHead(220);
      updateStatus();
      persistWorkspace();
    } else if (cancelled && drag.moved) {
      // iOS can emit pointercancel mid-drag; re-align visual tape to integer head row/col.
      animateTapeToHead(180);
      updateStatus();
    } else if (!cancelled && drag.pressedCell) {
      const eventTarget = event && event.target && typeof event.target.closest === "function"
        ? event.target
        : null;
      const cell = (eventTarget && eventTarget.closest(".tape-cell")) || drag.pressedCell;
      handleTapeCellActivate(cell, drag.pointerType || "");
    }

    appState.tapeDrag = null;
  };

  viewport.addEventListener("pointerup", (event) => finishPointer(event, false));
  viewport.addEventListener("pointercancel", (event) => finishPointer(event, true));
  viewport.addEventListener("lostpointercapture", (event) => finishPointer(event, true));
  viewport.addEventListener("touchend", () => finishPointer({ pointerId: appState.tapeDrag?.pointerId }, false), { passive: true });
  viewport.addEventListener("touchcancel", () => finishPointer({ pointerId: appState.tapeDrag?.pointerId }, true), { passive: true });

  // Fallbacks for mobile Safari cases where up/cancel may dispatch off-element.
  window.addEventListener("pointerup", (event) => finishPointer(event, false));
  window.addEventListener("pointercancel", (event) => finishPointer(event, true));
  window.addEventListener("touchend", () => finishPointer({ pointerId: appState.tapeDrag?.pointerId }, false), { passive: true });
  window.addEventListener("touchcancel", () => finishPointer({ pointerId: appState.tapeDrag?.pointerId }, true), { passive: true });
}

function renderRulesTable() {
  const tbody = els.rulesTableBody;
  tbody.innerHTML = "";

  const moveChoices = movementOptions();
  const stateChoices = getAvailableStates();
  const alphabetChoices = getAvailableAlphabet();

  for (const rule of appState.rules) {
    const tr = document.createElement("tr");
    if (rule.id === appState.activeRuleId) {
      tr.classList.add("active-rule");
    }

    tr.appendChild(ruleStateSelectCell(rule, "current", stateChoices));
    tr.appendChild(ruleSymbolSelectCell(rule, "read", alphabetChoices));
    tr.appendChild(ruleSymbolSelectCell(rule, "write", alphabetChoices));
    tr.appendChild(ruleSelectCell(rule, "move", moveChoices));
    tr.appendChild(ruleStateSelectCell(rule, "next", stateChoices));

    const delCell = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "rule-del-btn";
    delBtn.setAttribute("aria-label", "Delete rule");
    delBtn.title = "Delete rule";
    const delIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    delIcon.setAttribute("viewBox", "0 0 24 24");
    delIcon.setAttribute("aria-hidden", "true");
    delIcon.setAttribute("focusable", "false");
    const delPathA = document.createElementNS("http://www.w3.org/2000/svg", "path");
    delPathA.setAttribute("d", "M7 7l10 10");
    const delPathB = document.createElementNS("http://www.w3.org/2000/svg", "path");
    delPathB.setAttribute("d", "M17 7L7 17");
    delIcon.appendChild(delPathA);
    delIcon.appendChild(delPathB);
    delBtn.appendChild(delIcon);
    delBtn.addEventListener("click", () => {
      clearHaltedStatePulse();
      appState.rules = appState.rules.filter((r) => r.id !== rule.id);
      renderAll();
    });
    delCell.appendChild(delBtn);
    tr.appendChild(delCell);

    tbody.appendChild(tr);
  }

  if (appState.activeRuleId) {
    scrollActiveRuleIntoView();
  }
}

function scrollActiveRuleIntoView() {
  const wrap = els.rulesTableWrap;
  if (!wrap || !appState.activeRuleId) {
    return;
  }

  const activeRow = wrap.querySelector("tr.active-rule");
  if (!activeRow) {
    return;
  }

  const padding = 8;
  const wrapRect = wrap.getBoundingClientRect();
  const rowRect = activeRow.getBoundingClientRect();
  const stickyHeader = wrap.querySelector("thead th");
  const headerHeight = stickyHeader ? stickyHeader.getBoundingClientRect().height : 0;
  const visibleTop = wrapRect.top + headerHeight + padding;
  const visibleBottom = wrapRect.bottom - padding;
  const rowAbove = rowRect.top < visibleTop;
  const rowBelow = rowRect.bottom > visibleBottom;

  if (rowAbove || rowBelow) {
    if (rowAbove) {
      wrap.scrollTop = Math.max(0, wrap.scrollTop - (visibleTop - rowRect.top));
      return;
    }
    wrap.scrollTop = Math.max(0, wrap.scrollTop + (rowRect.bottom - visibleBottom));
  }
}

function getAvailableAlphabet() {
  const values = [];
  const seen = new Set();

  const pushSymbol = (rawSymbol) => {
    const normalized = normalizeSymbol(rawSymbol) || BLANK;
    if (seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    values.push(normalized);
  };

  TAPE_SYMBOL_CYCLE.forEach(pushSymbol);
  for (const rule of appState.rules) {
    pushSymbol(rule.read);
    pushSymbol(rule.write);
  }
  for (const symbol of appState.tape.values()) {
    pushSymbol(symbol);
  }

  return values;
}

function ruleStateSelectCell(rule, field, options) {
  const td = document.createElement("td");
  const select = document.createElement("select");
  const values = options.includes(rule[field]) ? options : [...options, rule[field]].filter(Boolean);

  for (const option of values) {
    const el = document.createElement("option");
    el.value = option;
    el.textContent = option;
    if (option === rule[field]) {
      el.selected = true;
    }
    select.appendChild(el);
  }

  select.addEventListener("change", () => {
    clearHaltedStatePulse();
    rule[field] = select.value;
    renderDiagram();
  });

  td.appendChild(select);
  return td;
}

function ruleSymbolSelectCell(rule, field, options) {
  const td = document.createElement("td");
  const select = document.createElement("select");
  const current = symbolForDisplay(rule[field]);
  const values = options.includes(current) ? options : [...options, current];

  for (const option of values) {
    const el = document.createElement("option");
    el.value = option;
    el.textContent = option === BLANK ? `blank (${BLANK})` : option;
    if (option === current) {
      el.selected = true;
    }
    select.appendChild(el);
  }

  select.addEventListener("change", () => {
    clearHaltedStatePulse();
    rule[field] = normalizeSymbol(select.value) || BLANK;
    renderDiagram();
  });

  td.appendChild(select);
  return td;
}

function ruleSelectCell(rule, field, options) {
  const MOVE_LABELS = { L: "Left", R: "Right", U: "Up", D: "Down", S: "Stay" };
  const td = document.createElement("td");
  const select = document.createElement("select");

  for (const option of options) {
    const el = document.createElement("option");
    el.value = option;
    el.textContent = field === "move" ? (MOVE_LABELS[option] || option) : option;
    if (option === rule[field]) {
      el.selected = true;
    }
    select.appendChild(el);
  }

  select.addEventListener("change", () => {
    clearHaltedStatePulse();
    rule[field] = select.value;
    renderDiagram();
  });

  td.appendChild(select);
  return td;
}

function parseAndCleanRule(rule) {
  return {
    ...rule,
    current: (rule.current || "").trim(),
    read: normalizeSymbol(rule.read),
    write: normalizeSymbol(rule.write),
    move: (rule.move || "").trim(),
    next: (rule.next || "").trim()
  };
}

function moveToNotation(move) {
  if (move === "L") return "←";
  if (move === "R") return "→";
  if (move === "U") return "↑";
  if (move === "D") return "↓";
  return "";
}

function buildEdgeGroups() {
  const groupsByPair = new Map();

  for (const rawRule of appState.rules) {
    const clean = parseAndCleanRule(rawRule);
    if (!clean.current || !clean.read || !clean.write || !clean.move || !clean.next) {
      continue;
    }

    const readDisplay = symbolForDisplay(clean.read);
    const writeDisplay = symbolForDisplay(clean.write);
    const writeNotation = writeDisplay === readDisplay ? "" : writeDisplay;
    const moveNotation = moveToNotation(clean.move);
    const pairKey = `${clean.current}\u0001${clean.next}`;
    const actionKey = `${writeNotation}\u0001${moveNotation}`;

    let pairGroups = groupsByPair.get(pairKey);
    if (!pairGroups) {
      pairGroups = [];
      groupsByPair.set(pairKey, pairGroups);
    }

    let group = pairGroups.find((candidate) => candidate.actionKey === actionKey);
    if (!group) {
      group = {
        actionKey,
        current: clean.current,
        next: clean.next,
        writeNotation,
        moveNotation,
        reads: [],
        ruleIds: new Set()
      };
      pairGroups.push(group);
    }

    if (!group.reads.includes(readDisplay)) {
      group.reads.push(readDisplay);
    }
    group.ruleIds.add(rawRule.id);
  }

  return groupsByPair;
}

function buildGroupLabel(group) {
  const readPart = group.reads.join(", ");
  const action = `${group.writeNotation || ""}${group.moveNotation || ""}`;
  return `${readPart}|${action}`;
}

function appendLabelToken(label, text, className) {
  const token = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
  if (className) {
    token.setAttribute("class", className);
  }
  token.textContent = text;
  label.appendChild(token);
}

function renderGroupLabel(label, group) {
  label.textContent = "";
  if (group.reads.length === 0) {
    appendLabelToken(label, "?", "edge-label-read");
  } else {
    appendLabelToken(label, group.reads[0], "edge-label-read");
    for (let i = 1; i < group.reads.length; i += 1) {
      appendLabelToken(label, ", ", "");
      appendLabelToken(label, group.reads[i], "edge-label-read");
    }
  }

  appendLabelToken(label, "|", "");

  if (group.writeNotation) {
    appendLabelToken(label, group.writeNotation, "edge-label-write");
  }

  if (group.moveNotation) {
    appendLabelToken(label, group.moveNotation, "edge-label-move");
  }
}

function findMatchingRule() {
  const symbol = getSymbol(appState.head.row, appState.head.col);
  for (const rawRule of appState.rules) {
    const rule = parseAndCleanRule(rawRule);
    if (!rule.current || !rule.read || !rule.write || !rule.move || !rule.next) {
      continue;
    }
    if (rule.current === appState.currentState && rule.read === symbol) {
      return rule;
    }
  }
  return null;
}

function applyMove(move) {
  if (move === "L") {
    appState.head.col -= 1;
    return;
  }
  if (move === "R") {
    appState.head.col += 1;
    return;
  }
  if (move === "U") {
    appState.head.row = Math.max(0, appState.head.row - 1);
    return;
  }
  if (move === "D") {
    appState.head.row = Math.min(appState.rows - 1, appState.head.row + 1);
  }
}

function machineStep() {
  if (appState.acceptStates.includes(appState.currentState)) {
    appState.message = `Machine already accepted in state ${appState.currentState}.`;
    appState.haltedStatePulse = true;
    appState.running = false;
    return;
  }

  if (appState.rejectStates.includes(appState.currentState)) {
    appState.message = `Machine already rejected in state ${appState.currentState}.`;
    appState.haltedStatePulse = true;
    appState.running = false;
    return;
  }

  const rule = findMatchingRule();
  if (!rule) {
    appState.message = `No rule for state ${appState.currentState} and symbol ${getSymbol(appState.head.row, appState.head.col)}. Halt.`;
    appState.running = false;
    appState.activeRuleId = null;
    return;
  }

  const found = appState.rules.find((r) => r.id === rule.id || (r.current === rule.current && r.read === rule.read && r.write === rule.write && r.move === rule.move && r.next === rule.next));
  appState.activeRuleId = found ? found.id : null;

  const writeRow = appState.head.row;
  const writeCol = appState.head.col;
  const currentSymbol = getSymbol(writeRow, writeCol);
  const nextSymbol = normalizeSymbol(rule.write);
  const wroteChanged = nextSymbol !== normalizeSymbol(currentSymbol);
  if (wroteChanged) {
    triggerHeadWritePulse(writeRow, writeCol);
    triggerCellWriteMorph(writeRow, writeCol, currentSymbol, nextSymbol);
  }
  setSymbol(writeRow, writeCol, rule.write);
  applyMove(rule.move);
  // Machine-driven U/D movement should move the head marker, not vertically shift the tape sheet.
  appState.tapeViewRow = appState.head.row;
  appState.currentState = rule.next;
  appState.steps += 1;
  if (wroteChanged) {
    scheduleTapeMoveToHead(MOVE_AFTER_WRITE_DELAY_MS, appState.running ? 180 : 200, { includeRow: false });
  } else {
    scheduleTapeMoveToHead(0, appState.running ? 180 : 200, { includeRow: false });
  }

  if (appState.acceptStates.includes(appState.currentState)) {
    appState.message = `Accepted in ${appState.currentState} after ${appState.steps} steps.`;
    appState.haltedStatePulse = true;
    appState.running = false;
    return;
  }

  if (appState.rejectStates.includes(appState.currentState)) {
    appState.message = `Rejected in ${appState.currentState} after ${appState.steps} steps.`;
    appState.haltedStatePulse = true;
    appState.running = false;
    return;
  }

  appState.message = `Applied ${rule.current},${rule.read} -> ${rule.next},${rule.write},${rule.move}`;
}

function runLoopTick() {
  if (!appState.running) {
    return;
  }

  // Keep execution and tape motion in lockstep to avoid mid-animation jumps.
  if (appState.tapeMoveDelayTimer || appState.tapeSnapRaf) {
    return;
  }

  machineStep();

  if (appState.tapeMoveDelayTimer || appState.tapeSnapRaf) {
    // Tape movement/pulse loop will render tape frames; update non-tape visuals now.
    renderRulesTable();
    renderDiagram();
    updateStatus();
  } else {
    renderAll();
  }

  if (!appState.running) {
    stopRunLoop();
  }
}

function applyStepWithVisuals() {
  machineStep();
  if (appState.tapeMoveDelayTimer || appState.tapeSnapRaf) {
    renderRulesTable();
    renderDiagram();
    updateStatus();
    return;
  }
  renderAll();
}

function startRunLoop() {
  if (appState.running) {
    return;
  }
  appState.running = true;
  appState.runTimer = setInterval(runLoopTick, 450);
}

function stopRunLoop() {
  appState.running = false;
  clearTapeMoveDelay();
  if (appState.runTimer) {
    clearInterval(appState.runTimer);
    appState.runTimer = null;
  }
}

function resetMachine() {
  clearHaltedStatePulse();
  stopRunLoop();
  stopTapeSnap();
  stopHeadPulse();
  clearTapeMoveDelay();
  restoreStartTape();
  appState.currentState = appState.startState;
  appState.head = { ...appState.startHead };
  syncTapeViewToHead();
  appState.steps = 0;
  appState.activeRuleId = null;
  appState.message = "Machine reset.";
  renderAll();
}

function resetTape() {
  clearHaltedStatePulse();
  stopRunLoop();
  stopTapeSnap();
  stopHeadPulse();
  clearTapeMoveDelay();
  appState.tape.clear();
  snapshotStartTape();
  appState.head = { row: 0, col: 0 };
  appState.startHead = { row: 0, col: 0 };
  syncTapeViewToHead();
  appState.steps = 0;
  appState.activeRuleId = null;
  appState.currentState = appState.startState;
  appState.message = "Tape cleared.";
  renderAll();
}

function setupDiagramDefs(svg, sizeScale = 1) {
  const markerScale = Math.max(1, Math.min(2.4, sizeScale));
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", "arrow");
  marker.setAttribute("viewBox", "0 0 10 10");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "5");
  marker.setAttribute("markerWidth", String(7 * markerScale));
  marker.setAttribute("markerHeight", String(7 * markerScale));
  marker.setAttribute("orient", "auto-start-reverse");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  path.setAttribute("fill", "#74808d");
  marker.appendChild(path);
  defs.appendChild(marker);
  svg.appendChild(defs);
}

function renderDiagram(targetSvg = els.diagram) {
  const svg = targetSvg;
  if (!svg) {
    return;
  }
  const diagramWidth = Math.max(360, Math.round(svg.clientWidth || 640));
  const diagramHeight = Math.max(240, Math.round(svg.clientHeight || 360));
  const isExpandedDiagram = svg === els.diagramExpanded;
  const minScale = isExpandedDiagram ? 1.2 : 1.12;
  const maxScale = isExpandedDiagram ? 2.4 : 1.5;
  const sizeScale = Math.max(minScale, Math.min(maxScale, Math.min(diagramWidth / 620, diagramHeight / 340)));
  const labelFontSize = Math.round(12 * sizeScale);
  svg.setAttribute("viewBox", `0 0 ${diagramWidth} ${diagramHeight}`);
  svg.style.setProperty("--diagram-label-size", `${labelFontSize}px`);
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }

  setupDiagramDefs(svg, sizeScale);

  const list = getAvailableStates();
  if (list.length === 0) {
    return;
  }

  const centerX = diagramWidth / 2;
  const aspectRatio = diagramHeight / Math.max(1, diagramWidth);
  const tallNarrowFactor = Math.max(0, Math.min(1, (aspectRatio - 1) / 0.9));
  const desiredBias = list.length <= 3
    ? 0.09 * tallNarrowFactor
    : list.length === 4
      ? 0.025 * tallNarrowFactor
      : 0.012 * tallNarrowFactor;
  const desiredCenterY = diagramHeight * (0.5 + desiredBias);
  const nodeRadius = 26 * sizeScale;
  const paddingX = 56 * sizeScale;
  const basePaddingY = 56 * sizeScale;
  const heightSurplus = Math.max(0, diagramHeight - 420);
  const paddingY = Math.max(22 * sizeScale, basePaddingY - heightSurplus * 0.05);
  const usableWidth = Math.max(140, diagramWidth - paddingX * 2);
  const usableHeight = Math.max(120, diagramHeight - paddingY * 2);
  const crowdFactorX = list.length <= 8 ? 1 : Math.max(0.62, 8 / list.length);
  const crowdFactorY = list.length <= 8 ? 1 : Math.max(0.74, 9.5 / list.length);
  const radiusX = Math.max(74, (usableWidth / 2 - nodeRadius - 8) * crowdFactorX);
  const rawRadiusY = Math.max(62, (usableHeight / 2 - nodeRadius - 8) * crowdFactorY);
  const topSafety = 74 * sizeScale;
  const bottomSafety = 12 * sizeScale;
  const minCenterY = topSafety + rawRadiusY;
  const maxCenterY = diagramHeight - bottomSafety - rawRadiusY;
  const centerY = minCenterY <= maxCenterY
    ? Math.min(maxCenterY, Math.max(minCenterY, desiredCenterY))
    : (topSafety + (diagramHeight - bottomSafety)) / 2;
  const radiusY = Math.max(
    40,
    Math.min(rawRadiusY, centerY - topSafety, diagramHeight - centerY - bottomSafety)
  );
  const startAngle = list.length === 2 ? 0 : -Math.PI / 2;
  const positions = new Map();

  list.forEach((name, i) => {
    const angle = (i / list.length) * Math.PI * 2 + startAngle;
    positions.set(name, {
      x: centerX + radiusX * Math.cos(angle),
      y: centerY + radiusY * Math.sin(angle)
    });
  });

  // Re-centre node envelope vertically so top/bottom gaps stay visually balanced.
  const nodePoints = Array.from(positions.values());
  const minNodeY = Math.min(...nodePoints.map((point) => point.y));
  const maxNodeY = Math.max(...nodePoints.map((point) => point.y));
  const topGap = minNodeY - nodeRadius;
  const bottomGap = diagramHeight - (maxNodeY + nodeRadius);
  const targetShiftY = (bottomGap - topGap) / 2;
  const minOuterGap = 8 * sizeScale;
  const maxShiftUp = Math.max(0, topGap - minOuterGap);
  const maxShiftDown = Math.max(0, bottomGap - minOuterGap);
  const shiftY = Math.max(-maxShiftUp, Math.min(targetShiftY, maxShiftDown));

  if (Math.abs(shiftY) > 0.001) {
    for (const point of nodePoints) {
      point.y += shiftY;
    }
  }

  const edgeGroups = buildEdgeGroups();
  for (const groups of edgeGroups.values()) {
    groups.forEach((group, index) => {
      const from = positions.get(group.current);
      const to = positions.get(group.next);
      if (!from || !to) {
        return;
      }

      const isSelfLoop = group.current === group.next;
      let labelX = (from.x + to.x) / 2;
      let labelY = (from.y + to.y) / 2 - 4 + index * 14;

      if (isSelfLoop) {
        const sideLevel = Math.floor(index / 4);
        const slotIndex = index % 4;
        const loopDepth = (46 + sideLevel * 12) * sizeScale;
        const loopSpread = (44 + sideLevel * 8) * sizeScale;
        const loopAnchorInset = Math.min(nodeRadius * 0.62, 16 * sizeScale);
        const loopAnchorSpan = Math.sqrt(
          Math.max(0, nodeRadius * nodeRadius - loopAnchorInset * loopAnchorInset)
        );
        const spaceLeft = from.x;
        const spaceRight = diagramWidth - from.x;
        const preferredHorizontal = spaceRight >= spaceLeft ? 1 : -1;
        const spaceTop = from.y;
        const spaceBottom = diagramHeight - from.y;
        const preferredVertical = spaceBottom >= spaceTop ? 1 : -1;
        const loopSides = [
          { axis: "x", dir: preferredHorizontal },
          { axis: "x", dir: -preferredHorizontal },
          { axis: "y", dir: preferredVertical },
          { axis: "y", dir: -preferredVertical }
        ];
        const sideChoice = loopSides[slotIndex];
        const loopPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        if (sideChoice.axis === "x") {
          const side = sideChoice.dir;
          loopPath.setAttribute(
            "d",
            `M ${from.x + side * loopAnchorSpan} ${from.y - loopAnchorInset} C ${from.x + side * (nodeRadius + loopDepth)} ${from.y - loopSpread}, ${from.x + side * (nodeRadius + loopDepth)} ${from.y + loopSpread}, ${from.x + side * loopAnchorSpan} ${from.y + loopAnchorInset}`
          );
          labelX = from.x + side * (nodeRadius + loopDepth + 24 * sizeScale);
          labelY = from.y + 4 * sizeScale + sideLevel * 10 * sizeScale;
        } else {
          const vertical = sideChoice.dir;
          loopPath.setAttribute(
            "d",
            `M ${from.x - loopAnchorInset} ${from.y + vertical * loopAnchorSpan} C ${from.x - loopSpread} ${from.y + vertical * (nodeRadius + loopDepth)}, ${from.x + loopSpread} ${from.y + vertical * (nodeRadius + loopDepth)}, ${from.x + loopAnchorInset} ${from.y + vertical * loopAnchorSpan}`
          );
          labelX = from.x;
          labelY = from.y + vertical * (nodeRadius + loopDepth + 12 * sizeScale) + sideLevel * 6 * sizeScale;
        }
        loopPath.setAttribute("class", "edge");
        loopPath.setAttribute("marker-end", "url(#arrow)");

        svg.appendChild(loopPath);
      } else {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;

        const startX = from.x + ux * (nodeRadius - 1);
        const startY = from.y + uy * (nodeRadius - 1);
        const endX = to.x - ux * (nodeRadius + 2);
        const endY = to.y - uy * (nodeRadius + 2);

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(startX));
        line.setAttribute("y1", String(startY));
        line.setAttribute("x2", String(endX));
        line.setAttribute("y2", String(endY));
        line.setAttribute("class", "edge");
        line.setAttribute("marker-end", "url(#arrow)");

        svg.appendChild(line);
      }

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", String(labelX));
      label.setAttribute("y", String(labelY));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "label edge-label");
      renderGroupLabel(label, group);
      svg.appendChild(label);

      const bounds = label.getBBox();
      const badgePadX = 5 * sizeScale;
      const badgePadY = 2 * sizeScale;
      let badgeX = bounds.x - badgePadX;
      let badgeY = bounds.y - badgePadY;
      const badgeWidth = bounds.width + badgePadX * 2;
      const badgeHeight = bounds.height + badgePadY * 2;
      const minPad = 2;

      if (badgeX < minPad) {
        const shift = minPad - badgeX;
        badgeX += shift;
        labelX += shift;
      } else if (badgeX + badgeWidth > diagramWidth - minPad) {
        const shift = diagramWidth - minPad - (badgeX + badgeWidth);
        badgeX += shift;
        labelX += shift;
      }

      if (badgeY < minPad) {
        const shift = minPad - badgeY;
        badgeY += shift;
        labelY += shift;
      } else if (badgeY + badgeHeight > diagramHeight - minPad) {
        const shift = diagramHeight - minPad - (badgeY + badgeHeight);
        badgeY += shift;
        labelY += shift;
      }

      label.setAttribute("x", String(labelX));
      label.setAttribute("y", String(labelY));

      const badge = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      badge.setAttribute("x", String(badgeX));
      badge.setAttribute("y", String(badgeY));
      badge.setAttribute("width", String(badgeWidth));
      badge.setAttribute("height", String(badgeHeight));
      badge.setAttribute("rx", "4");
      badge.setAttribute("class", "edge-label-bg");
      if (appState.activeRuleId && group.ruleIds.has(appState.activeRuleId)) {
        badge.classList.add("active-transition-badge");
      }
      svg.insertBefore(badge, label);
    });
  }

  for (const [name, pos] of positions.entries()) {
    const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodeGroup.setAttribute("class", "state-node-group");

    const nodeTooltip = document.createElementNS("http://www.w3.org/2000/svg", "title");
    nodeTooltip.textContent = `Click to edit state ${name}`;
    nodeGroup.appendChild(nodeTooltip);

    nodeGroup.addEventListener("click", () => {
      openStateModal(name);
    });

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(pos.x));
    circle.setAttribute("cy", String(pos.y));
    circle.setAttribute("r", String(nodeRadius));
    circle.setAttribute("class", "state-node");

    if (name === appState.startState) {
      circle.classList.add("start");
    }

    if (appState.acceptStates.includes(name)) {
      circle.classList.add("accept");
    }
    if (appState.rejectStates.includes(name)) {
      circle.classList.add("reject");
    }
    if (name === appState.currentState) {
      circle.classList.add("current");
    }

    const haltedCurrentState = appState.haltedStatePulse
      && !appState.running
      && name === appState.currentState
      && (appState.acceptStates.includes(name) || appState.rejectStates.includes(name));
    if (haltedCurrentState) {
      nodeGroup.classList.add("halted-node");
    }

    nodeGroup.appendChild(circle);

    if (appState.acceptStates.includes(name)) {
      const inner = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      inner.setAttribute("cx", String(pos.x));
      inner.setAttribute("cy", String(pos.y));
      inner.setAttribute("r", String(Math.max(12, nodeRadius - 6 * sizeScale)));
      inner.setAttribute("class", "state-node accept-inner");
      nodeGroup.appendChild(inner);
    }

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(pos.x));
    text.setAttribute("y", String(pos.y + 5));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "label");
    if (name === appState.currentState) {
      text.classList.add("current-state-label");
    }
    text.textContent = name;
    nodeGroup.appendChild(text);
    svg.appendChild(nodeGroup);
  }
}

function openDiagramModal() {
  if (appState.running || appState.diagramModalOpen || !els.diagramModal) {
    return;
  }
  appState.modalOpenedAt = performance.now();
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;";
  const content = els.diagramModal.firstElementChild;
  if (content) {
    overlay.appendChild(content);
  }
  overlay.addEventListener("click", (event) => {
    if (performance.now() - appState.modalOpenedAt < 350) return;
    if (event.target === overlay) closeDiagramModal();
  });
  document.body.appendChild(overlay);
  appState.diagramModalOverlay = overlay;
  appState.diagramModalOpen = true;
  requestAnimationFrame(() => {
    if (appState.diagramModalOpen) {
      renderDiagram(els.diagramExpanded);
    }
  });
}

function closeDiagramModal() {
  if (!appState.diagramModalOpen || !els.diagramModal) {
    return;
  }
  appState.diagramModalOpen = false;
  if (appState.diagramModalOverlay) {
    const content = appState.diagramModalOverlay.firstElementChild;
    if (content) {
      els.diagramModal.appendChild(content);
    }
    appState.diagramModalOverlay.remove();
    appState.diagramModalOverlay = null;
  }
}

function updateStatus() {
  els.statusState.textContent = `State: ${appState.currentState}`;
  els.statusStep.textContent = `Step: ${appState.steps}`;
  els.statusMessage.textContent = appState.message;

  const isHalted = appState.acceptStates.includes(appState.currentState) || appState.rejectStates.includes(appState.currentState);

  els.btnRun.disabled = appState.running;
  els.btnStep.disabled = appState.running || isHalted;
  els.btnPause.disabled = !appState.running;
  if (els.btnExpandDiagram) {
    els.btnExpandDiagram.disabled = appState.running;
  }
  if (els.btnClearStates) {
    els.btnClearStates.disabled = appState.running;
  }
  if (els.btnClearStatesExpanded) {
    els.btnClearStatesExpanded.disabled = appState.running;
  }
  els.btnAddRow.disabled = !canAddAnotherRow();
  els.btnRemoveRow.disabled = appState.rows <= 1;
}

function renderAll() {
  normalizeRulesForRows();
  updateMachineConfigFromInputs();
  syncStateRegistry();
  syncMachineConfigInputs();
  renderTape();
  renderRulesTable();
  renderDiagram();
  if (appState.diagramModalOpen) {
    renderDiagram(els.diagramExpanded);
  }
  updateStatus();
  persistWorkspace();
}

function addRule() {
  clearHaltedStatePulse();
  const availableStates = getAvailableStates();
  const defaultState = appState.currentState || availableStates[0] || "s0";
  appState.rules.push({
    id: crypto.randomUUID(),
    current: defaultState,
    read: BLANK,
    write: BLANK,
    move: "S",
    next: defaultState
  });
  renderAll();

  requestAnimationFrame(() => {
    if (!els.rulesTableWrap) {
      return;
    }
    els.rulesTableWrap.scrollTop = els.rulesTableWrap.scrollHeight;
  });
}

function openAboutModal() {
  appState.modalOpenedAt = performance.now();
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;";
  const content = els.aboutModal.firstElementChild;
  if (content) overlay.appendChild(content);
  overlay.addEventListener("click", (event) => {
    if (performance.now() - appState.modalOpenedAt < 350) return;
    if (event.target === overlay) closeAboutModal();
  });
  document.body.appendChild(overlay);
  appState.aboutModalOverlay = overlay;
}

function openHelpModal() {
  appState.modalOpenedAt = performance.now();
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;";
  const content = els.helpModal.firstElementChild;
  if (content) overlay.appendChild(content);
  overlay.addEventListener("click", (event) => {
    if (performance.now() - appState.modalOpenedAt < 350) return;
    if (event.target === overlay) closeHelpModal();
  });
  document.body.appendChild(overlay);
  appState.helpModalOverlay = overlay;
}

function closeAboutModal() {
  if (appState.aboutModalOverlay) {
    const content = appState.aboutModalOverlay.firstElementChild;
    if (content) els.aboutModal.appendChild(content);
    appState.aboutModalOverlay.remove();
    appState.aboutModalOverlay = null;
  }
}

function closeHelpModal() {
  if (appState.helpModalOverlay) {
    const content = appState.helpModalOverlay.firstElementChild;
    if (content) els.helpModal.appendChild(content);
    appState.helpModalOverlay.remove();
    appState.helpModalOverlay = null;
  }
}

function bindModalActivate(target, handler) {
  if (!target) {
    return;
  }

  let lastActivationAt = 0;
  let suppressClickUntil = 0;

  const activate = (event) => {
    const now = Date.now();
    if (now - lastActivationAt < 250) {
      return;
    }
    lastActivationAt = now;
    handler(event);
  };

  target.addEventListener("click", (event) => {
    if (Date.now() < suppressClickUntil) {
      return;
    }
    activate(event);
  });

  target.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      if (event.cancelable) {
        event.preventDefault();
      }
      suppressClickUntil = Date.now() + 900;
      activate(event);
    }
  });

  target.addEventListener(
    "touchend",
    (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      suppressClickUntil = Date.now() + 900;
      activate(event);
    },
    { passive: false }
  );
}

function bindTap(target, handler) {
  if (!target) {
    return;
  }

  let lastActivationAt = 0;
  let suppressClickUntil = 0;

  const activate = (event) => {
    const now = Date.now();
    if (now - lastActivationAt < 300) {
      return;
    }
    lastActivationAt = now;
    handler(event);
  };

  // iOS touch should activate immediately and suppress delayed ghost clicks.
  target.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      if (event.cancelable) {
        event.preventDefault();
      }
      suppressClickUntil = Date.now() + 900;
      activate(event);
    }
  });

  target.addEventListener(
    "touchend",
    (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      suppressClickUntil = Date.now() + 900;
      activate(event);
    },
    { passive: false }
  );

  // Click remains for mouse/keyboard/assistive activation.
  target.addEventListener("click", (event) => {
    if (Date.now() < suppressClickUntil) {
      return;
    }
    activate(event);
  });
}

function toggleMenu(open) {
  const isOpen = open !== undefined ? open : !els.appMenu.classList.contains("is-open");
  els.appMenu.classList.toggle("is-open", isOpen);
  els.btnHamburger.setAttribute("aria-expanded", String(isOpen));
  els.btnHamburger.classList.toggle("is-open", isOpen);
}

function initEvents() {
  initTapeInteractions();

  els.cellSizeSlider.addEventListener("input", () => {
    clearHaltedStatePulse();
    appState.cellSize = Number(els.cellSizeSlider.value);
    applyCellSize();
    renderTape();
  });

  els.tapeViewport.addEventListener(
    "wheel",
    (event) => {
      if (isMobileViewport()) {
        return;
      }
      const direction = Math.sign(event.deltaY);
      if (!direction) {
        return;
      }
      event.preventDefault();
      changeCellSizeBy(direction > 0 ? -2 : 2);
    },
    { passive: false }
  );

  bindTap(els.btnAddRow, () => {
    clearHaltedStatePulse();
    if (!canAddAnotherRow()) {
      appState.message = `Cannot add more rows: minimum cell size (${CELL_SIZE_MIN}px) reached for current viewport height.`;
      updateStatus();
      return;
    }
    appState.rows += 1;
    autoFitCellSize();
    syncTapeViewToHead();
    appState.message = `Rows: ${appState.rows}. U and D moves enabled.`;
    renderAll();
  });

  els.btnRemoveRow.addEventListener("click", () => {
    clearHaltedStatePulse();
    if (appState.rows <= 1) {
      return;
    }
    appState.rows -= 1;
    if (appState.head.row > appState.rows - 1) {
      appState.head.row = appState.rows - 1;
      appState.startHead.row = appState.rows - 1;
    }
    autoFitCellSize();
    syncTapeViewToHead();
    appState.message = `Rows: ${appState.rows}.`;
    renderAll();
  });

  els.btnHamburger.addEventListener("click", () => toggleMenu());
  els.btnMenuClose.addEventListener("click", () => toggleMenu(false));

  els.menuExamplesToggle.addEventListener("click", () => {
    const expanded = els.menuExamplesToggle.getAttribute("aria-expanded") === "true";
    els.menuExamplesToggle.setAttribute("aria-expanded", String(!expanded));
    els.menuExamplesList.hidden = expanded;
    els.menuExamplesToggle.querySelector(".concertina-arrow").textContent = expanded ? "▸" : "▾";
  });

  document.querySelectorAll(".menu-preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      loadPreset(btn.dataset.preset);
      toggleMenu(false);
    });
  });

  bindModalActivate(els.menuAbout, () => {
    openAboutModal();
    toggleMenu(false);
  });

  bindModalActivate(els.menuHelp, () => {
    openHelpModal();
    toggleMenu(false);
  });

  bindModalActivate(els.btnFooterHelp, openHelpModal);

  bindModalActivate(els.btnAboutCloseX, closeAboutModal);
  bindModalActivate(els.btnHelpCloseX, closeHelpModal);
  bindModalActivate(els.btnDeleteAllConfirmCancel, closeDeleteAllConfirmModal);
  bindModalActivate(els.btnDeleteAllConfirmConfirm, performDeleteAllStates);
  bindModalActivate(els.btnExpandDiagram, openDiagramModal);
  bindModalActivate(els.btnClearStates, deleteAllStatesWithConfirm);
  bindModalActivate(els.btnClearStatesExpanded, deleteAllStatesWithConfirm);
  bindModalActivate(els.btnAddStateExpanded, () => openStateModal());
  bindModalActivate(els.btnDiagramModalClose, closeDiagramModal);

  if (els.diagramModal) {
    els.diagramModal.addEventListener("click", (event) => {
      if (event.target === els.diagramModal) {
        closeDiagramModal();
      }
    });
  }

  document.addEventListener("click", (event) => {
    if (els.appMenu.classList.contains("is-open") && !els.appMenu.contains(event.target) && !els.btnHamburger.contains(event.target)) {
      toggleMenu(false);
    }
  });

  els.btnAddRule.addEventListener("click", addRule);
  bindModalActivate(els.btnAddState, () => openStateModal());
  els.btnResetTape.addEventListener("click", resetTape);
  els.btnResetMachine.addEventListener("click", resetMachine);

  els.btnStep.addEventListener("click", () => {
    clearHaltedStatePulse();
    stopRunLoop();
    if (appState.acceptStates.includes(appState.currentState) || appState.rejectStates.includes(appState.currentState)) {
      stopTapeSnap();
      stopHeadPulse();
      appState.currentState = appState.startState;
      appState.steps = 0;
      appState.activeRuleId = null;
    }
    applyStepWithVisuals();
  });

  els.btnRun.addEventListener("click", () => {
    clearHaltedStatePulse();
    if (appState.acceptStates.includes(appState.currentState) || appState.rejectStates.includes(appState.currentState)) {
      stopTapeSnap();
      stopHeadPulse();
      appState.currentState = appState.startState;
      appState.steps = 0;
      appState.activeRuleId = null;
    }
    startRunLoop();
    renderAll();
  });

  els.btnPause.addEventListener("click", () => {
    clearHaltedStatePulse();
    stopRunLoop();
    appState.message = "Paused.";
    renderAll();
  });

  bindModalActivate(els.btnStateModalCloseX, closeStateModal);
  bindModalActivate(els.btnStateModalCancel, closeStateModal);
  bindModalActivate(els.btnStateModalDelete, () => {
    if (!appState.stateModal.originalName) {
      return;
    }
    deleteState(appState.stateModal.originalName);
  });
  bindModalActivate(els.btnStateModalSave, saveStateModal);
  if (els.stateNameInput) {
    els.stateNameInput.addEventListener("input", () => setStateModalFeedback(""));
  }
  bindModalActivate(els.btnWorkspaceLoadSaved, loadSavedWorkspaceChoice);
  bindModalActivate(els.btnWorkspaceStartFresh, startFreshWorkspaceChoice);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (appState.workspaceFoundOverlay) startFreshWorkspaceChoice();
      if (appState.stateModal.open) closeStateModal();
      if (appState.aboutModalOverlay) closeAboutModal();
      if (appState.helpModalOverlay) closeHelpModal();
      if (appState.deleteAllConfirmOverlay) closeDeleteAllConfirmModal();
      if (appState.diagramModalOpen) closeDiagramModal();
      if (els.appMenu.classList.contains("is-open")) toggleMenu(false);
    }
  });

  window.addEventListener("resize", () => {
    autoFitCellSize();
    renderTape();
    renderDiagram();
    if (appState.diagramModalOpen) {
      renderDiagram(els.diagramExpanded);
    }
  });
}

function seedExampleTape() {
  const bits = ["1", "0", "1", "1"];
  bits.forEach((b, i) => setSymbol(0, i, b));
}

function init() {
  document.body.setAttribute("data-theme", "dark");
  if (els.aboutVersion) {
    els.aboutVersion.textContent = APP_VERSION;
  }
  initEvents();
  startupWithSavedWorkspaceDecision();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Ignore registration failures so the app still runs normally.
      });
    });
  }
}

init();
