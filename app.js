const BLANK = "□";
const APP_VERSION = "V1.0.33";
const LEGACY_BLANK = "_";
const CORE_TAPE_SYMBOLS = [BLANK, "0", "1", "#"];
const DEFAULT_USER_ALPHABET = ["X", "!", "?", "A", "B", "C", "D", "E", "F", "G", "H", "I"];
const USER_ALPHABET_SLOT_COUNT = 12;
const TAPE_SYMBOL_CYCLE = [...CORE_TAPE_SYMBOLS];
const TAPE_LONG_PRESS_MS = 500;
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
const DEFAULT_EXECUTION_SPEED = 1;
const BASE_EXECUTION_DELAY_MS = 450;
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
const SUBSCRIPT_TO_DIGIT = Object.fromEntries(Object.entries(SUBSCRIPT_DIGITS).map(([digit, sub]) => [sub, digit]));
const IS_IOS_BROWSER = (() => {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
})();
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
  haltStates: [],
  states: ["s0", "sa", "sr"],
  steps: 0,
  running: false,
  runTimer: null,
  tapeViewCol: 0,
  tapeViewRow: 0,
  tapeDrag: null,
  tapeSnapRaf: null,
  tapeMoveDelayTimer: null,
  tapeSymbolPicker: { open: false, row: null, col: null, cell: null },
  alphabetModal: { open: false, originalSlots: null },
  alphabetSlots: [...DEFAULT_USER_ALPHABET],
  headWritePulseUntil: 0,
  headPulseAnchor: null,
  headPulseRaf: null,
  writeMorph: null,
  lastPlacedSymbol: "0",
  haltedStatePulse: false,
  haltedReason: null,
  workspaceSaveEnabled: false,
  activeRuleId: null,
  newlyAddedRuleId: null,
  clearExecutionHighlightOnInteraction: false,
  stateModal: { open: false, originalName: null },
  modalOpenedAt: 0,
  diagramModalOpen: false,
  workspaceControlsOpen: false,
  message: "Ready.",
  executionSpeed: DEFAULT_EXECUTION_SPEED,
  rules: [
    { id: crypto.randomUUID(), current: "s0", read: "1", write: "1", move: "R", next: "s0" },
    { id: crypto.randomUUID(), current: "s0", read: BLANK, write: BLANK, move: "S", next: "sa" }
  ]
};

const els = {
  tapeViewport: document.getElementById("tapeViewport"),
  tapeSymbolPicker: document.getElementById("tapeSymbolPicker"),
  tapeSymbolPickerGrid: document.getElementById("tapeSymbolPickerGrid"),
  cellSizeSlider: document.getElementById("cellSizeSlider"),
  executionSpeedSlider: document.getElementById("executionSpeedSlider"),
  executionSpeedLabel: document.getElementById("executionSpeedLabel"),
  btnWorkspaceControls: document.getElementById("btnWorkspaceControls"),
  btnWorkspaceControlsClose: document.getElementById("btnWorkspaceControlsClose"),
  workspaceControlsPopover: document.getElementById("workspaceControlsPopover"),
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
  btnSortRules: document.getElementById("btnSortRules"),
  stateStartBadge: document.getElementById("stateStartBadge"),
  stateAcceptBadge: document.getElementById("stateAcceptBadge"),
  stateRejectBadge: document.getElementById("stateRejectBadge"),
  stateHaltBadge: document.getElementById("stateHaltBadge"),
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
  stateRoleNormal: document.getElementById("stateRoleNormal"),
  stateRoleStart: document.getElementById("stateRoleStart"),
  stateRoleAccept: document.getElementById("stateRoleAccept"),
  stateRoleReject: document.getElementById("stateRoleReject"),
  stateRoleHalt: document.getElementById("stateRoleHalt"),
  btnStateModalCloseX: document.getElementById("btnStateModalCloseX"),
  btnStateModalDelete: document.getElementById("btnStateModalDelete"),
  btnStateModalCancel: document.getElementById("btnStateModalCancel"),
  btnStateModalSave: document.getElementById("btnStateModalSave"),
  btnHamburger: document.getElementById("btnHamburger"),
  btnMenuClose: document.getElementById("btnMenuClose"),
  appMenu: document.getElementById("appMenu"),
  menuExamplesToggle: document.getElementById("menuExamplesToggle"),
  menuExamplesList: document.getElementById("menuExamplesList"),
  menuAlphabet: document.getElementById("menuAlphabet"),
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
  alphabetModal: document.getElementById("alphabetModal"),
  alphabetModalGrid: document.getElementById("alphabetModalGrid"),
  alphabetModalFeedback: document.getElementById("alphabetModalFeedback"),
  btnAlphabetModalCloseX: document.getElementById("btnAlphabetModalCloseX"),
  btnAlphabetModalCancel: document.getElementById("btnAlphabetModalCancel"),
  btnAlphabetModalSave: document.getElementById("btnAlphabetModalSave"),
  btnAlphabetModalReset: document.getElementById("btnAlphabetModalReset")
  ,
  menuOpenFile: document.getElementById("menuOpenFile"),
  menuSaveFile: document.getElementById("menuSaveFile"),
  menuShare: document.getElementById("menuShare"),
  fileOpenInput: document.getElementById("fileOpenInput")
};
els.shareModal = document.getElementById("shareModal");
els.btnShareModalOk = document.getElementById("btnShareModalOk");
els.btnShareModalCloseX = document.getElementById("btnShareModalCloseX");
els.shareModalMessage = document.getElementById("shareModalMessage");

