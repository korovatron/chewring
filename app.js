const BLANK = "□";
const LEGACY_BLANK = "_";
const appState = {
  rows: 1,
  cellSize: 46,
  minCol: -20,
  maxCol: 20,
  tape: new Map(),
  head: { row: 0, col: 0 },
  startHead: { row: 0, col: 0 },
  startState: "q0",
  currentState: "q0",
  acceptStates: ["qa"],
  rejectStates: ["qr"],
  steps: 0,
  running: false,
  runTimer: null,
  headMode: false,
  activeRuleId: null,
  message: "Ready.",
  rules: [
    { id: crypto.randomUUID(), current: "q0", read: "1", write: "1", move: "R", next: "q0" },
    { id: crypto.randomUUID(), current: "q0", read: BLANK, write: BLANK, move: "S", next: "qa" }
  ]
};

const els = {
  tapeViewport: document.getElementById("tapeViewport"),
  symbolPalette: document.getElementById("symbolPalette"),
  cellSizeSlider: document.getElementById("cellSizeSlider"),
  cellSizeValue: document.getElementById("cellSizeValue"),
  programPreset: document.getElementById("programPreset"),
  btnLoadProgram: document.getElementById("btnLoadProgram"),
  btnTheme: document.getElementById("btnTheme"),
  btnHeadMode: document.getElementById("btnHeadMode"),
  btnAddRow: document.getElementById("btnAddRow"),
  btnRemoveRow: document.getElementById("btnRemoveRow"),
  btnResetTape: document.getElementById("btnResetTape"),
  btnResetMachine: document.getElementById("btnResetMachine"),
  btnStep: document.getElementById("btnStep"),
  btnRun: document.getElementById("btnRun"),
  btnPause: document.getElementById("btnPause"),
  statusState: document.getElementById("statusState"),
  statusHead: document.getElementById("statusHead"),
  statusStep: document.getElementById("statusStep"),
  statusMessage: document.getElementById("statusMessage"),
  rulesTableBody: document.querySelector("#rulesTable tbody"),
  btnAddRule: document.getElementById("btnAddRule"),
  startState: document.getElementById("startState"),
  acceptStates: document.getElementById("acceptStates"),
  rejectStates: document.getElementById("rejectStates"),
  diagram: document.getElementById("diagram")
};

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.body.setAttribute("data-theme", nextTheme);
  els.btnTheme.textContent = nextTheme === "dark" ? "Dark: On" : "Dark: Off";
  localStorage.setItem("chewring-theme", nextTheme);
}

