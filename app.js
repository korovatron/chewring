const BLANK = "□";
const LEGACY_BLANK = "_";
const TAPE_SYMBOL_CYCLE = [BLANK, "0", "1", "#", "X"];
const DRAG_THRESHOLD_PX = 6;
const HEAD_WRITE_PULSE_MS = 280;
const CELL_WRITE_MORPH_MS = 280;
const MOVE_AFTER_WRITE_DELAY_MS = HEAD_WRITE_PULSE_MS;
const TAPE_ROW_PAD_X = 4;
const TAPE_ROW_PAD_Y = 3;
const CELL_SIZE_MIN = 28;
const CELL_SIZE_MAX = 132;
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
  activeRuleId: null,
  stateModal: { open: false, originalName: null },
  modalOpenedAt: 0,
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
  btnAddState: document.getElementById("btnAddState"),
  stateModal: document.getElementById("stateModal"),
  stateNameInput: document.getElementById("stateNameInput"),
  stateIsStart: document.getElementById("stateIsStart"),
  stateIsAccept: document.getElementById("stateIsAccept"),
  stateIsReject: document.getElementById("stateIsReject"),
  btnStateModalDelete: document.getElementById("btnStateModalDelete"),
  btnStateModalCancel: document.getElementById("btnStateModalCancel"),
  btnStateModalSave: document.getElementById("btnStateModalSave"),
  btnHamburger: document.getElementById("btnHamburger"),
  appMenu: document.getElementById("appMenu"),
  menuExamplesToggle: document.getElementById("menuExamplesToggle"),
  menuExamplesList: document.getElementById("menuExamplesList"),
  menuAbout: document.getElementById("menuAbout"),
  aboutModal: document.getElementById("aboutModal"),
  btnAboutClose: document.getElementById("btnAboutClose")
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

function canAddAnotherRow() {
  return appState.rows < maxRowsForViewportAtMinCellSize();
}