const DEFAULT_PROGRAMS = {
  "scan-right": {
    rows: 1,
    startState: "s0",
    acceptStates: [],
    rejectStates: [],
    haltStates: ["sh"],
    head: { row: 0, col: 0 },
    tapeRows: ["101101"],
    rules: [
      { id: crypto.randomUUID(), current: "s0", read: "0", write: "0", move: "R", next: "s0" },
      { id: crypto.randomUUID(), current: "s0", read: "1", write: "1", move: "R", next: "s0" },
      { id: crypto.randomUUID(), current: "s0", read: BLANK, write: BLANK, move: "S", next: "sh" }
    ]
  },
  "unary-increment": {
    rows: 1,
    startState: "s0",
    acceptStates: [],
    rejectStates: [],
    haltStates: ["sh"],
    head: { row: 0, col: 0 },
    tapeRows: ["1111"],
    rules: [
      { id: crypto.randomUUID(), current: "s0", read: "1", write: "1", move: "R", next: "s0" },
      { id: crypto.randomUUID(), current: "s0", read: BLANK, write: "1", move: "S", next: "sh" }
    ]
  },
  "parity-even-ones": {
    rows: 1,
    startState: "qe",
    acceptStates: ["sa"],
    rejectStates: ["sr"],
    haltStates: [],
    head: { row: 0, col: 0 },
    tapeRows: ["10101010"],
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
    haltStates: [],
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
    acceptStates: [],
    rejectStates: [],
    haltStates: ["sh"],
    head: { row: 0, col: 0 },
    tapeRows: ["10110", ""],
    rules: [
      { id: crypto.randomUUID(), current: "s0", read: "0", write: "0", move: "D", next: "sd0" },
      { id: crypto.randomUUID(), current: "s0", read: "1", write: "1", move: "D", next: "sd1" },
      { id: crypto.randomUUID(), current: "s0", read: BLANK, write: BLANK, move: "S", next: "sh" },
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

function normaliseAlphabetSlot(symbol) {
  const clean = normalizeSymbol(symbol);
  if (!clean || clean === BLANK) {
    return "";
  }
  if (CORE_TAPE_SYMBOLS.includes(clean)) {
    return "";
  }
  return clean[0];
}

function normaliseAlphabetSlots(slots = []) {
  const values = [];
  const seen = new Set(CORE_TAPE_SYMBOLS);

  for (let index = 0; index < USER_ALPHABET_SLOT_COUNT; index += 1) {
    const symbol = normaliseAlphabetSlot(slots[index] || "");
    if (!symbol || seen.has(symbol)) {
      values.push("");
      continue;
    }
    seen.add(symbol);
    values.push(symbol);
  }

  return values;
}

function getPickerAlphabetSlots() {
  return [...CORE_TAPE_SYMBOLS, ...appState.alphabetSlots];
}

function getRuleAlphabetChoices() {
  const values = [...CORE_TAPE_SYMBOLS];
  const seen = new Set(values);

  for (const symbol of appState.alphabetSlots) {
    const clean = normaliseAlphabetSlot(symbol);
    if (!clean || seen.has(clean)) {
      continue;
    }
    seen.add(clean);
    values.push(clean);
  }

  for (const rule of appState.rules) {
    for (const rawSymbol of [rule.read, rule.write]) {
      const clean = normalizeSymbol(rawSymbol);
      if (!clean || seen.has(clean)) {
        continue;
      }
      seen.add(clean);
      values.push(clean);
    }
  }

  for (const symbol of appState.tape.values()) {
    const clean = normalizeSymbol(symbol);
    if (!clean || seen.has(clean)) {
      continue;
    }
    seen.add(clean);
    values.push(clean);
  }

  return values;
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

function commitTapeSymbol(row, col, symbol, message = "") {
  clearHaltedStatePulse();
  const normalized = normalizeSymbol(symbol) || BLANK;
  setSymbol(row, col, normalized);
  if (!appState.running) {
    snapshotStartTape();
  }
  appState.lastPlacedSymbol = normalized;
  appState.message = message || `Set r${row}, c${col} to '${symbolForDisplay(normalized)}'.`;
  renderTape();
  updateStatus();
  persistWorkspace();
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
    haltStates: [...appState.haltStates],
    states: [...appState.states],
    steps: appState.steps,
    lastPlacedSymbol: appState.lastPlacedSymbol,
    alphabetSlots: [...appState.alphabetSlots],
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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function saveWorkspaceToFile() {
  try {
    const data = JSON.stringify(serialiseWorkspace(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const suggested = `chewring-${new Date().toISOString().slice(0, 10)}.json`;
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: suggested,
          types: [{ description: "Chewring workspace", accept: { "application/json": [".json"] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        appState.message = "Saved to file.";
        updateStatus();
        return;
      } catch (e) {
        // Fall back to download if the user cancels or API fails.
      }
    }
    downloadBlob(blob, suggested);
    appState.message = "Downloaded workspace file.";
    updateStatus();
  } catch (e) {
    appState.message = "Failed to save file.";
    updateStatus();
  }
}

async function openWorkspaceFromFilePicker() {
  try {
    if (window.showOpenFilePicker) {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: "Chewring workspace", accept: { "application/json": [".json"] } }]
      });
      const file = await handle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (hasMeaningfulSavedWorkspace(parsed) && applySavedWorkspace(parsed)) {
        appState.message = "Opened workspace file.";
        persistWorkspace();
        updateStatus();
      } else {
        appState.message = "Invalid workspace file.";
        updateStatus();
      }
      return;
    }
    // Fallback to hidden file input for browsers without File System Access API
    if (els.fileOpenInput) {
      els.fileOpenInput.value = "";
      els.fileOpenInput.click();
    }
  } catch (e) {
    // User cancelled or error - no action required
  }
}

function handleFileOpenInputChange(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      if (hasMeaningfulSavedWorkspace(parsed) && applySavedWorkspace(parsed)) {
        appState.message = "Opened workspace file.";
        persistWorkspace();
      } else {
        appState.message = "Invalid workspace file.";
      }
    } catch (e) {
      appState.message = "Failed to read file.";
    }
    updateStatus();
  };
  reader.readAsText(file);
}

/* LZ-String compress/decompress (compressToEncodedURIComponent / decompressFromEncodedURIComponent)
   Minimal inlined implementation adapted from LZ-String (MIT). */
var LZString = (function () {
  function f(e) {
    if (e == null) return "";
    return _compress(e, 6, function (a) {
      return keyStrUriSafe.charAt(a);
    });
  }

  function g(e) {
    if (e == null) return "";
    if (e == "") return null;
    return _decompress(e.length, 32, function (index) {
      return getBaseValue(keyStrUriSafe, e.charAt(index));
    });
  }

  var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";

  function getBaseValue(alphabet, character) {
    return alphabet.indexOf(character);
  }

  function _compress(uncompressed, bitsPerChar, getCharFromInt) {
    if (uncompressed == null) return "";
    var i,
      value,
      context_dictionary = {},
      context_dictionaryToCreate = {},
      context_c = "",
      context_wc = "",
      context_w = "",
      context_enlargeIn = 2, // Compensate for the first entry which should not count
      context_dictSize = 3,
      context_numBits = 2,
      context_data = [],
      context_data_val = 0,
      context_data_position = 0;

    for (i = 0; i < uncompressed.length; i += 1) {
      context_c = uncompressed.charAt(i);
      if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
        context_dictionary[context_c] = context_dictSize++;
        context_dictionaryToCreate[context_c] = true;
      }

      context_wc = context_w + context_c;
      if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
        context_w = context_wc;
      } else {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
          value = context_w.charCodeAt(0);
          for (var j = 0; j < context_numBits; j++) {
            context_data_val = (context_data_val << 1);
            if (context_data_position == bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
          }
          for (var j = 0; j < 8; j++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position == bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (var j = 0; j < context_numBits; j++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position == bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        // Add wc to the dictionary.
        context_dictionary[context_wc] = context_dictSize++;
        context_w = String(context_c);
      }
    }

    if (context_w !== "") {
      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
        value = context_w.charCodeAt(0);
        for (var j = 0; j < context_numBits; j++) {
          context_data_val = (context_data_val << 1);
          if (context_data_position == bitsPerChar - 1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position++;
          }
        }
        for (var j = 0; j < 8; j++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position == bitsPerChar - 1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w];
        for (var j = 0; j < context_numBits; j++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position == bitsPerChar - 1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }
      }
      context_enlargeIn--;
      if (context_enlargeIn == 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits++;
      }
    }

    // Mark the end of the stream
    value = 2;
    for (var j = 0; j < context_numBits; j++) {
      context_data_val = (context_data_val << 1) | (value & 1);
      if (context_data_position == bitsPerChar - 1) {
        context_data_position = 0;
        context_data.push(getCharFromInt(context_data_val));
        context_data_val = 0;
      } else {
        context_data_position++;
      }
      value = value >> 1;
    }

    // Flush
    while (true) {
      context_data_val = (context_data_val << 1);
      if (context_data_position == bitsPerChar - 1) {
        context_data.push(getCharFromInt(context_data_val));
        break;
      } else context_data_position++;
    }
    return context_data.join("");
  }

  function _decompress(length, resetValue, getNextValue) {
    var dictionary = [],
      enlargeIn = 4,
      dictSize = 4,
      numBits = 3,
      entry = "",
      result = [],
      i,
      w,
      bits, resb, maxpower, power,
      c,
      data = { val: getNextValue(0), position: resetValue, index: 1 };

    for (i = 0; i < 3; i += 1) dictionary[i] = i;

    bits = 0;
    maxpower = Math.pow(2, 2);
    power = 1;
    while (power != maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position == 0) {
        data.position = resetValue;
        data.val = getNextValue(data.index++);
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power <<= 1;
    }

    switch ((bits)) {
      case 0:
        bits = 0;
        maxpower = Math.pow(2, 8);
        power = 1;
        while (power != maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position == 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 1:
        bits = 0;
        maxpower = Math.pow(2, 16);
        power = 1;
        while (power != maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position == 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 2:
        return "";
    }
    dictionary[3] = c;
    w = c;
    result.push(c);
    while (true) {
      if (data.index > length) return "";

      bits = 0;
      maxpower = Math.pow(2, numBits);
      power = 1;
      while (power != maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position == 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }

      switch ((c = bits)) {
        case 0:
          bits = 0;
          maxpower = Math.pow(2, 8);
          power = 1;
          while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }

          dictionary[dictSize++] = String.fromCharCode(bits);
          c = dictSize - 1;
          enlargeIn--;
          break;
        case 1:
          bits = 0;
          maxpower = Math.pow(2, 16);
          power = 1;
          while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          dictionary[dictSize++] = String.fromCharCode(bits);
          c = dictSize - 1;
          enlargeIn--;
          break;
        case 2:
          return result.join("");
      }

      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }

      if (dictionary[c]) {
        entry = dictionary[c];
      } else {
        if (c === dictSize) {
          entry = w + w.charAt(0);
        } else {
          return null;
        }
      }
      result.push(entry);

      // Add w+entry[0] to the dictionary.
      dictionary[dictSize++] = w + entry.charAt(0);
      enlargeIn--;

      w = entry;
      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
    }
  }

  return { compressToEncodedURIComponent: f, decompressFromEncodedURIComponent: g };
})();

function generateShareableUrl() {
  try {
    // Build a share snapshot that avoids fragile Unicode glyphs (subscript digits,
    // uncommon symbols). Convert state names and symbols to ASCII-friendly forms
    // so the compressed token is robust across URL handling.
    const snapshot = serialiseWorkspace();

    // Reverse map for subscript digits to ascii digits
    const subscriptToDigit = Object.fromEntries(Object.entries(SUBSCRIPT_DIGITS).map(([k, v]) => [v, k]));
    function stateForShare(name) {
      if (!name) return "";
      let out = "";
      for (const ch of String(name)) {
        out += subscriptToDigit[ch] ?? ch;
      }
      return out;
    }

    const shareSnapshot = { ...snapshot };
    shareSnapshot.states = (snapshot.states || []).map(stateForShare);
    shareSnapshot.startState = stateForShare(snapshot.startState);
    shareSnapshot.currentState = stateForShare(snapshot.currentState);
    shareSnapshot.acceptStates = (snapshot.acceptStates || []).map(stateForShare);
    shareSnapshot.rejectStates = (snapshot.rejectStates || []).map(stateForShare);
    shareSnapshot.haltStates = (snapshot.haltStates || []).map(stateForShare);
    shareSnapshot.rules = (snapshot.rules || []).map((r) => ({
      current: stateForShare(r.current),
      read: symbolForTape(r.read),
      write: symbolForTape(r.write),
      move: (r.move || "S").trim().toUpperCase(),
      next: stateForShare(r.next)
    }));
    shareSnapshot.alphabetSlots = normaliseAlphabetSlots(snapshot.alphabetSlots || DEFAULT_USER_ALPHABET);
    shareSnapshot.lastPlacedSymbol = symbolForTape(snapshot.lastPlacedSymbol || "0");

    const payload = JSON.stringify(shareSnapshot);
    const encoded = LZString.compressToEncodedURIComponent(payload);
    const url = `${location.origin}${location.pathname}#share=${encoded}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        appState.message = "Share URL copied to clipboard.";
        updateStatus();
        openShareModal("Share URL copied to clipboard.");
      }, () => {
        window.prompt("Copy shareable URL", url);
        openShareModal("Share URL shown — copy it manually.");
      });
    } else {
      window.prompt("Copy shareable URL", url);
      openShareModal("Share URL shown — copy it manually.");
    }
  } catch (e) {
    appState.message = "Failed to generate share URL.";
    updateStatus();
  }
}

function readWorkspaceFromUrl() {
  try {
    const params = new URLSearchParams(location.search);
    let encoded = null;
    if (params.has("share")) {
      encoded = params.get("share");
    } else if (location.hash && location.hash.startsWith("#share=")) {
      encoded = location.hash.slice(7);
    }
    if (!encoded) return null;
    let json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) {
      try {
        // If the share token was placed in the query string it may have been
        // decoded by URLSearchParams (eg. plus -> space). Try re-encoding and
        // decompressing as a fallback.
        json = LZString.decompressFromEncodedURIComponent(encodeURIComponent(encoded));
      } catch (e) {
        json = null;
      }
    }
    if (!json) return null;
    const parsed = JSON.parse(json);
    return parsed;
  } catch (e) {
    return null;
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
  appState.haltStates = uniqueStateList((snapshot.haltStates || []).map((state) => formatStateName(state))).filter(
    (state) => !appState.acceptStates.includes(state) && !appState.rejectStates.includes(state)
  );
  appState.states = uniqueStateList((snapshot.states || []).map((state) => formatStateName(state)));
  appState.steps = 0;
  appState.lastPlacedSymbol = normalizeSymbol(snapshot.lastPlacedSymbol || "0") || "0";
  appState.alphabetSlots = normaliseAlphabetSlots(snapshot.alphabetSlots || DEFAULT_USER_ALPHABET);
  appState.activeRuleId = null;
  appState.message = "Loaded previous local work.";

  const rules = Array.isArray(snapshot.rules) ? snapshot.rules : [];
  appState.rules = rules.map((rule) => {
    const current = formatStateName(rule.current || "");

    let read = normalizeSymbol(rule.read);
    if (!read || read === BLANK) {
      read = BLANK;
    } else {
      read = String(read)[0];
    }

    let write = normalizeSymbol(rule.write);
    if (!write || write === BLANK) {
      write = BLANK;
    } else {
      write = String(write)[0];
    }

    const moveRaw = String(rule.move || "S").trim().toUpperCase();
    const validMoves = new Set(["L", "R", "U", "D", "S"]);
    const move = validMoves.has(moveRaw) ? moveRaw : "S";

    const next = formatStateName(rule.next || "");

    return {
      id: crypto.randomUUID(),
      current,
      read,
      write,
      move,
      next
    };
  });

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
  appState.haltStates = [];
  appState.states = [];
  appState.steps = 0;
  appState.activeRuleId = null;
  appState.alphabetSlots = [...DEFAULT_USER_ALPHABET];
  appState.rules = [];
  appState.message = "Started fresh workspace.";
  autoFitCellSize();
  syncTapeViewToHead();
  renderAll();
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
  if (!applySavedWorkspace(saved)) {
    startFreshWorkspace();
  }
  appState.workspaceSaveEnabled = true;
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

function isTouchViewport() {
  const hasTouchPoints = (navigator.maxTouchPoints || 0) > 0;
  const hasCoarsePrimaryPointer = window.matchMedia("(pointer: coarse)").matches;
  const hasCoarseAnyPointer = window.matchMedia("(any-pointer: coarse)").matches;
  const hasNoPrimaryHover = window.matchMedia("(hover: none)").matches;
  return hasTouchPoints || hasCoarsePrimaryPointer || hasCoarseAnyPointer || hasNoPrimaryHover;
}

function updateTouchDeviceMode() {
  const isTouchMode = isTouchViewport();
  document.body.classList.toggle("touch-device", isTouchMode);
}

function resnapTapeViewAfterViewportChange() {
  if (!isTouchViewport() || appState.tapeDrag) {
    return;
  }
  stopTapeSnap();
  clearTapeMoveDelay();
  syncTapeViewToHead();
}

function scheduleInitialTouchViewportResnap() {
  if (!isTouchViewport()) {
    return;
  }

  const applySnapPass = () => {
    autoFitCellSize();
    resnapTapeViewAfterViewportChange();
    renderTape();
    updateStatus();
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      applySnapPass();
      setTimeout(applySnapPass, 120);
    });
  });
}

function closeWorkspaceControlsPopover() {
  if (!appState.workspaceControlsOpen || !els.workspaceControlsPopover) {
    return;
  }
  appState.workspaceControlsOpen = false;
  els.workspaceControlsPopover.classList.remove("open-below");
  els.workspaceControlsPopover.hidden = true;
  if (els.btnWorkspaceControls) {
    els.btnWorkspaceControls.setAttribute("aria-expanded", "false");
  }
}

function updateWorkspaceControlsPopoverPlacement() {
  if (!els.workspaceControlsPopover || !els.btnWorkspaceControls || els.workspaceControlsPopover.hidden) {
    return;
  }

  const popover = els.workspaceControlsPopover;
  const card = popover.querySelector(".workspace-controls-card");
  if (!card) {
    return;
  }

  const buttonRect = els.btnWorkspaceControls.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const edgeGap = 10;
  const availableAbove = Math.max(0, buttonRect.top - edgeGap);
  const availableBelow = Math.max(0, window.innerHeight - buttonRect.bottom - edgeGap);
  const shouldOpenBelow = cardRect.height > availableAbove && availableBelow > availableAbove;

  popover.classList.toggle("open-below", shouldOpenBelow);
}

function openWorkspaceControlsPopover() {
  if (appState.workspaceControlsOpen || !els.workspaceControlsPopover) {
    return;
  }
  appState.workspaceControlsOpen = true;
  els.workspaceControlsPopover.hidden = false;
  if (els.btnWorkspaceControls) {
    els.btnWorkspaceControls.setAttribute("aria-expanded", "true");
  }
  updateWorkspaceControlsPopoverPlacement();
  requestAnimationFrame(updateWorkspaceControlsPopoverPlacement);
}

function toggleWorkspaceControlsPopover() {
  if (appState.workspaceControlsOpen) {
    closeWorkspaceControlsPopover();
    return;
  }
  openWorkspaceControlsPopover();
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
    ...appState.haltStates,
    ...appState.rules.flatMap((rule) => [rule.current, rule.next])
  ]);
}

function getTerminalStateType(stateName) {
  if (appState.acceptStates.includes(stateName)) {
    return "accept";
  }
  if (appState.rejectStates.includes(stateName)) {
    return "reject";
  }
  if (appState.haltStates.includes(stateName)) {
    return "halt";
  }
  return "";
}

function isTerminalState(stateName) {
  return Boolean(getTerminalStateType(stateName));
}

function renderDiagramStateLabel(textElement, stateName) {
  const text = String(stateName || "");
  const parts = text.match(/^(.*?)([₀₁₂₃₄₅₆₇₈₉]+)$/);
  if (!parts) {
    textElement.textContent = text;
    return;
  }

  const baseText = parts[1] || "";
  const subscriptText = parts[2]
    .split("")
    .map((char) => SUBSCRIPT_TO_DIGIT[char] || char)
    .join("");

  textElement.textContent = "";
  textElement.append(baseText);
  const subscript = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
  subscript.setAttribute("class", "state-subscript");
  subscript.textContent = subscriptText;
  textElement.appendChild(subscript);
}

function syncStateRegistry() {
  appState.states = getAvailableStates();
}

function syncMachineConfigInputs() {
  const startLabel = appState.startState || "(none)";
  const acceptLabel = appState.acceptStates.length ? appState.acceptStates.join(", ") : "(none)";
  const rejectLabel = appState.rejectStates.length ? appState.rejectStates.join(", ") : "(none)";
  const haltLabel = appState.haltStates.length ? appState.haltStates.join(", ") : "(none)";
  
  els.stateStartBadge.textContent = `Start: ${startLabel}`;
  els.stateStartBadge.hidden = !appState.startState;
  
  els.stateAcceptBadge.textContent = `Accept: ${acceptLabel}`;
  els.stateAcceptBadge.hidden = appState.acceptStates.length === 0;
  
  els.stateRejectBadge.textContent = `Reject: ${rejectLabel}`;
  els.stateRejectBadge.hidden = appState.rejectStates.length === 0;
  
  if (els.stateHaltBadge) {
    els.stateHaltBadge.textContent = `Halt: ${haltLabel}`;
    els.stateHaltBadge.hidden = appState.haltStates.length === 0;
  }
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
  appState.haltStates = appState.haltStates.map((state) => (state === fromName ? toName : state));
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
  const selectedRole = (() => {
    if (!existingStateName) return "normal";
    if (appState.startState === existingStateName) return "start";
    if (appState.acceptStates.includes(existingStateName)) return "accept";
    if (appState.rejectStates.includes(existingStateName)) return "reject";
    if (appState.haltStates.includes(existingStateName)) return "halt";
    return "normal";
  })();
  if (els.stateRoleNormal) els.stateRoleNormal.checked = selectedRole === "normal";
  if (els.stateRoleStart) els.stateRoleStart.checked = selectedRole === "start";
  if (els.stateRoleAccept) els.stateRoleAccept.checked = selectedRole === "accept";
  if (els.stateRoleReject) els.stateRoleReject.checked = selectedRole === "reject";
  if (els.stateRoleHalt) els.stateRoleHalt.checked = selectedRole === "halt";
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

function getSelectedStateRole() {
  if (els.stateRoleStart?.checked) return "start";
  if (els.stateRoleAccept?.checked) return "accept";
  if (els.stateRoleReject?.checked) return "reject";
  if (els.stateRoleHalt?.checked) return "halt";
  return "normal";
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
  appState.haltStates = appState.haltStates.filter((state) => state !== stateName);

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
  appState.haltStates = [];
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
  const selectedRole = getSelectedStateRole();

  if (!proposedName) {
    appState.message = "State name is required.";
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

  const currentStartState = formatStateName(appState.startState || "");
  appState.startState = currentStartState;

  if (selectedRole === "start") {
    appState.startState = proposedName;
  } else if (currentStartState === proposedName) {
    // Keep exactly one start state by choosing another existing state when
    // the current start state is demoted to a different role.
    const fallbackState = getAvailableStates().find((state) => state !== proposedName) || "";
    appState.startState = fallbackState;
    if (appState.currentState === proposedName) {
      appState.currentState = fallbackState;
    }
  }

  setStateRoleMembership(proposedName, selectedRole === "accept", "acceptStates");
  setStateRoleMembership(proposedName, selectedRole === "reject", "rejectStates");
  setStateRoleMembership(proposedName, selectedRole === "halt", "haltStates");

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
  appState.headWritePulseUntil = performance.now() + getHeadWritePulseDuration();
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
    until: performance.now() + getCellWriteMorphDuration()
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
  appState.haltStates = (preset.haltStates || []).map((state) => formatStateName(state));
  appState.head = { ...preset.head };
  appState.startHead = { ...preset.head };
  appState.alphabetSlots = [...DEFAULT_USER_ALPHABET];
  syncTapeViewToHead();
  appState.steps = 0;
  appState.activeRuleId = null;
  appState.rules = normalizeRuleStateNames(cloneRules(preset.rules));
  appState.states = uniqueStateList([
    appState.startState,
    ...appState.acceptStates,
    ...appState.rejectStates,
    ...appState.haltStates,
    ...appState.rules.flatMap((rule) => [rule.current, rule.next])
  ]);

  loadTapeRows(preset.tapeRows);
  snapshotStartTape();

  syncMachineConfigInputs();

  const labels = { "scan-right": "Scan Right Until Blank", "unary-increment": "Unary Increment", "parity-even-ones": "Parity Check (Even 1s)", "binary-invert": "Binary Invert", "two-row-copy": "Two-Row Copy Demo" };
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
  appState.haltStates = appState.haltStates.map((state) => formatStateName(state));
  appState.acceptStates = uniqueStateList(appState.acceptStates);
  appState.rejectStates = uniqueStateList(appState.rejectStates).filter((state) => !appState.acceptStates.includes(state));
  appState.haltStates = uniqueStateList(appState.haltStates).filter((state) => !appState.acceptStates.includes(state) && !appState.rejectStates.includes(state));
  if (appState.startState) {
    appState.acceptStates = appState.acceptStates.filter((state) => state !== appState.startState);
    appState.rejectStates = appState.rejectStates.filter((state) => state !== appState.startState);
    appState.haltStates = appState.haltStates.filter((state) => state !== appState.startState);
  }
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
    const progress = 1 - remaining / getHeadWritePulseDuration();
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
  commitTapeSymbol(row, col, next, `Set r${row}, c${col} to '${symbolForDisplay(next)}'.`);
}

function closeTapeSymbolPicker() {
  if (!appState.tapeSymbolPicker.open) {
    return;
  }
  appState.tapeSymbolPicker = { open: false, row: null, col: null, cell: null };
  if (!els.tapeSymbolPicker) {
    return;
  }
  els.tapeSymbolPicker.hidden = true;
  els.tapeSymbolPicker.classList.remove("is-open");
  els.tapeSymbolPicker.style.left = "";
  els.tapeSymbolPicker.style.top = "";
  els.tapeSymbolPicker.style.visibility = "";
}

function renderTapeSymbolPicker(row, col) {
  if (!els.tapeSymbolPickerGrid) {
    return;
  }
  els.tapeSymbolPickerGrid.innerHTML = "";

  for (const symbol of getPickerAlphabetSlots()) {
    const choice = document.createElement("button");
    choice.type = "button";
    choice.className = "tape-symbol-choice";
    choice.dataset.symbol = symbol;
    choice.textContent = symbol ? symbolForDisplay(symbol) : "";
    choice.title = symbol ? (symbol === BLANK ? "Blank" : symbol) : "Unused slot";
    choice.setAttribute("aria-label", symbol ? (symbol === BLANK ? "Select blank" : `Select ${symbol}`) : "Unused slot");
    if (!symbol) {
      choice.disabled = true;
      choice.classList.add("is-empty-slot");
    }
    const chooseSymbol = () => {
      commitTapeSymbol(row, col, symbol);
      closeTapeSymbolPicker();
    };
    choice.addEventListener("click", chooseSymbol);
    choice.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      chooseSymbol();
    });
    els.tapeSymbolPickerGrid.appendChild(choice);
  }
}

function positionTapeSymbolPicker(cell, trigger = {}) {
  if (!els.tapeSymbolPicker || !cell) {
    return;
  }
  const rect = cell.getBoundingClientRect();
  const pickerRect = els.tapeSymbolPicker.getBoundingClientRect();
  const anchorX = Number.isFinite(trigger.clientX) ? trigger.clientX : rect.left + rect.width / 2;
  const anchorY = Number.isFinite(trigger.clientY) ? trigger.clientY : rect.bottom + 8;
  const padding = 12;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let left = anchorX - pickerRect.width / 2;
  let top = anchorY + 10;

  left = Math.max(padding, Math.min(left, viewportWidth - pickerRect.width - padding));
  top = Math.max(padding, Math.min(top, viewportHeight - pickerRect.height - padding));

  els.tapeSymbolPicker.style.left = `${Math.round(left)}px`;
  els.tapeSymbolPicker.style.top = `${Math.round(top)}px`;
}

function openTapeSymbolPicker(cell, trigger = {}) {
  if (!cell || appState.running || !els.tapeSymbolPicker) {
    return;
  }

  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  appState.tapeSymbolPicker = { open: true, row, col, cell };

  renderTapeSymbolPicker(row, col);
  els.tapeSymbolPicker.hidden = false;
  els.tapeSymbolPicker.classList.add("is-open");
  els.tapeSymbolPicker.style.visibility = "hidden";
  positionTapeSymbolPicker(cell, trigger);
  els.tapeSymbolPicker.style.visibility = "visible";

  requestAnimationFrame(() => {
    const selectedSymbol = symbolForDisplay(appState.lastPlacedSymbol);
    const buttons = Array.from(els.tapeSymbolPickerGrid?.querySelectorAll("button") || []);
    const targetButton = buttons.find((button) => button.dataset.symbol === selectedSymbol) || buttons[0];
    targetButton?.focus();
  });
}

function clearTapeLongPressTimer(drag = appState.tapeDrag) {
  if (!drag || !drag.longPressTimer) {
    return;
  }
  clearTimeout(drag.longPressTimer);
  drag.longPressTimer = null;
}

function setAlphabetModalFeedback(message = "") {
  if (!els.alphabetModalFeedback) {
    return;
  }
  els.alphabetModalFeedback.textContent = message;
  els.alphabetModalFeedback.hidden = !message;
}

function renderAlphabetModal() {
  if (!els.alphabetModalGrid) {
    return;
  }

  els.alphabetModalGrid.innerHTML = "";

  CORE_TAPE_SYMBOLS.forEach((symbol, index) => {
    const label = document.createElement("div");
    label.className = "alphabet-core-slot alphabet-core-fixed";
    label.innerHTML = `<strong>${symbol}</strong>`;
    label.title = "Not editable";
    els.alphabetModalGrid.appendChild(label);
  });

  appState.alphabetSlots.forEach((value, index) => {
    const wrap = document.createElement("label");
    wrap.className = "alphabet-user-slot";
    wrap.title = "Click to edit";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 1;
    input.autocomplete = "off";
    input.dataset.slotIndex = String(index);
    input.value = value || "";
    input.placeholder = "-";
    input.title = "Click to edit";
    wrap.appendChild(input);
    els.alphabetModalGrid.appendChild(wrap);
  });
}

function readAlphabetModalSlots() {
  if (!els.alphabetModalGrid) {
    return [...appState.alphabetSlots];
  }

  const inputs = Array.from(els.alphabetModalGrid.querySelectorAll('input[data-slot-index]'));
  const nextSlots = Array(USER_ALPHABET_SLOT_COUNT).fill("");

  for (const input of inputs) {
    const index = Number(input.dataset.slotIndex);
    if (!Number.isFinite(index) || index < 0 || index >= USER_ALPHABET_SLOT_COUNT) {
      continue;
    }
    nextSlots[index] = normalizeSymbol(input.value).trim().slice(0, 1);
  }

  return nextSlots;
}

function checkAlphabetSlots(previousSlots = [], nextSlots = []) {
  // Compare previous and next slot arrays and return { ok, message, conflicts }
  // Prefer to mark as conflicting the slots that the user changed in this save.
  const cleaned = Array(USER_ALPHABET_SLOT_COUNT).fill("");
  for (let i = 0; i < USER_ALPHABET_SLOT_COUNT; i += 1) {
    cleaned[i] = normalizeSymbol(nextSlots[i] || "").trim().slice(0, 1) || "";
  }

  // Check for reserved core symbol usage first
  for (let i = 0; i < cleaned.length; i += 1) {
    const sym = cleaned[i];
    if (!sym) continue;
    if (CORE_TAPE_SYMBOLS.includes(sym)) {
      return { ok: false, message: `Symbol ${sym} is reserved and cannot be used.`, conflicts: [i] };
    }
  }

  // Build occurrences map
  const occ = new Map();
  for (let i = 0; i < cleaned.length; i += 1) {
    const sym = cleaned[i];
    if (!sym) continue;
    if (!occ.has(sym)) occ.set(sym, []);
    occ.get(sym).push(i);
  }

  // Find duplicates and prefer indices the user edited
  for (const [sym, indices] of occ.entries()) {
    if (indices.length <= 1) continue;
    const edited = indices.filter((i) => (String(previousSlots[i] || "") !== String(nextSlots[i] || "")));
    if (edited.length > 0) {
      return { ok: false, message: `Symbol ${sym} already exists.`, conflicts: edited };
    }
    // fallback: mark the later indices as conflicting (leave the first occurrence)
    const fallback = indices.slice(1);
    return { ok: false, message: `Symbol ${sym} already exists.`, conflicts: fallback };
  }

  return { ok: true, message: "", conflicts: [] };
}

function remapWorkspaceSymbols(remapEntries) {
  if (!(remapEntries instanceof Map) || remapEntries.size === 0) {
    return;
  }

  const remapSymbol = (symbol) => {
    const clean = normalizeSymbol(symbol);
    if (!clean) {
      return clean;
    }
    return remapEntries.has(clean) ? remapEntries.get(clean) : clean;
  };

  const remapTapeMap = (map) => {
    const nextMap = new Map();
    for (const [key, symbol] of map.entries()) {
      const remapped = remapSymbol(symbol);
      if (!remapped || remapped === BLANK) {
        continue;
      }
      nextMap.set(key, remapped);
    }
    return nextMap;
  };

  appState.tape = remapTapeMap(appState.tape);
  appState.startTape = remapTapeMap(appState.startTape);
  appState.rules = appState.rules.map((rule) => ({
    ...rule,
    read: remapSymbol(rule.read) || BLANK,
    write: remapSymbol(rule.write) || BLANK
  }));
  appState.lastPlacedSymbol = remapSymbol(appState.lastPlacedSymbol) || BLANK;

  if (appState.writeMorph) {
    appState.writeMorph.fromSymbol = remapSymbol(appState.writeMorph.fromSymbol);
    appState.writeMorph.toSymbol = remapSymbol(appState.writeMorph.toSymbol);
  }
}

function openAlphabetModal() {
  clearHaltedStatePulse();
  closeTapeSymbolPicker();
  appState.alphabetModal.open = true;
  appState.modalOpenedAt = performance.now();
  setAlphabetModalFeedback("");
  renderAlphabetModal();

  // Create a body-fixed overlay and move the modal content into it (same pattern as About/Help)
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;";
  const content = els.alphabetModal?.firstElementChild;
  if (content) overlay.appendChild(content);
  overlay.addEventListener("click", (event) => {
    if (performance.now() - appState.modalOpenedAt < 350) return;
    if (event.target === overlay) closeAlphabetModal();
  });
  document.body.appendChild(overlay);
  appState.alphabetModalOverlay = overlay;
  // focus the first input after overlay is mounted
  requestAnimationFrame(() => {
    overlay.querySelector('input[data-slot-index="0"]')?.focus({ preventScroll: true });
  });
}

function closeAlphabetModal() {
  appState.alphabetModal.open = false;
  setAlphabetModalFeedback("");
  if (appState.alphabetModalOverlay) {
    const content = appState.alphabetModalOverlay.firstElementChild;
    if (content) els.alphabetModal.appendChild(content);
    appState.alphabetModalOverlay.remove();
    appState.alphabetModalOverlay = null;
  }
}

function resetAlphabetModal() {
  if (!els.alphabetModalGrid) {
    return;
  }
  const inputs = Array.from(els.alphabetModalGrid.querySelectorAll('input[data-slot-index]'));
  inputs.forEach((input, index) => {
    input.value = DEFAULT_USER_ALPHABET[index] || "";
  });
  setAlphabetModalFeedback("Reset to default alphabet slots.");
}

function saveAlphabetModal() {
  const previousSlots = [...appState.alphabetSlots];
  const nextSlots = readAlphabetModalSlots();
  const validation = checkAlphabetSlots(previousSlots, nextSlots);
  if (!validation.ok) {
    // Show generic validation message (no slot numbers) and revert only the
    // conflicting input(s) back to their previous values so the user's other
    // edits are preserved.
    setAlphabetModalFeedback(validation.message);
    // Re-render the modal (restores saved values), then re-apply any non-conflicting
    // edits so the user's other changes are preserved. Focus the first conflicting input.
    renderAlphabetModal();
    if (els.alphabetModalGrid && Array.isArray(validation.conflicts)) {
      const inputs = Array.from(els.alphabetModalGrid.querySelectorAll('input[data-slot-index]'));
      const conflictSet = new Set(validation.conflicts.map((n) => Number(n)));
      let focused = false;
      for (let idx = 0; idx < USER_ALPHABET_SLOT_COUNT; idx += 1) {
        const input = inputs.find((i) => Number(i.dataset.slotIndex) === idx);
        if (!input) continue;
        if (conflictSet.has(idx)) {
          // leave restored value (previousSlots[idx]) and focus the first conflict
          if (!focused) {
            input.focus({ preventScroll: true });
            focused = true;
          }
        } else {
          // re-apply the user's attempted change for non-conflicting slots
          input.value = nextSlots[idx] || "";
        }
      }
    }
    return;
  }

  const remapEntries = new Map();
  for (let index = 0; index < USER_ALPHABET_SLOT_COUNT; index += 1) {
    const previousSymbol = normaliseAlphabetSlot(previousSlots[index] || "");
    const nextSymbol = normaliseAlphabetSlot(nextSlots[index] || "");
    if (previousSymbol && previousSymbol !== nextSymbol) {
      remapEntries.set(previousSymbol, nextSymbol || BLANK);
    }
  }

  remapWorkspaceSymbols(remapEntries);

  appState.alphabetSlots = normaliseAlphabetSlots(nextSlots);
  appState.message = remapEntries.size > 0 ? "Alphabet updated and existing symbols were remapped." : "Alphabet updated.";
  closeAlphabetModal();
  renderAll();
  persistWorkspace();
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
}

function initTapeInteractions() {
  const viewport = els.tapeViewport;

  viewport.addEventListener("contextmenu", (event) => {
    const cell = event.target.closest(".tape-cell");
    if (!cell || appState.running) {
      return;
    }
    event.preventDefault();
    openTapeSymbolPicker(cell, event);
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
    consumeRuleHighlightsOnInteraction();
    const cell = event.target.closest(".tape-cell");
    stopTapeSnap();
    closeTapeSymbolPicker();
    appState.tapeDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCol: appState.tapeViewCol,
      startRow: Number.isFinite(appState.tapeViewRow) ? appState.tapeViewRow : appState.head.row,
      moved: false,
      pressedCell: cell || null,
      pointerType: event.pointerType,
      longPressTimer: null,
      longPressActivated: false
    };
    viewport.classList.add("dragging");
    if (cell && (event.pointerType === "touch" || event.pointerType === "pen")) {
      const pointerId = event.pointerId;
      const pressedCell = cell;
      const pressX = event.clientX;
      const pressY = event.clientY;
      appState.tapeDrag.longPressTimer = window.setTimeout(() => {
        const drag = appState.tapeDrag;
        if (!drag || drag.pointerId !== pointerId || drag.moved || drag.longPressActivated || appState.running) {
          return;
        }
        drag.longPressActivated = true;
        openTapeSymbolPicker(pressedCell, { clientX: pressX, clientY: pressY });
        try {
          if (viewport.hasPointerCapture(pointerId)) {
            viewport.releasePointerCapture(pointerId);
          }
        } catch {
          // Ignore capture release failures on constrained touch stacks.
        }
        viewport.classList.remove("dragging");
      }, TAPE_LONG_PRESS_MS);
    }
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
    if (drag.longPressActivated) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.moved) {
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        drag.moved = true;
        clearTapeLongPressTimer(drag);
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
    clearTapeLongPressTimer(drag);

    if (drag.longPressActivated) {
      appState.tapeDrag = null;
      return;
    }

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
    tr.dataset.ruleId = rule.id;
    if (rule.id === appState.newlyAddedRuleId) {
      tr.classList.add("active-rule");
    }
    if (rule.id === appState.activeRuleId) {
      tr.classList.add("executing-rule");
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

  if (appState.activeRuleId || appState.newlyAddedRuleId) {
    scrollActiveRuleIntoView();
  }
}

function clearNewRuleHighlight() {
  const highlightedRuleId = appState.newlyAddedRuleId;
  if (!highlightedRuleId) {
    return;
  }

  appState.newlyAddedRuleId = null;
  if (highlightedRuleId === appState.activeRuleId) {
    return;
  }

  const row = Array.from(els.rulesTableBody?.querySelectorAll("tr") || [])
    .find((candidate) => candidate.dataset.ruleId === highlightedRuleId);
  if (row) {
    row.classList.remove("active-rule");
  }
}

function scheduleExecutionHighlightClearOnInteraction() {
  if (!appState.activeRuleId) {
    return;
  }

  // Defer arming to avoid clearing on the same click that triggered the halt.
  setTimeout(() => {
    if (!appState.running && appState.activeRuleId) {
      appState.clearExecutionHighlightOnInteraction = true;
    }
  }, 0);
}

function clearExecutionRuleHighlight() {
  const highlightedRuleId = appState.activeRuleId;
  appState.clearExecutionHighlightOnInteraction = false;
  if (!highlightedRuleId) {
    return;
  }

  appState.activeRuleId = null;

  const row = Array.from(els.rulesTableBody?.querySelectorAll("tr") || [])
    .find((candidate) => candidate.dataset.ruleId === highlightedRuleId);
  if (row) {
    row.classList.remove("executing-rule");
  }

  document.querySelectorAll(".active-transition-badge").forEach((badge) => {
    badge.classList.remove("active-transition-badge");
  });

  persistWorkspace();
}

function consumeExecutionHighlightClearOnInteraction() {
  if (!appState.clearExecutionHighlightOnInteraction) {
    return;
  }
  clearExecutionRuleHighlight();
}

function consumeRuleHighlightsOnInteraction() {
  clearNewRuleHighlight();
  consumeExecutionHighlightClearOnInteraction();
}

function scrollActiveRuleIntoView() {
  const wrap = els.rulesTableWrap;
  const targetRuleId = appState.activeRuleId || appState.newlyAddedRuleId;
  if (!wrap || !targetRuleId) {
    return;
  }

  const activeRow = Array.from(wrap.querySelectorAll("tbody tr"))
    .find((row) => row.dataset.ruleId === targetRuleId);
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
  return getRuleAlphabetChoices();
}

function stateLabelForRuleSelect(value) {
  const text = String(value || "");
  if (!IS_IOS_BROWSER || !text) {
    return text;
  }
  return text
    .split("")
    .map((char) => SUBSCRIPT_TO_DIGIT[char] || char)
    .join("");
}

function ruleStateSelectCell(rule, field, options) {
  const td = document.createElement("td");
  const select = document.createElement("select");
  const values = options.includes(rule[field]) ? options : [...options, rule[field]].filter(Boolean);

  for (const option of values) {
    const el = document.createElement("option");
    el.value = option;
    el.textContent = stateLabelForRuleSelect(option);
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
  const currentTerminalType = getTerminalStateType(appState.currentState);
  if (currentTerminalType === "accept") {
    appState.message = `Machine already accepted in state ${appState.currentState}.`;
    appState.haltedStatePulse = true;
    appState.haltedReason = "terminal";
    appState.running = false;
    scheduleExecutionHighlightClearOnInteraction();
    return;
  }

  if (currentTerminalType === "reject") {
    appState.message = `Machine already rejected in state ${appState.currentState}.`;
    appState.haltedStatePulse = true;
    appState.haltedReason = "terminal";
    appState.running = false;
    scheduleExecutionHighlightClearOnInteraction();
    return;
  }

  if (currentTerminalType === "halt") {
    appState.message = `Machine halted in state ${appState.currentState}.`;
    appState.haltedStatePulse = true;
    appState.haltedReason = "terminal";
    appState.running = false;
    scheduleExecutionHighlightClearOnInteraction();
    return;
  }

  const rule = findMatchingRule();
  if (!rule) {
    appState.message = `No rule for state ${appState.currentState} and symbol ${getSymbol(appState.head.row, appState.head.col)}. Halt.`;
    appState.running = false;
    appState.haltedReason = "no-rule";
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
  appState.haltedReason = null;
  if (wroteChanged) {
    scheduleTapeMoveToHead(getMoveAfterWriteDelay(), appState.running ? 180 : 200, { includeRow: false });
  } else {
    scheduleTapeMoveToHead(0, appState.running ? 180 : 200, { includeRow: false });
  }

  const nextTerminalType = getTerminalStateType(appState.currentState);
  if (nextTerminalType === "accept") {
    appState.message = `Accepted in ${appState.currentState} after ${appState.steps} steps.`;
    appState.haltedStatePulse = true;
    appState.haltedReason = "terminal";
    appState.running = false;
    scheduleExecutionHighlightClearOnInteraction();
    return;
  }

  if (nextTerminalType === "reject") {
    appState.message = `Rejected in ${appState.currentState} after ${appState.steps} steps.`;
    appState.haltedStatePulse = true;
    appState.haltedReason = "terminal";
    appState.running = false;
    scheduleExecutionHighlightClearOnInteraction();
    return;
  }

  if (nextTerminalType === "halt") {
    appState.message = `Halted in ${appState.currentState} after ${appState.steps} steps.`;
    appState.haltedStatePulse = true;
    appState.haltedReason = "terminal";
    appState.running = false;
    scheduleExecutionHighlightClearOnInteraction();
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

function getExecutionDelay() {
  return Math.round(BASE_EXECUTION_DELAY_MS / appState.executionSpeed);
}

function getHeadWritePulseDuration() {
  return Math.round(HEAD_WRITE_PULSE_MS / appState.executionSpeed);
}

function getCellWriteMorphDuration() {
  return Math.round(CELL_WRITE_MORPH_MS / appState.executionSpeed);
}

function getMoveAfterWriteDelay() {
  return Math.round(MOVE_AFTER_WRITE_DELAY_MS / appState.executionSpeed);
}

function startRunLoop() {
  if (appState.running) {
    return;
  }
  appState.running = true;
  appState.runTimer = setInterval(runLoopTick, getExecutionDelay());
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
  appState.haltedReason = null;
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
  appState.haltedReason = null;
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

  const edgeLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  edgeLayer.setAttribute("class", "diagram-edge-layer");
  const edgeLabelLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  edgeLabelLayer.setAttribute("class", "diagram-edge-label-layer");
  const nodeLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  nodeLayer.setAttribute("class", "diagram-node-layer");
  svg.appendChild(edgeLayer);
  svg.appendChild(edgeLabelLayer);
  svg.appendChild(nodeLayer);

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

  function getParallelOffset(slotIndex) {
    if (slotIndex === 0) {
      return 0;
    }
    const level = Math.ceil(slotIndex / 2);
    return slotIndex % 2 === 1 ? level : -level;
  }

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

        edgeLayer.appendChild(loopPath);
      } else {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const nx = -uy;
        const ny = ux;
        const reverseGroups = edgeGroups.get(`${group.next}\u0001${group.current}`);
        const hasReverse = Array.isArray(reverseGroups) && reverseGroups.length > 0;
        const parallelOffset = hasReverse
          ? (0.9 + index)
          : getParallelOffset(index);
        const curveSpacing = 20 * sizeScale;
        const curveOffset = parallelOffset * curveSpacing;
        const edgeStartRadius = nodeRadius - 1;
        const edgeEndRadius = nodeRadius + 0.5;
        const maxAnchorOffset = Math.max(0, Math.min(edgeStartRadius, edgeEndRadius) - 2);
        const anchorOffset = Math.max(-maxAnchorOffset, Math.min(maxAnchorOffset, curveOffset));
        const startAlong = Math.sqrt(
          Math.max(0, edgeStartRadius * edgeStartRadius - anchorOffset * anchorOffset)
        );
        const endAlong = Math.sqrt(
          Math.max(0, edgeEndRadius * edgeEndRadius - anchorOffset * anchorOffset)
        );

        const startX = from.x + ux * startAlong + nx * anchorOffset;
        const startY = from.y + uy * startAlong + ny * anchorOffset;
        const endX = to.x - ux * endAlong + nx * anchorOffset;
        const endY = to.y - uy * endAlong + ny * anchorOffset;

        if (anchorOffset === 0) {
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", String(startX));
          line.setAttribute("y1", String(startY));
          line.setAttribute("x2", String(endX));
          line.setAttribute("y2", String(endY));
          line.setAttribute("class", "edge");
          line.setAttribute("marker-end", "url(#arrow)");
          edgeLayer.appendChild(line);

          labelX = (startX + endX) / 2;
          labelY = (startY + endY) / 2 - 4 * sizeScale;
        } else {
          const controlStrength = 1.42;
          const controlX = (startX + endX) / 2 + nx * anchorOffset * controlStrength;
          const controlY = (startY + endY) / 2 + ny * anchorOffset * controlStrength;

          const curvePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
          curvePath.setAttribute(
            "d",
            `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`
          );
          curvePath.setAttribute("class", "edge");
          curvePath.setAttribute("marker-end", "url(#arrow)");
          edgeLayer.appendChild(curvePath);

          labelX = 0.25 * startX + 0.5 * controlX + 0.25 * endX + nx * 6 * sizeScale;
          labelY = 0.25 * startY + 0.5 * controlY + 0.25 * endY + ny * 6 * sizeScale;
        }
      }

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", String(labelX));
      label.setAttribute("y", String(labelY));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "label edge-label");
      renderGroupLabel(label, group);
      edgeLabelLayer.appendChild(label);

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
      edgeLabelLayer.insertBefore(badge, label);
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
    if (appState.haltStates.includes(name)) {
      circle.classList.add("halt");
    }
    if (name === appState.currentState) {
      circle.classList.add("current");
    }

    const haltedCurrentState = appState.haltedStatePulse
      && !appState.running
      && name === appState.currentState
      && isTerminalState(name);
    if (haltedCurrentState) {
      nodeGroup.classList.add("halted-node");
    }

    nodeGroup.appendChild(circle);

    if (isTerminalState(name)) {
      const inner = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      inner.setAttribute("cx", String(pos.x));
      inner.setAttribute("cy", String(pos.y));
      inner.setAttribute("r", String(Math.max(12, nodeRadius - 6 * sizeScale)));
      inner.setAttribute("class", `state-node terminal-inner ${getTerminalStateType(name)}`);
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
    renderDiagramStateLabel(text, name);
    nodeGroup.appendChild(text);
    nodeLayer.appendChild(nodeGroup);
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

  const isHalted = isTerminalState(appState.currentState);

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
  const newRuleId = crypto.randomUUID();
  appState.rules.push({
    id: newRuleId,
    current: defaultState,
    read: BLANK,
    write: BLANK,
    move: "S",
    next: defaultState
  });
  appState.newlyAddedRuleId = newRuleId;
  renderAll();

  requestAnimationFrame(() => {
    if (!els.rulesTableWrap) {
      return;
    }
    els.rulesTableWrap.scrollTop = els.rulesTableWrap.scrollHeight;
  });
}

function sortRulesByState() {
  clearHaltedStatePulse();
  appState.rules.sort((a, b) => {
    const aState = a.current.toLowerCase();
    const bState = b.current.toLowerCase();
    return aState.localeCompare(bState);
  });
  renderAll();
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

function openShareModal(message) {
  appState.modalOpenedAt = performance.now();
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;";
  const content = els.shareModal.firstElementChild;
  if (content) overlay.appendChild(content);
  overlay.addEventListener("click", (event) => {
    if (performance.now() - appState.modalOpenedAt < 350) return;
    if (event.target === overlay) closeShareModal();
  });
  if (els.shareModalMessage) els.shareModalMessage.textContent = message || "Share URL copied to clipboard.";
  document.body.appendChild(overlay);
  appState.shareModalOverlay = overlay;
}

function closeShareModal() {
  if (appState.shareModalOverlay) {
    const content = appState.shareModalOverlay.firstElementChild;
    if (content) els.shareModal.appendChild(content);
    appState.shareModalOverlay.remove();
    appState.shareModalOverlay = null;
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
  // When opening the menu, ensure any concertina sections are collapsed
  if (isOpen) {
    document.querySelectorAll('.menu-concertina-trigger').forEach((trigger) => {
      trigger.setAttribute('aria-expanded', 'false');
      const controls = trigger.getAttribute('aria-controls');
      if (controls) {
        const panel = document.getElementById(controls);
        if (panel) panel.hidden = true;
      }
      const arrow = trigger.querySelector('.concertina-arrow');
      if (arrow) arrow.textContent = '▸';
    });
  }

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

  els.executionSpeedSlider.addEventListener("input", () => {
    appState.executionSpeed = Number(els.executionSpeedSlider.value);
    els.executionSpeedLabel.textContent = `${appState.executionSpeed}x`;

    // If machine is running, restart the timer with the new delay
    if (appState.running && appState.runTimer) {
      clearInterval(appState.runTimer);
      appState.runTimer = setInterval(runLoopTick, getExecutionDelay());
    }
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

  bindTap(els.btnWorkspaceControls, () => {
    toggleWorkspaceControlsPopover();
  });
  bindModalActivate(els.btnWorkspaceControlsClose, closeWorkspaceControlsPopover);

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

  bindModalActivate(els.menuAlphabet, () => {
    openAlphabetModal();
    toggleMenu(false);
  });

  bindModalActivate(els.menuAbout, () => {
    openAboutModal();
    toggleMenu(false);
  });

  bindModalActivate(els.menuHelp, () => {
    openHelpModal();
    toggleMenu(false);
  });

  if (els.menuSaveFile) {
    els.menuSaveFile.addEventListener("click", () => {
      saveWorkspaceToFile();
      toggleMenu(false);
    });
  }

  if (els.menuOpenFile) {
    els.menuOpenFile.addEventListener("click", () => {
      openWorkspaceFromFilePicker();
      toggleMenu(false);
    });
  }

  if (els.fileOpenInput) {
    els.fileOpenInput.addEventListener("change", handleFileOpenInputChange);
  }

  if (els.menuShare) {
    els.menuShare.addEventListener("click", () => {
      generateShareableUrl();
      toggleMenu(false);
    });
  }

  if (els.btnShareModalOk) bindModalActivate(els.btnShareModalOk, closeShareModal);
  if (els.btnShareModalCloseX) bindModalActivate(els.btnShareModalCloseX, closeShareModal);

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

  if (els.alphabetModal) {
    els.alphabetModal.addEventListener("click", (event) => {
      if (performance.now() - appState.modalOpenedAt < 350) {
        return;
      }
      if (event.target === els.alphabetModal) {
        closeAlphabetModal();
      }
    });
    els.alphabetModal.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
  }

  if (els.tapeSymbolPicker) {
    els.tapeSymbolPicker.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
  }

  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  document.addEventListener("click", (event) => {
    if (els.appMenu.classList.contains("is-open") && !els.appMenu.contains(event.target) && !els.btnHamburger.contains(event.target)) {
      toggleMenu(false);
    }

    if (
      appState.workspaceControlsOpen
      && !els.workspaceControlsPopover?.contains(event.target)
      && !els.btnWorkspaceControls?.contains(event.target)
    ) {
      closeWorkspaceControlsPopover();
    }

    if (event.target instanceof Element && event.target.closest("#btnAddRule")) {
      return;
    }
    consumeRuleHighlightsOnInteraction();
  });

  document.addEventListener("change", () => {
    consumeRuleHighlightsOnInteraction();
  });

  document.addEventListener("keydown", () => {
    consumeRuleHighlightsOnInteraction();
  });

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!appState.tapeSymbolPicker.open) {
        return;
      }
      if (els.tapeSymbolPicker?.contains(event.target)) {
        return;
      }
      closeTapeSymbolPicker();
    },
    true
  );

  els.btnAddRule.addEventListener("click", addRule);
  els.btnSortRules.addEventListener("click", sortRulesByState);
  bindModalActivate(els.btnAddState, () => openStateModal());
  els.btnResetTape.addEventListener("click", resetTape);
  els.btnResetMachine.addEventListener("click", resetMachine);

  els.btnStep.addEventListener("click", () => {
    clearHaltedStatePulse();
    stopRunLoop();
    if (isTerminalState(appState.currentState)) {
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
    const haltedInTerminalState = isTerminalState(appState.currentState);
    const haltedByNoRule = appState.haltedReason === "no-rule";
    if (haltedInTerminalState || haltedByNoRule) {
      stopTapeSnap();
      stopHeadPulse();
      appState.currentState = appState.startState;
      appState.steps = 0;
      appState.haltedReason = null;
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
  bindModalActivate(els.btnAlphabetModalCloseX, closeAlphabetModal);
  bindModalActivate(els.btnAlphabetModalCancel, closeAlphabetModal);
  bindModalActivate(els.btnAlphabetModalSave, saveAlphabetModal);
  bindModalActivate(els.btnAlphabetModalReset, resetAlphabetModal);
  if (els.stateNameInput) {
    els.stateNameInput.addEventListener("input", () => setStateModalFeedback(""));
    els.stateNameInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }
      event.preventDefault();
      saveStateModal();
    });
  }
  [els.stateRoleNormal, els.stateRoleStart, els.stateRoleAccept, els.stateRoleReject, els.stateRoleHalt]
    .filter(Boolean)
    .forEach((radio) => {
      radio.addEventListener("change", () => setStateModalFeedback(""));
    });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (appState.tapeSymbolPicker.open) {
        closeTapeSymbolPicker();
        return;
      }
      if (appState.alphabetModal.open) {
        closeAlphabetModal();
        return;
      }
      if (appState.workspaceControlsOpen) {
        closeWorkspaceControlsPopover();
        return;
      }
      if (appState.stateModal.open) closeStateModal();
      if (appState.aboutModalOverlay) closeAboutModal();
      if (appState.helpModalOverlay) closeHelpModal();
      if (appState.deleteAllConfirmOverlay) closeDeleteAllConfirmModal();
      if (appState.diagramModalOpen) closeDiagramModal();
      if (els.appMenu.classList.contains("is-open")) toggleMenu(false);
    }
  });

  window.addEventListener("resize", () => {
    updateTouchDeviceMode();
    closeWorkspaceControlsPopover();
    autoFitCellSize();
    resnapTapeViewAfterViewportChange();
    renderTape();
    renderDiagram();
    if (appState.tapeSymbolPicker.open && appState.tapeSymbolPicker.cell) {
      positionTapeSymbolPicker(appState.tapeSymbolPicker.cell, appState.tapeSymbolPicker);
    }
    if (appState.diagramModalOpen) {
      renderDiagram(els.diagramExpanded);
    }
  });

  window.addEventListener("orientationchange", () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateTouchDeviceMode();
        autoFitCellSize();
        resnapTapeViewAfterViewportChange();
        renderTape();
        updateStatus();
      });
    });
  });
}

function seedExampleTape() {
  const bits = ["1", "0", "1", "1"];
  bits.forEach((b, i) => setSymbol(0, i, b));
}

function init() {
  document.body.setAttribute("data-theme", "dark");
  updateTouchDeviceMode();
  if (els.aboutVersion) {
    els.aboutVersion.textContent = APP_VERSION;
  }
  initEvents();

  // Always start at default speed per app load.
  appState.executionSpeed = DEFAULT_EXECUTION_SPEED;
  els.executionSpeedSlider.value = String(DEFAULT_EXECUTION_SPEED);
  els.executionSpeedLabel.textContent = `${DEFAULT_EXECUTION_SPEED}x`;
  updateTouchDeviceMode();

  // If URL contains a shared workspace, load it but do not persist to localStorage.
  const shared = readWorkspaceFromUrl();
  if (shared && hasMeaningfulSavedWorkspace(shared) && applySavedWorkspace(shared)) {
    appState.workspaceSaveEnabled = false;
    appState.message = "Loaded workspace from shared URL.";
    updateStatus();
  } else {
    startupWithSavedWorkspaceDecision();
  }

  scheduleInitialTouchViewportResnap();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Ignore registration failures so the app still runs normally.
      });
    });
  }
}

init();