function toggleTheme() {
  const current = document.body.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

const DEFAULT_PROGRAMS = {
  "scan-right": {
    rows: 1,
    startState: "q0",
    acceptStates: ["qa"],
    rejectStates: ["qr"],
    head: { row: 0, col: 0 },
    tapeRows: ["101101"],
    rules: [
      { id: crypto.randomUUID(), current: "q0", read: "0", write: "0", move: "R", next: "q0" },
      { id: crypto.randomUUID(), current: "q0", read: "1", write: "1", move: "R", next: "q0" },
      { id: crypto.randomUUID(), current: "q0", read: BLANK, write: BLANK, move: "S", next: "qa" }
    ]
  },
  "unary-increment": {
    rows: 1,
    startState: "q0",
    acceptStates: ["qa"],
    rejectStates: ["qr"],
    head: { row: 0, col: 0 },
    tapeRows: ["1111"],
    rules: [
      { id: crypto.randomUUID(), current: "q0", read: "1", write: "1", move: "R", next: "q0" },
      { id: crypto.randomUUID(), current: "q0", read: BLANK, write: "1", move: "S", next: "qa" }
    ]
  },
  "binary-invert": {
    rows: 1,
    startState: "q0",
    acceptStates: ["qa"],
    rejectStates: ["qr"],
    head: { row: 0, col: 0 },
    tapeRows: ["101001"],
    rules: [
      { id: crypto.randomUUID(), current: "q0", read: "0", write: "1", move: "R", next: "q0" },
      { id: crypto.randomUUID(), current: "q0", read: "1", write: "0", move: "R", next: "q0" },
      { id: crypto.randomUUID(), current: "q0", read: BLANK, write: BLANK, move: "S", next: "qa" }
    ]
  },
  "two-row-copy": {
    rows: 2,
    startState: "q0",
    acceptStates: ["qa"],
    rejectStates: ["qr"],
    head: { row: 0, col: 0 },
    tapeRows: ["10110", ""],
    rules: [
      { id: crypto.randomUUID(), current: "q0", read: "0", write: "0", move: "D", next: "qd0" },
      { id: crypto.randomUUID(), current: "q0", read: "1", write: "1", move: "D", next: "qd1" },
      { id: crypto.randomUUID(), current: "q0", read: BLANK, write: BLANK, move: "S", next: "qa" },
      { id: crypto.randomUUID(), current: "qd0", read: BLANK, write: "0", move: "U", next: "qu" },
      { id: crypto.randomUUID(), current: "qd1", read: BLANK, write: "1", move: "U", next: "qu" },
      { id: crypto.randomUUID(), current: "qu", read: "0", write: "0", move: "R", next: "q0" },
      { id: crypto.randomUUID(), current: "qu", read: "1", write: "1", move: "R", next: "q0" }
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

function applyCellSize() {
  const size = Math.max(28, Math.min(84, appState.cellSize));
  appState.cellSize = size;
  document.documentElement.style.setProperty("--tape-cell-size", `${size}px`);
  els.cellSizeSlider.value = String(size);
  els.cellSizeValue.textContent = `${size}px`;
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
  const verticalGap = 6;

  const sizeFromWidth = Math.floor((width - targetCols * horizontalGap) / targetCols);
  const sizeFromHeight = Math.floor((height - (appState.rows - 1) * verticalGap) / Math.max(1, appState.rows));

  appState.cellSize = Math.max(28, Math.min(84, Math.min(sizeFromWidth, sizeFromHeight)));
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

function cloneRules(rules) {
  return rules.map((rule) => ({ ...rule, id: crypto.randomUUID() }));
}

function loadSelectedProgram() {
  const preset = DEFAULT_PROGRAMS[els.programPreset.value];
  if (!preset) {
    appState.message = "Preset not found.";
    renderAll();
    return;
  }

  stopRunLoop();
  appState.rows = preset.rows;
  appState.startState = preset.startState;
  appState.currentState = preset.startState;
  appState.acceptStates = [...preset.acceptStates];
  appState.rejectStates = [...preset.rejectStates];
  appState.head = { ...preset.head };
  appState.startHead = { ...preset.head };
  appState.steps = 0;
  appState.activeRuleId = null;
  appState.rules = cloneRules(preset.rules);

  loadTapeRows(preset.tapeRows);
  autoFitCellSize();

  els.startState.value = appState.startState;
  els.acceptStates.value = appState.acceptStates.join(",");
  els.rejectStates.value = appState.rejectStates.join(",");

  appState.message = `Loaded preset: ${els.programPreset.options[els.programPreset.selectedIndex].text}.`;
  renderAll();
}

function updateMachineConfigFromInputs() {
  appState.startState = els.startState.value.trim() || "q0";
  appState.acceptStates = parseCsvStates(els.acceptStates.value);
  appState.rejectStates = parseCsvStates(els.rejectStates.value);
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
  const width = viewport.clientWidth || 1000;
  const cellPitch = appState.cellSize + 4;
  const cellsPerRow = Math.max(9, Math.floor(width / cellPitch));
  const half = Math.floor(cellsPerRow / 2);
  const fromCol = appState.head.col - half;
  const toCol = appState.head.col + half;

  appState.minCol = Math.min(appState.minCol, fromCol - 5);
  appState.maxCol = Math.max(appState.maxCol, toCol + 5);

  const grid = document.createElement("div");
  grid.className = "tape-grid";

  for (let r = 0; r < appState.rows; r += 1) {
    const rowEl = document.createElement("div");
    rowEl.className = "tape-row";

    for (let c = fromCol; c <= toCol; c += 1) {
      const cell = document.createElement("button");
      cell.className = "tape-cell";
      const symbol = getSymbol(r, c);
      cell.textContent = symbolForDisplay(symbol);
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      if (r === appState.head.row && c === appState.head.col) {
        cell.classList.add("head");
      }
      cell.addEventListener("click", onTapeCellClick);
      rowEl.appendChild(cell);
    }

    grid.appendChild(rowEl);
  }

  viewport.replaceChildren(grid);
}

function onTapeCellClick(event) {
  const target = event.currentTarget;
  const row = Number(target.dataset.row);
  const col = Number(target.dataset.col);

  if (appState.headMode) {
    appState.head = { row, col };
    appState.startHead = { row, col };
    appState.message = `Head start set to r${row}, c${col}.`;
  } else {
    const symbol = normalizeSymbol(els.symbolPalette.value);
    setSymbol(row, col, symbol);
    appState.message = `Set r${row}, c${col} to '${symbolForDisplay(symbol)}'.`;
  }

  renderAll();
}

function renderRulesTable() {
  const tbody = els.rulesTableBody;
  tbody.innerHTML = "";

  const moveChoices = movementOptions();

  for (const rule of appState.rules) {
    const tr = document.createElement("tr");
    if (rule.id === appState.activeRuleId) {
      tr.classList.add("active-rule");
    }

    tr.appendChild(ruleInputCell(rule, "current", "text"));
    tr.appendChild(ruleInputCell(rule, "read", "text"));
    tr.appendChild(ruleInputCell(rule, "write", "text"));
    tr.appendChild(ruleSelectCell(rule, "move", moveChoices));
    tr.appendChild(ruleInputCell(rule, "next", "text"));

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

function ruleInputCell(rule, field, type) {
  const td = document.createElement("td");
  const input = document.createElement("input");
  input.type = type;
  input.value = field === "read" || field === "write" ? symbolForDisplay(rule[field]) : rule[field];
  input.addEventListener("change", () => {
    const clean = (input.value || "").trim();
    rule[field] = field === "read" || field === "write" ? normalizeSymbol(clean) : clean;
    renderDiagram();
    input.value = field === "read" || field === "write" ? symbolForDisplay(rule[field]) : rule[field];
  });
  td.appendChild(input);
  return td;
}

function ruleSelectCell(rule, field, options) {
  const td = document.createElement("td");
  const select = document.createElement("select");

  for (const option of options) {
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

  setSymbol(appState.head.row, appState.head.col, rule.write);
  applyMove(rule.move);
  appState.currentState = rule.next;
  appState.steps += 1;

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
  machineStep();
  renderAll();
  if (!appState.running) {
    stopRunLoop();
  }
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
  if (appState.runTimer) {
    clearInterval(appState.runTimer);
    appState.runTimer = null;
  }
}

function resetMachine() {
  stopRunLoop();
  updateMachineConfigFromInputs();
  appState.currentState = appState.startState;
  appState.head = { ...appState.startHead };
  appState.steps = 0;
  appState.activeRuleId = null;
  appState.message = "Machine reset.";
  renderAll();
}

function resetTape() {
  appState.tape.clear();
  appState.head = { row: 0, col: 0 };
  appState.startHead = { row: 0, col: 0 };
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

  const states = new Set([appState.startState, ...appState.acceptStates, ...appState.rejectStates]);
  for (const rule of appState.rules) {
    const clean = parseAndCleanRule(rule);
    if (clean.current) states.add(clean.current);
    if (clean.next) states.add(clean.next);
  }

  const list = Array.from(states).filter(Boolean);
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
        const loopDepth = 46 + index * 10;
        const loopSpread = 44 + index * 6;
        const spaceLeft = from.x;
        const spaceRight = diagramWidth - from.x;
        const drawRight = spaceRight >= spaceLeft;
        const side = drawRight ? 1 : -1;
        const loopPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        loopPath.setAttribute(
          "d",
          `M ${from.x + side * nodeRadius} ${from.y - 16} C ${from.x + side * (nodeRadius + loopDepth)} ${from.y - loopSpread}, ${from.x + side * (nodeRadius + loopDepth)} ${from.y + loopSpread}, ${from.x + side * nodeRadius} ${from.y + 16}`
        );
        labelX = from.x + side * (nodeRadius + loopDepth + 24);
        labelY = from.y + 4 + index * 12;
        loopPath.setAttribute("class", "edge");
        loopPath.setAttribute("marker-end", "url(#arrow)");

        if (appState.activeRuleId && group.ruleIds.has(appState.activeRuleId)) {
          loopPath.classList.add("active");
        }

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

        if (appState.activeRuleId && group.ruleIds.has(appState.activeRuleId)) {
          line.classList.add("active");
        }

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
      svg.insertBefore(badge, label);
    });
  }

  for (const [name, pos] of positions.entries()) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(pos.x));
    circle.setAttribute("cy", String(pos.y));
    circle.setAttribute("r", String(nodeRadius));
    circle.setAttribute("class", "state-node");

    if (appState.acceptStates.includes(name)) {
      circle.classList.add("accept");
    }
    if (appState.rejectStates.includes(name)) {
      circle.classList.add("reject");
    }
    if (name === appState.currentState) {
      circle.classList.add("current");
    }

    svg.appendChild(circle);

    if (appState.acceptStates.includes(name)) {
      const inner = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      inner.setAttribute("cx", String(pos.x));
      inner.setAttribute("cy", String(pos.y));
      inner.setAttribute("r", String(Math.max(12, nodeRadius - 6 * sizeScale)));
      inner.setAttribute("class", "state-node accept-inner");
      svg.appendChild(inner);
    }

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(pos.x));
    text.setAttribute("y", String(pos.y + 5));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "label");
    text.textContent = name;
    svg.appendChild(text);
  }
}

function updateStatus() {
  els.statusState.textContent = `State: ${appState.currentState}`;
  els.statusHead.textContent = `Head: r${appState.head.row}, c${appState.head.col}`;
  els.statusStep.textContent = `Step: ${appState.steps}`;
  els.statusMessage.textContent = appState.message;

  els.btnRun.disabled = appState.running;
  els.btnPause.disabled = !appState.running;
  els.btnRemoveRow.disabled = appState.rows <= 1;
}

function renderAll() {
  normalizeRulesForRows();
  renderTape();
  renderRulesTable();
  renderDiagram();
  updateStatus();
}

function addRule() {
  appState.rules.push({
    id: crypto.randomUUID(),
    current: appState.currentState,
    read: BLANK,
    write: BLANK,
    move: "S",
    next: appState.currentState
  });
  renderAll();
}

function initEvents() {
  els.btnLoadProgram.addEventListener("click", loadSelectedProgram);
  els.btnTheme.addEventListener("click", toggleTheme);

  els.cellSizeSlider.addEventListener("input", () => {
    appState.cellSize = Number(els.cellSizeSlider.value);
    applyCellSize();
    renderTape();
  });

  els.btnHeadMode.addEventListener("click", () => {
    appState.headMode = !appState.headMode;
    els.btnHeadMode.textContent = appState.headMode ? "Head: On" : "Head: Off";
  });

  els.btnAddRow.addEventListener("click", () => {
    appState.rows += 1;
    autoFitCellSize();
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
    appState.message = `Rows: ${appState.rows}.`;
    renderAll();
  });

  els.btnAddRule.addEventListener("click", addRule);
  els.btnResetTape.addEventListener("click", resetTape);
  els.btnResetMachine.addEventListener("click", resetMachine);

  els.btnStep.addEventListener("click", () => {
    stopRunLoop();
    updateMachineConfigFromInputs();
    machineStep();
    renderAll();
  });

  els.btnRun.addEventListener("click", () => {
    updateMachineConfigFromInputs();
    startRunLoop();
    renderAll();
  });

  els.btnPause.addEventListener("click", () => {
    stopRunLoop();
    appState.message = "Paused.";
    renderAll();
  });

  els.startState.addEventListener("change", updateMachineConfigFromInputs);
  els.acceptStates.addEventListener("change", updateMachineConfigFromInputs);
  els.rejectStates.addEventListener("change", updateMachineConfigFromInputs);

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
  applyTheme(localStorage.getItem("chewring-theme") || "light");
  updateMachineConfigFromInputs();
  loadSelectedProgram();
  autoFitCellSize();
  initEvents();
  renderAll();
}

init();