function applyCellSize() {
  const maxAllowed = maxCellSizeForViewportHeight();
  const size = Math.max(CELL_SIZE_MIN, Math.min(maxAllowed, appState.cellSize));
  appState.cellSize = size;
  document.documentElement.style.setProperty("--tape-cell-size", `${size}px`);
  els.cellSizeSlider.max = String(maxAllowed);
  els.cellSizeSlider.value = String(size);
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

  const width = viewport.clientWidth || 1000;
  const height = viewport.clientHeight || 260;

  const targetCols = 24;
  const horizontalGap = 4;
  const verticalGap = TAPE_ROW_PAD_Y * 2;

  const sizeFromWidth = Math.floor((width - targetCols * horizontalGap) / targetCols);
  const sizeFromHeight = Math.floor((height - (appState.rows - 1) * verticalGap) / Math.max(1, appState.rows));

  appState.cellSize = Math.max(CELL_SIZE_MIN, Math.min(CELL_SIZE_MAX, Math.min(sizeFromWidth, sizeFromHeight)));
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

function openStateModal(existingStateName = "") {
  appState.stateModal.open = true;
  appState.stateModal.originalName = existingStateName || null;

  els.stateNameInput.value = existingStateName;
  els.stateIsStart.checked = Boolean(existingStateName && appState.startState === existingStateName);
  els.stateIsAccept.checked = Boolean(existingStateName && appState.acceptStates.includes(existingStateName));
  els.stateIsReject.checked = Boolean(existingStateName && appState.rejectStates.includes(existingStateName));
  els.btnStateModalDelete.hidden = !existingStateName;

  appState.modalOpenedAt = performance.now();
  setModalVisible(els.stateModal, true);
  appState.message = "Modal debug: state modal open called.";
  updateStatus();

  requestAnimationFrame(() => {
    if (!appState.stateModal.open) {
      return;
    }
    els.stateNameInput.focus({ preventScroll: true });
  });
}

function closeStateModal() {
  appState.stateModal.open = false;
  appState.stateModal.originalName = null;
  els.btnStateModalDelete.hidden = true;
  setModalVisible(els.stateModal, false);
  appState.message = "Modal debug: state modal close called.";
  updateStatus();
}

function setModalVisible(modalElement, isVisible) {
  if (!modalElement) {
    return;
  }

  modalElement.classList.toggle("visible", isVisible);
  modalElement.style.display = isVisible ? "flex" : "none";
  modalElement.style.opacity = isVisible ? "1" : "0";
  modalElement.style.pointerEvents = isVisible ? "auto" : "none";
}

function deleteState(stateName) {
  const remainingStates = getAvailableStates().filter((state) => state !== stateName);
  if (remainingStates.length === 0) {
    appState.message = "Cannot delete the only remaining state.";
    updateStatus();
    return;
  }

  stopRunLoop();
  appState.rules = appState.rules.filter((rule) => rule.current !== stateName && rule.next !== stateName);
  appState.states = appState.states.filter((state) => state !== stateName);
  appState.acceptStates = appState.acceptStates.filter((state) => state !== stateName);
  appState.rejectStates = appState.rejectStates.filter((state) => state !== stateName);

  const fallbackState = remainingStates[0];
  if (appState.startState === stateName) {
    appState.startState = fallbackState;
  }
  if (appState.currentState === stateName) {
    appState.currentState = appState.startState || fallbackState;
  }

  appState.activeRuleId = null;
  syncStateRegistry();
  syncMachineConfigInputs();
  appState.message = `Deleted state '${stateName}' and removed referenced rules.`;
  closeStateModal();
  renderAll();
}

function saveStateModal() {
  const originalName = appState.stateModal.originalName;
  const proposedName = formatStateName(els.stateNameInput.value || "");
  const isStart = els.stateIsStart.checked;
  const isAccept = els.stateIsAccept.checked;
  const isReject = els.stateIsReject.checked;

  if (!proposedName) {
    appState.message = "State name is required.";
    updateStatus();
    return;
  }

  if (isAccept && isReject) {
    appState.message = "A state cannot be both accept and reject.";
    updateStatus();
    return;
  }

  const availableStates = new Set(getAvailableStates());
  if (originalName !== proposedName && availableStates.has(proposedName)) {
    appState.message = `State '${proposedName}' already exists.`;
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

  const labels = { "scan-right": "Scan Right Until Blank", "unary-increment": "Unary Increment", "binary-invert": "Binary Invert", "two-row-copy": "Two-Row Copy Demo" };
  appState.message = `Loaded: ${labels[key] || key}.`;
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
  if (!appState.startState) {
    appState.startState = appState.states[0] || formatStateName("s0");
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
  const headStroke = Math.max(3, Math.min(8, Math.round(appState.cellSize * 0.09)));
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

function handleTapeCellActivate(cell) {
  if (!cell) {
    return;
  }
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);

  cycleTapeCell(row, col);

  renderTape();
  updateStatus();
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
  });

  viewport.addEventListener("pointerdown", (event) => {
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
    } else if (cancelled && drag.moved) {
      // iOS can emit pointercancel mid-drag; re-align visual tape to integer head row/col.
      animateTapeToHead(180);
      updateStatus();
    } else if (!cancelled && drag.pressedCell) {
      const eventTarget = event && event.target && typeof event.target.closest === "function"
        ? event.target
        : null;
      const cell = (eventTarget && eventTarget.closest(".tape-cell")) || drag.pressedCell;
      handleTapeCellActivate(cell);
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
    delBtn.textContent = "Del";
    delBtn.addEventListener("click", () => {
      appState.rules = appState.rules.filter((r) => r.id !== rule.id);
      renderAll();
    });
    delCell.appendChild(delBtn);
    tr.appendChild(delCell);

    tbody.appendChild(tr);
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
  if (move === "L") return "⟵";
  if (move === "R") return "⟶";
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
    appState.running = false;
    return;
  }

  if (appState.rejectStates.includes(appState.currentState)) {
    appState.message = `Machine already rejected in state ${appState.currentState}.`;
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
    appState.running = false;
    return;
  }

  if (appState.rejectStates.includes(appState.currentState)) {
    appState.message = `Rejected in ${appState.currentState} after ${appState.steps} steps.`;
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

function setupDiagramDefs(svg) {
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", "arrow");
  marker.setAttribute("viewBox", "0 0 10 10");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "5");
  marker.setAttribute("markerWidth", "7");
  marker.setAttribute("markerHeight", "7");
  marker.setAttribute("orient", "auto-start-reverse");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  path.setAttribute("fill", "#74808d");
  marker.appendChild(path);
  defs.appendChild(marker);
  svg.appendChild(defs);
}

function renderDiagram() {
  const svg = els.diagram;
  const diagramWidth = Math.max(360, Math.round(svg.clientWidth || 640));
  const diagramHeight = Math.max(240, Math.round(svg.clientHeight || 360));
  const sizeScale = Math.max(1.12, Math.min(1.5, Math.min(diagramWidth / 620, diagramHeight / 340)));
  const labelFontSize = Math.round(12 * sizeScale);
  svg.setAttribute("viewBox", `0 0 ${diagramWidth} ${diagramHeight}`);
  svg.style.setProperty("--diagram-label-size", `${labelFontSize}px`);
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }

  setupDiagramDefs(svg);

  const list = getAvailableStates();
  if (list.length === 0) {
    return;
  }

  const centerX = diagramWidth / 2;
  const centerY = diagramHeight / 2;
  const nodeRadius = 26 * sizeScale;
  const padding = 56 * sizeScale;
  const usableWidth = Math.max(140, diagramWidth - padding * 2);
  const usableHeight = Math.max(120, diagramHeight - padding * 2);
  const crowdFactor = list.length <= 8 ? 1 : Math.max(0.62, 8 / list.length);
  const radiusX = Math.max(74, (usableWidth / 2 - nodeRadius - 8) * crowdFactor);
  const radiusY = Math.max(62, (usableHeight / 2 - nodeRadius - 8) * crowdFactor);
  const startAngle = list.length === 2 ? 0 : -Math.PI / 2;
  const positions = new Map();

  list.forEach((name, i) => {
    const angle = (i / list.length) * Math.PI * 2 + startAngle;
    positions.set(name, {
      x: centerX + radiusX * Math.cos(angle),
      y: centerY + radiusY * Math.sin(angle)
    });
  });

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
        const sideLevel = Math.floor(index / 2);
        const loopDepth = 46 + sideLevel * 12;
        const loopSpread = 44 + sideLevel * 8;
        const spaceLeft = from.x;
        const spaceRight = diagramWidth - from.x;
        const preferredSide = spaceRight >= spaceLeft ? 1 : -1;
        const side = index % 2 === 0 ? preferredSide : -preferredSide;
        const loopPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        loopPath.setAttribute(
          "d",
          `M ${from.x + side * nodeRadius} ${from.y - 16} C ${from.x + side * (nodeRadius + loopDepth)} ${from.y - loopSpread}, ${from.x + side * (nodeRadius + loopDepth)} ${from.y + loopSpread}, ${from.x + side * nodeRadius} ${from.y + 16}`
        );
        labelX = from.x + side * (nodeRadius + loopDepth + 24);
        labelY = from.y + 4 + sideLevel * 12;
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

function updateStatus() {
  els.statusState.textContent = `State: ${appState.currentState}`;
  els.statusStep.textContent = `Step: ${appState.steps}`;
  els.statusMessage.textContent = appState.message;

  els.btnRun.disabled = appState.running;
  els.btnPause.disabled = !appState.running;
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
  updateStatus();
}

function addRule() {
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
  setModalVisible(els.aboutModal, true);
  appState.message = "Modal debug: about modal open called.";
  updateStatus();
}

function closeAboutModal() {
  setModalVisible(els.aboutModal, false);
  appState.message = "Modal debug: about modal close called.";
  updateStatus();
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
    appState.cellSize = Number(els.cellSizeSlider.value);
    applyCellSize();
    renderTape();
  });

  els.tapeViewport.addEventListener(
    "wheel",
    (event) => {
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

  bindModalActivate(els.btnAboutClose, closeAboutModal);
  els.aboutModal.addEventListener("click", (event) => {
    if (performance.now() - appState.modalOpenedAt < 350) {
      return;
    }
    if (event.target === els.aboutModal) closeAboutModal();
  });

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
    stopRunLoop();
    if (appState.acceptStates.includes(appState.currentState) || appState.rejectStates.includes(appState.currentState)) {
      stopTapeSnap();
      stopHeadPulse();
      appState.currentState = appState.startState;
      appState.head = { ...appState.startHead };
      syncTapeViewToHead();
      appState.steps = 0;
      appState.activeRuleId = null;
    }
    applyStepWithVisuals();
  });

  els.btnRun.addEventListener("click", () => {
    if (appState.acceptStates.includes(appState.currentState) || appState.rejectStates.includes(appState.currentState)) {
      stopTapeSnap();
      stopHeadPulse();
      appState.currentState = appState.startState;
      appState.head = { ...appState.startHead };
      syncTapeViewToHead();
      appState.steps = 0;
      appState.activeRuleId = null;
    }
    startRunLoop();
    renderAll();
  });

  els.btnPause.addEventListener("click", () => {
    stopRunLoop();
    appState.message = "Paused.";
    renderAll();
  });

  bindModalActivate(els.btnStateModalCancel, closeStateModal);
  bindModalActivate(els.btnStateModalDelete, () => {
    if (!appState.stateModal.originalName) {
      return;
    }
    deleteState(appState.stateModal.originalName);
  });
  bindModalActivate(els.btnStateModalSave, saveStateModal);
  els.stateModal.addEventListener("click", (event) => {
    if (performance.now() - appState.modalOpenedAt < 350) {
      return;
    }
    if (event.target === els.stateModal) {
      appState.message = "Modal debug: backdrop click close fired.";
      updateStatus();
      closeStateModal();
    }
  });
  els.stateNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveStateModal();
    }
  });
  els.stateIsAccept.addEventListener("change", () => {
    if (els.stateIsAccept.checked) {
      els.stateIsReject.checked = false;
    }
  });
  els.stateIsReject.addEventListener("change", () => {
    if (els.stateIsReject.checked) {
      els.stateIsAccept.checked = false;
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (appState.stateModal.open) closeStateModal();
      if (els.aboutModal.classList.contains("visible")) closeAboutModal();
      if (els.appMenu.classList.contains("is-open")) toggleMenu(false);
    }
  });

  window.addEventListener("resize", () => {
    autoFitCellSize();
    renderTape();
    renderDiagram();
  });
}

function seedExampleTape() {
  const bits = ["1", "0", "1", "1"];
  bits.forEach((b, i) => setSymbol(0, i, b));
}

function init() {
  document.body.setAttribute("data-theme", "dark");
  loadPreset("scan-right");
  autoFitCellSize();
  initEvents();
  renderAll();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Ignore registration failures so the app still runs normally.
      });
    });
  }
}

init();
