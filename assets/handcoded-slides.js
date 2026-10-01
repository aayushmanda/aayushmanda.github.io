/* Live figures for the hand-coded process and outcome slides.
   The model section is a line-by-line port of lettertrace.py (count task, block layout):
   same residual slots, same weights, same forward pass. Every number drawn below comes
   from running that forward pass in the browser. */
(function () {
  "use strict";

  // ------------------------------------------------------------------ model
  const A = 4, N = 6, M = 3, H = 3, L = 2;
  const V = M, SEP = A + V, COLON = A + V + 1, EOS = A + V + 2, VOCAB = A + V + 3;
  const P = 2 * N + 6, F = Math.max(A, 3 * V * (N + 1), 2 * N + 1);
  const SLOT_SIZES = [["TL", A], ["TV", V], ["POS", P], ["QRY", A], ["MATCH", 1],
                      ["PREV", V], ["MT", 1], ["CNT", 1], ["S0", V], ["OUT", V]];
  const SLOT = {};
  let W = 0;
  for (const [name, size] of SLOT_SIZES) { SLOT[name] = { start: W, size }; W += size; }
  const GAP = Math.max(16, 3 * Math.log(8 * (N + 3)));
  const C = GAP * Math.sqrt(P);

  const at = (name, i = 0) => SLOT[name].start + i;
  const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);
  const zeros = (r, c) => Array.from({ length: r }, () => new Float64Array(c));
  const zeros3 = (a, r, c) => Array.from({ length: a }, () => zeros(r, c));

  function zeroParams() {
    const p = { wte: zeros(VOCAB, W), wpe: zeros(P, W), readout: zeros(VOCAB, W), blocks: [] };
    for (let b = 0; b < L; b++) {
      p.blocks.push({ q: zeros3(H, P, W), k: zeros3(H, P, W), v: zeros3(H, W, W),
                      win: zeros(F, W), bin: new Float64Array(F), wout: zeros(W, F) });
    }
    return p;
  }

  // Head h of block b: position i attends to table[i] (a list means uniform), else to fallback.
  function route(p, b, h, table, fallback) {
    const blk = p.blocks[b];
    for (let d = 0; d < P; d++) blk.k[h][d][at("POS", d)] = 1;
    for (let i = 0; i < P; i++) {
      for (const j of table[i] || [fallback]) blk.q[h][j][at("POS", i)] = C;
    }
  }

  function base(letters) {
    const p = zeroParams(), b0 = p.blocks[0], table = {};
    for (let a = 0; a < A; a++) p.wte[a][at("TL", a)] = 1;
    for (let v = 0; v < V; v++) p.wte[A + v][at("TV", v)] = 1;
    for (let i = 0; i < P; i++) p.wpe[i][at("POS", i)] = 1;
    for (const i of letters) table[i] = [1];
    route(p, 0, 0, table, 0);
    for (let a = 0; a < A; a++) {
      b0.v[0][at("QRY", a)][at("TL", a)] = 1;
      b0.win[a][at("TL", a)] = 1;
      b0.win[a][at("QRY", a)] = 1;
      b0.bin[a] = -1.5;
      b0.wout[at("MATCH")][a] = 2;
    }
    return p;
  }

  function readout(p, colonAt, eosAt) {
    for (let v = 0; v < V; v++) p.readout[A + v][at("OUT", v)] = 20;
    p.readout[COLON][at("POS", colonAt)] = 20;
    p.readout[EOS][at("POS", eosAt)] = 20;
    return p;
  }

  function processSolution() {
    const p = base(range(1, N + 1).map((t) => 1 + t)), b1 = p.blocks[1], last = 2 * N + 2;
    const prev = {}, mark = {}, answer = { [last + 1]: [last] };
    for (let t = 1; t <= N; t++) {
      prev[N + 1 + t] = [t === 1 ? 0 : N + 1 + t];
      mark[N + 1 + t] = [1 + t];
    }
    route(p, 1, 0, prev, 1);
    route(p, 1, 1, mark, 0);
    route(p, 1, 2, answer, 1);
    for (let v = 0; v < V; v++) {
      b1.v[0][at("PREV", v)][at("TV", v)] = 1;
      b1.v[2][at("OUT", v)][at("TV", v)] = 1;
    }
    b1.v[1][at("MT")][at("MATCH")] = 1;
    const units = [];
    for (let j = 0; j < V; j++) {
      units.push([[[at("PREV", j), 1], [at("MT"), -1]], -0.5, j]);
      units.push([[[at("PREV", j), 1], [at("MT"), 1]], -1.5, (j + 1) % M]);
    }
    units.forEach(([inputs, bias, value], u) => {
      for (const [w, c] of inputs) b1.win[u][w] = c;
      b1.bin[u] = bias;
      b1.wout[at("OUT", value)][u] = 2;
    });
    return readout(p, last, last + 2);
  }

  function outcomeSolution() {
    const p = base(range(2, N + 2)), b1 = p.blocks[1], ans = N + 3;
    route(p, 1, 0, { [ans]: range(2, N + 2) }, 0);
    route(p, 1, 1, { [ans]: [0] }, 1);
    b1.v[0][at("CNT")][at("MATCH")] = N;
    for (let v = 0; v < V; v++) b1.v[1][at("S0", v)][at("TV", v)] = 1;
    const gate = N + 2;
    let u = 0;
    for (let j = 0; j < V; j++) {
      for (let c = 0; c <= N; c++) {
        for (const [offset, coef] of [[1, 1], [0, -2], [-1, 1]]) {
          b1.win[u][at("CNT")] = 1;
          b1.win[u][at("S0", j)] = gate;
          b1.bin[u] = offset - c - gate;
          b1.wout[at("OUT", (j + c) % M)][u] = coef;
          u++;
        }
      }
    }
    return readout(p, N + 2, N + 4);
  }

  const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  const matvec = (mat, x) => Float64Array.from(mat, (row) => dot(row, x));
  const copyRows = (x) => x.map((r) => Float64Array.from(r));
  const argmax = (r) => r.reduce((best, v, i) => (v > r[best] ? i : best), 0);

  // Returns every intermediate: embeddings, per-block attention maps, MLP pre-activations, logits.
  function forward(p, ids) {
    const T = ids.length;
    const x = ids.map((id, t) => Float64Array.from(p.wte[id], (v, w) => v + p.wpe[t][w]));
    const trace = { x0: copyRows(x), blocks: [] };
    for (const blk of p.blocks) {
      const delta = zeros(T, W), att = [];
      for (let h = 0; h < H; h++) {
        const q = x.map((r) => matvec(blk.q[h], r));
        const k = x.map((r) => matvec(blk.k[h], r));
        const v = x.map((r) => matvec(blk.v[h], r));
        const a = zeros(T, T);
        for (let i = 0; i < T; i++) {
          const s = range(0, i + 1).map((j) => dot(q[i], k[j]) / Math.sqrt(P));
          const mx = Math.max(...s), e = s.map((z) => Math.exp(z - mx));
          const zsum = e.reduce((acc, z) => acc + z, 0);
          for (let j = 0; j <= i; j++) {
            a[i][j] = e[j] / zsum;
            for (let w = 0; w < W; w++) delta[i][w] += a[i][j] * v[j][w];
          }
        }
        att.push(a);
      }
      for (let i = 0; i < T; i++) for (let w = 0; w < W; w++) x[i][w] += delta[i][w];
      const xAttn = copyRows(x), pre = [], hid = [];
      for (let i = 0; i < T; i++) {
        const pr = matvec(blk.win, x[i]).map((z, u) => z + blk.bin[u]);
        const hd = pr.map((z) => Math.max(0, z));
        const out = matvec(blk.wout, hd);
        for (let w = 0; w < W; w++) x[i][w] += out[w];
        pre.push(pr);
        hid.push(hd);
      }
      trace.blocks.push({ att, xAttn, pre, hid, x: copyRows(x) });
    }
    trace.logits = x.map((r) => matvec(p.readout, r));
    return trace;
  }

  function generate(p, prompt, steps) {
    const ids = prompt.slice();
    for (let s = 0; s < steps; s++) {
      const logits = forward(p, ids).logits;
      ids.push(argmax(logits[logits.length - 1]));
    }
    return { ids, trace: forward(p, ids) };
  }

  const PARAMS = { process: processSolution(), outcome: outcomeSolution() };

  // ------------------------------------------------------------------ state
  const DEFAULT = { s0: 1, q: 0, word: [1, 0, 3, 0, 2, 0] };
  const state = { s0: 1, q: 0, word: DEFAULT.word.slice(), t: 4, head: "p1h1", slot: null,
                  prog: "process", layer: 2 };
  let run = null;

  function compute() {
    const states = [];
    let s = state.s0;
    for (const c of state.word) { s = (s + (c === state.q ? 1 : 0)) % M; states.push(s); }
    const prompt = [A + state.s0, state.q, ...state.word, SEP];
    const tail = [COLON, A + states[N - 1], EOS];
    run = {
      states, prompt,
      process: generate(PARAMS.process, prompt, N + 3),
      outcome: generate(PARAMS.outcome, prompt, 3),
      gold: { process: [...prompt, ...states.map((v) => A + v), ...tail], outcome: [...prompt, ...tail] },
    };
  }

  // ------------------------------------------------------------------ drawing helpers
  const NS = "http://www.w3.org/2000/svg";
  const BLUE = "#1d4ed8", ORANGE = "#c2410c", GRAY = "#6b7280", GREEN = "#15803d", INK = "#1f2937";
  const LETTERS = "abcdefghij";
  const SUB = "₀₁₂₃₄₅₆₇₈₉", SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const sub = (n) => String(n).replace(/\d/g, (d) => SUB[d]);
  const sup = (n) => String(n).replace(/\d/g, (d) => SUP[d]);
  const tok = (id) => (id < A ? LETTERS[id] : id < A + V ? String(id - A)
    : id === SEP ? "SEP" : id === COLON ? ":" : "EOS");
  const isValue = (id) => id >= A && id < A + V;
  const fmt = (v, d = 2) => {
    const r = Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v;
    return (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r).toFixed(d);
  };
  const plain = (v, d = 2) => String(Number((Math.abs(v) < 1e-9 ? 0 : v).toFixed(d)));
  let uid = 0;

  function node(tag, attrs, parent, txt) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    if (txt !== undefined) e.textContent = txt;
    if (parent) parent.appendChild(e);
    return e;
  }

  function newSvg(w, h, cls) {
    const id = "hc" + ++uid;
    const svg = node("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", class: cls,
                              "font-family": "'Source Serif 4', Georgia, serif" });
    const defs = node("defs", {}, svg);
    svg.mk = {};
    for (const [key, color] of [["o", ORANGE], ["b", BLUE], ["g", GRAY], ["e", GREEN]]) {
      const m = node("marker", { id: id + key, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7,
                                 markerHeight: 7, orient: "auto-start-reverse" }, defs);
      node("path", { d: "M0,0 L10,5 L0,10 z", fill: color }, m);
      svg.mk[key] = `url(#${id + key})`;
    }
    return svg;
  }

  const text = (p, x, y, s, o = {}) => node("text", {
    x, y, "font-size": o.size || 14, fill: o.fill || INK, "text-anchor": o.anchor || "start",
    "font-weight": o.weight || 400, transform: o.transform }, p, s);
  const box = (p, x, y, w, h, o = {}) => node("rect", {
    x, y, width: w, height: h, rx: o.rx === undefined ? 6 : o.rx, fill: o.fill || "#ffffff",
    stroke: o.stroke || "#93c5fd", "stroke-width": o.sw || 1.5 }, p);
  const group = (p, step) => node("g", { "data-step": step }, p);

  function token(p, x, y, w, h, id, o = {}) {
    box(p, x, y, w, h, o);
    const small = id === SEP || id === EOS;
    text(p, x + w / 2, y + h / 2 + (small ? 4.5 : 7), tok(id),
         { size: small ? 13 : 20, fill: isValue(id) ? BLUE : INK, anchor: "middle" });
  }

  function curve(p, d, color, marker, width, draw = true) {
    return node("path", { d, fill: "none", stroke: color, "stroke-width": width || 2, "marker-end": marker,
                          pathLength: draw ? 1 : undefined, class: draw ? "draw" : undefined }, p);
  }
  const arc = (p, x1, x2, y, h, color, marker, width) =>
    curve(p, `M${x1},${y} Q${(x1 + x2) / 2},${y - h} ${x2},${y}`, color, marker, width);
  const loop = (p, x, y, color, marker) =>
    curve(p, `M${x - 10},${y} C${x - 28},${y - 46} ${x + 28},${y - 46} ${x + 10},${y}`, color, marker);
  const down = (p, x, y1, y2, color, marker, width) =>
    curve(p, `M${x},${y1} L${x},${y2}`, color, marker, width || 1.6);

  function bracket(p, x1, x2, y, color, label) {
    node("path", { d: `M${x1},${y} v8 H${x2} v-8`, fill: "none", stroke: color, "stroke-width": 1.5 }, p);
    text(p, (x1 + x2) / 2, y + 26, label, { size: 14, fill: color, anchor: "middle" });
  }

  function overBracket(p, x1, x2, top, color, label) {
    node("path", { d: `M${x1},86 V${top} H${x2} V86`, fill: "none", stroke: color, "stroke-width": 1.6 }, p);
    text(p, (x1 + x2) / 2, top - 8, label, { size: 14, fill: color, anchor: "middle", weight: 700 });
  }

  function mix(hex, t) {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return "rgb(" + c.map((v) => Math.round(255 + (v - 255) * Math.min(1, Math.max(0, t)))).join(",") + ")";
  }

  function s0Label() {
    const e = el("span", "lbl");
    e.append("s", el("sub", "", "0"));
    return e;
  }

  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }

  function btn(label, on, onClick, cls) {
    const b = el("button", "hc-btn" + (on ? " on" : "") + (cls ? " " + cls : ""), label);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  // Re-render a host without losing which reveal steps are already shown.
  function paint(host, build) {
    const shown = {}, current = {};
    host.querySelectorAll("[data-step]").forEach((e) => {
      const s = e.getAttribute("data-step");
      if (e.classList.contains("is-shown")) shown[s] = true;
      if (e.classList.contains("is-current")) current[s] = true;
    });
    const out = build();
    host.replaceChildren(...(Array.isArray(out) ? out : [out]));
    host.querySelectorAll("[data-step]").forEach((e) => {
      const s = e.getAttribute("data-step");
      e.classList.toggle("is-shown", !!shown[s]);
      e.classList.toggle("is-current", !!current[s]);
    });
  }

  const ORANGE_TOK = { fill: "#ffedd5", stroke: ORANGE };
  const BLUE_HI = { fill: "#eff6ff", stroke: BLUE, sw: 3 };
  const ORANGE_HI = { fill: "#ffedd5", stroke: ORANGE, sw: 2.5 };

  // ------------------------------------------------------------------ slide 1: rows
  function fig1() {
    const svg = newSvg(960, 270), x0 = 110, st = 46, bw = 42, np = N + 3;
    const cx = (i) => x0 + i * st + bw / 2;
    text(svg, 12, 92, "process", { size: 17, fill: BLUE, weight: 700 });
    const g1 = group(svg, 1);
    run.process.ids.forEach((id, i) => {
      const parent = i < np ? svg : g1;
      token(parent, x0 + i * st, 65, bw, bw, id, i < np ? {} : ORANGE_TOK);
      text(parent, cx(i), 59, String(i), { size: 11, fill: GRAY, anchor: "middle" });
    });
    bracket(svg, x0, x0 + np * st - 4, 113, GRAY, `prompt: n + 3 = ${np} tokens`);
    bracket(g1, x0 + np * st, x0 + (np + N) * st - 4, 113, ORANGE, "s₁ … sₙ, one update each");
    bracket(g1, x0 + (np + N) * st, x0 + (np + N + 3) * st - 4, 113, ORANGE, ": sₙ EOS");

    const g2 = group(svg, 2);
    text(g2, 12, 202, "outcome", { size: 17, fill: BLUE, weight: 700 });
    run.outcome.ids.forEach((id, i) => token(g2, x0 + i * st, 175, bw, bw, id, i < np ? {} : ORANGE_TOK));
    bracket(g2, x0, x0 + np * st - 4, 223, GRAY, "the same prompt");
    bracket(g2, x0 + np * st, x0 + (np + 3) * st - 4, 223, ORANGE, ": sₙ EOS");

    const g3 = group(svg, 3);
    curve(g3, `M736,186 Q${cx(np + 1) + 40},150 ${cx(np + 1) + 2},171`, ORANGE, svg.mk.o);
    text(g3, 742, 192, "one value carries", { size: 15, fill: ORANGE, weight: 700 });
    text(g3, 742, 211, `all n = ${N} letters`, { size: 15, fill: ORANGE, weight: 700 });
    return svg;
  }

  // ------------------------------------------------------------------ slide 3: residual slots
  const SLOT_FILL = { TL: "#e0e7ff", TV: "#e0e7ff", POS: "#e0e7ff", QRY: "#dcfce7", MATCH: "#dcfce7",
                      PREV: "#ffedd5", MT: "#ffedd5", CNT: "#fef9c3", S0: "#fef9c3", OUT: "#fde2e2" };
  const SLOT_INFO = {
    TL: ["A", "letter one-hot", "E_{\\mathrm{tok}}", "block 0 (head 0, MLP)"],
    TV: ["m", "value one-hot", "E_{\\mathrm{tok}}", "proc heads 0, 2; out head 1"],
    POS: ["P", "position one-hot", "E_{\\mathrm{pos}} = I", "\\text{all } W^Q, W^K;\\ R[{:}], R[\\mathrm{EOS}]"],
    QRY: ["A", "e_q", "block 0, head 0", "block-0 MLP"],
    MATCH: ["1", "[w_t = q]", "block-0 MLP", "proc head 1; out head 0"],
    PREV: ["m", "e_{s_{t-1}}", "proc head 0", "proc MLP"],
    MT: ["1", "[w_t = q]\\ \\text{at the predicting row}", "proc head 1", "proc MLP"],
    CNT: ["1", "c = \\textstyle\\sum_t [w_t = q]", "out head 0", "out bumps"],
    S0: ["m", "e_{s_0}", "out head 1", "out bump gates"],
    OUT: ["m", "e_{\\text{next value}}", "proc MLP, head 2; out bumps", "R[A{+}v, \\mathrm{OUT}_v] = 20"],
  };

  function figSlots() {
    const svg = newSvg(900, 225, "hc-slots"), x0 = 40, u = 20;
    const X = (name) => x0 + SLOT[name].start * u;
    for (const [name, size] of SLOT_SIZES) {
      const x = X(name), w = size * u, sel = state.slot === name;
      const r = box(svg, x, 92, w, 46, { rx: 0, fill: SLOT_FILL[name], stroke: sel ? BLUE : "#64748b",
                                          sw: sel ? 3 : 1 });
      r.style.cursor = "pointer";
      r.addEventListener("click", () => { state.slot = name; refresh(["slots", "slotinfo"]); });
      if (size > 1) {
        text(svg, x + w / 2, 114, name, { size: 15, weight: 700, anchor: "middle" });
        text(svg, x + w / 2, 131, String(size), { size: 12, fill: GRAY, anchor: "middle" });
        text(svg, x + w / 2, 160, `${SLOT[name].start}–${SLOT[name].start + size - 1}`,
             { size: 12, fill: GRAY, anchor: "middle" });
      }
    }
    [["MATCH", 176], ["MT", 194], ["CNT", 212]].forEach(([name, y]) => {
      const x = X(name) + 10;
      node("line", { x1: x, y1: 138, x2: x, y2: y - 13, stroke: GRAY, "stroke-width": 1 }, svg);
      text(svg, x, y, `${name} · ${SLOT[name].start}`, { size: 12, weight: 700, anchor: "middle" });
    });
    text(svg, x0, 160, "index", { size: 12, fill: GRAY, anchor: "end" });
    overBracket(group(svg, 1), X("TL") + 2, X("QRY") - 2, 60, BLUE, "written by the embeddings");
    overBracket(group(svg, 2), X("QRY") + 2, X("PREV") - 2, 60, GREEN, "block 0");
    const g3 = group(svg, 3);
    overBracket(g3, X("PREV") + 2, X("CNT") - 2, 38, ORANGE, "process");
    overBracket(g3, X("CNT") + 2, X("OUT") - 2, 60, "#a16207", "outcome");
    overBracket(g3, X("OUT") + 2, X("OUT") + 58, 38, "#b91c1c", "both");
    const g4 = group(svg, 4);
    down(g4, X("OUT") + 30, 142, 186, ORANGE, svg.mk.o, 2);
    text(g4, X("OUT") + 30, 204, "readout", { size: 13, fill: ORANGE, weight: 700, anchor: "middle" });
    return svg;
  }

  function slotInfo() {
    const out = el("p", "hc-info");
    if (!state.slot) {
      out.textContent = "Click a slot.";
      return out;
    }
    const [size, what, writer, reader] = SLOT_INFO[state.slot], s = SLOT[state.slot];
    const idx = s.size > 1 ? `x_{${s.start}:${s.start + s.size - 1}}` : `x_{${s.start}}`;
    const name = `\\mathrm{${state.slot}}`;
    out.textContent = `\\(${name} = ${idx} \\in \\mathbb{R}^{${size}}\\)  ·  ${texOrText(what)}  ·  write: ${texOrText(writer)}  ·  read: ${texOrText(reader)}`;
    return out;
  }

  const texOrText = (s) => (/[\\_^{]/.test(s) ? `\\(${s}\\)` : s);

  // ------------------------------------------------------------------ slide 4: attention maps
  const HEADS = {
    b0h0: { prog: "process", b: 0, h: 0, label: "Block 0",
            note: "\\(i \\in [2, n{+}1] \\to 1\\)  (\\(w_t\\) reads \\(q\\))" },
    p1h0: { prog: "process", b: 1, h: 0, label: "Proc h0",
            note: "\\(n{+}1{+}t \\to n{+}1{+}t\\)  (\\(s_{t-1}\\));  SEP \\(\\to 0\\)  (\\(s_0\\))" },
    p1h1: { prog: "process", b: 1, h: 1, label: "Proc h1",
            note: "\\(n{+}1{+}t \\to t{+}1\\)  (mark of \\(w_t\\))" },
    p1h2: { prog: "process", b: 1, h: 2, label: "Proc h2",
            note: "\\({:} \\to 2n{+}2\\)  (\\(s_n\\));  others \\(\\to 1\\)" },
    o1h0: { prog: "outcome", b: 1, h: 0, label: "Out h0",
            note: "\\({:} \\to \\{2, \\dots, n{+}1\\}\\), weight \\(1/n\\) each" },
    o1h1: { prog: "outcome", b: 1, h: 1, label: "Out h1",
            note: "\\({:} \\to 0\\)  (\\(s_0\\))" },
  };

  function headControls() {
    return Object.entries(HEADS).map(([key, o]) =>
      btn(o.label, state.head === key, () => { state.head = key; refresh(["heads", "fig4"]); }));
  }

  function fig4() {
    const o = HEADS[state.head], r = run[o.prog], a = r.trace.blocks[o.b].att[o.h], T = r.ids.length;
    const cell = 16, m0 = 50, size = m0 + T * cell + 4;
    const wrap = el("div");
    const svg = newSvg(size, size);
    for (let i = 0; i < T; i++) {
      text(svg, m0 - 5, m0 + i * cell + 12, `${i} ${tok(r.ids[i])}`, { size: 9.5, fill: GRAY, anchor: "end" });
      text(svg, m0 + i * cell + cell / 2, m0 - 5, tok(r.ids[i]), { size: 9.5, fill: GRAY, anchor: "middle" });
      for (let j = 0; j < T; j++) {
        const w = a[i][j];
        const rect = box(svg, m0 + j * cell, m0 + i * cell, cell, cell,
                         { rx: 0, fill: j > i ? "#f3f4f6" : mix(BLUE, Math.sqrt(w)), stroke: "#e5e7eb", sw: 0.5 });
        node("title", {}, rect, j > i ? "masked (future)" : `query row ${i} → key row ${j}: weight ${w.toPrecision(3)}`);
      }
    }
    text(svg, m0, 14, "key position j →", { size: 11, fill: GRAY });
    text(svg, 4, 28, "query i ↓", { size: 11, fill: GRAY });
    const fig = el("div", "fig hc-heat");
    fig.append(svg);
    wrap.append(fig, el("p", "hc-info", o.note));
    return wrap;
  }

  // ------------------------------------------------------------------ slide 5: block 0
  function fig5() {
    const svg = newSvg(900, 352), tr = run.process.trace, ids = run.process.ids, y = 105;
    const b0 = tr.blocks[0], qx = 60;
    token(svg, qx, y, 70, 42, ids[1], BLUE_HI);
    text(svg, qx + 35, y - 6, "row 1: q", { size: 11, fill: GRAY, anchor: "middle" });
    const g1 = group(svg, 1), g2 = group(svg, 2), g3 = group(svg, 3);
    text(g1, 470, 22, "head 0: QRY ← TL(row 1) = e_q",
         { size: 15, fill: ORANGE, weight: 700, anchor: "middle" });
    text(g2, 20, y + 112, "best unit", { size: 15, weight: 700 });
    text(g2, 20, y + 129, "pre-activation", { size: 12, fill: GRAY });
    text(g3, 20, y + 192, "MATCH", { size: 15, weight: 700 });
    let hitCaption = false, missCaption = false;
    for (let t = 1; t <= N; t++) {
      const row = t + 1, x = 210 + (t - 1) * 110, c = x + 35;
      const match = b0.x[row][at("MATCH")], best = Math.max(...b0.pre[row].slice(0, A));
      const hit = match > 0.5;
      token(svg, x, y, 70, 42, ids[row]);
      text(svg, c, y - 6, `t = ${t}`, { size: 11, fill: GRAY, anchor: "middle" });
      arc(g1, c, qx + 35, y - 14, 40 + 12 * t, ORANGE, svg.mk.o, 1.6);
      down(g2, c, y + 46, y + 86, GRAY, svg.mk.g);
      text(g2, c, y + 116, fmt(best, 1), { size: 19, weight: 700, anchor: "middle", fill: hit ? ORANGE : GRAY });
      down(g3, c, y + 126, y + 162, GRAY, svg.mk.g);
      box(g3, x, y + 167, 70, 42, hit ? { fill: "#eff6ff", stroke: BLUE, sw: 2 } : { stroke: "#cbd5e1", sw: 2 });
      text(g3, c, y + 195, plain(match), { size: 20, weight: 700, anchor: "middle", fill: hit ? BLUE : GRAY });
      if (hit && !hitCaption) {
        hitCaption = true;
        text(g3, c, y + 238, "1 + 1 − 1.5 = 0.5, ReLU × 2 = 1", { size: 14, fill: ORANGE, weight: 700, anchor: "middle" });
      } else if (!hit && !missCaption) {
        missCaption = true;
        text(g3, c, y + 238, "0 + 1 − 1.5 < 0, ReLU = 0", { size: 14, fill: GRAY, anchor: "middle" });
      }
    }
    return svg;
  }

  // ------------------------------------------------------------------ slide 6: process block 1
  let timer = null;

  function stopPlay() { if (timer) { clearInterval(timer); timer = null; } }

  function togglePlay() {
    if (timer) stopPlay();
    else {
      timer = setInterval(() => {
        const host = document.querySelector('[data-hc="fig6"]');
        if (!host || !host.closest(".slide.is-on")) { stopPlay(); refresh(["ctl6"]); return; }
        state.t = (state.t % N) + 1;
        refresh(["ctl6", "fig6"]);
      }, 1400);
    }
    refresh(["ctl6"]);
  }

  function randomWord() {
    const rnd = (k) => Math.floor(Math.random() * k);
    state.q = rnd(A);
    state.s0 = rnd(M);
    state.word = range(0, N).map(() => (Math.random() < 0.4 ? state.q : rnd(A)));
    renderAll();
  }

  function ctl6() {
    const setT = (t) => { state.t = Math.min(N, Math.max(1, t)); refresh(["ctl6", "fig6"]); };
    return [
      el("span", "lbl", "Step"),
      btn("◀", false, () => setT(state.t - 1)),
      el("span", "hc-val", `t = ${state.t}`),
      btn("▶", false, () => setT(state.t + 1)),
      btn(timer ? "Pause" : "Play all t", !!timer, togglePlay),
      btn("New word", false, randomWord),
    ];
  }

  function fig6() {
    const svg = newSvg(910, 330), ids = run.process.ids, tr = run.process.trace, b1 = tr.blocks[1];
    const x0 = 15, st = 49, bw = 45, y = 150, t = state.t, r = N + 1 + t, prevRow = t === 1 ? 0 : r;
    const markRow = t + 1, cx = (i) => x0 + i * st + bw / 2;
    const prevVec = Array.from(b1.xAttn[r].slice(at("PREV"), at("PREV") + V));
    const prevVal = argmax(prevVec), mt = b1.xAttn[r][at("MT")];
    const emitted = argmax(tr.logits[r]), gold = A + run.states[t - 1];
    ids.forEach((id, i) => {
      let style = {};
      if (i === r) style = BLUE_HI;
      else if (i === markRow) style = ORANGE_HI;
      else if (i === prevRow) style = { stroke: BLUE, sw: 2.5 };
      token(svg, x0 + i * st, y, bw, 42, id, style);
      text(svg, cx(i), y - 6, String(i), { size: 11, fill: GRAY, anchor: "middle" });
    });
    text(svg, cx(2), y + 64, "w₁ … w₆", { size: 13, fill: GRAY, anchor: "start" });
    text(svg, cx(N + 3), y + 64, "emitted s₁ … s₆", { size: 13, fill: GRAY, anchor: "start" });

    const g1 = group(svg, 1);
    if (t === 1) arc(g1, cx(r), cx(0), y - 12, 120, BLUE, svg.mk.b);
    else loop(g1, cx(r), y - 12, BLUE, svg.mk.b);
    text(g1, 15, 22, `head 0: PREV ← TV of row ${prevRow} = s${sub(t - 1)} = ${prevVal}`,
         { size: 15, fill: BLUE, weight: 700 });
    const g2 = group(svg, 2);
    arc(g2, cx(r), cx(markRow), y - 12, Math.min(160, 30 + 0.26 * Math.abs(cx(r) - cx(markRow))), ORANGE, svg.mk.o);
    text(g2, 15, 44, `head 1: MT ← MATCH of row ${markRow} (w${sub(t)} = ${tok(ids[markRow])}) = ${plain(mt)}`,
         { size: 15, fill: ORANGE, weight: 700 });

    const g3 = group(svg, 3);
    down(g3, cx(r), y + 46, y + 70, BLUE, svg.mk.b, 2);
    text(g3, 30, 228, `block-1 MLP at row ${r}: 2m = ${2 * M} units`, { size: 14, fill: GRAY, weight: 700 });
    let fired = -1;
    for (let k = 0; k < 2 * M; k++) {
      const x = 50 + k * 72, pre = b1.pre[r][k], h = b1.hid[r][k];
      if (h > 0.25) fired = k;
      box(g3, x, 300 - h * 100, 34, Math.max(1, h * 100), { rx: 2, fill: h > 0.25 ? BLUE : "#cbd5e1", stroke: "none" });
      node("line", { x1: x - 8, y1: 300, x2: x + 42, y2: 300, stroke: "#94a3b8", "stroke-width": 1 }, g3);
      text(g3, x + 17, 300 - h * 100 - 6, fmt(pre, 1), { size: 12, anchor: "middle", fill: h > 0.25 ? BLUE : GRAY });
      text(g3, x + 17, 320, `u${sup(k % 2)}${sub(k >> 1)}`, { size: 15, anchor: "middle", weight: 700 });
    }
    if (fired >= 0) {
      const j = fired >> 1, kind = fired % 2, target = kind ? (j + 1) % M : j;
      const lines = [
        `PREV = e${sub(prevVal)},  MT = ${plain(mt)}`,
        `u${sup(kind)}${sub(j)} = ReLU(1 ${kind ? "+" : "−"} ${plain(mt)} − ${kind ? "1.5" : "0.5"}) = 0.5`,
        `OUT${sub(target)} += 2 × 0.5 = 1`,
        `logit 20 → emits ${tok(emitted)}   (gold s${sub(t)} = ${tok(gold)}) ${emitted === gold ? "✓" : "✗"}`,
      ];
      lines.forEach((s, i) => text(g3, 900, 246 + i * 22, s,
        { size: 15, anchor: "end", fill: i === 3 ? GREEN : INK, weight: i === 3 ? 700 : 400 }));
    }

    const g4 = group(svg, 4), colon = 2 * N + 3;
    arc(g4, cx(colon), cx(colon - 1), y - 12, 34, GRAY, svg.mk.g, 1.6);
    text(g4, 900, 96, "head 2 at ':': OUT ← sₙ", { size: 13, fill: GRAY, weight: 700, anchor: "end" });
    return svg;
  }

  // ------------------------------------------------------------------ slide 7: outcome block 1
  function ctl7() {
    const setS0 = (v) => { state.s0 = v; renderAll(); };
    return [
      s0Label(),
      ...range(0, M).map((v) => btn(String(v), state.s0 === v, () => setS0(v))),
      el("span", "lbl", "query"),
      ...range(0, A).map((a) => btn(LETTERS[a], state.q === a, () => { state.q = a; renderAll(); }, "letter")),
      btn("New word", false, randomWord),
    ];
  }

  function fig7() {
    const svg = newSvg(920, 348), ids = run.outcome.ids, tr = run.outcome.trace, b1 = tr.blocks[1];
    const x0 = 60, st = 86, bw = 58, y = 150, ans = N + 3, cx = (i) => x0 + i * st + bw / 2;
    const att = b1.att[0][ans], cnt = b1.xAttn[ans][at("CNT")];
    const s0Vec = Array.from(b1.xAttn[ans].slice(at("S0"), at("S0") + V)), j = argmax(s0Vec);
    const emitted = argmax(tr.logits[ans]), gold = A + run.states[N - 1];
    for (let i = 0; i <= ans; i++) {
      token(svg, x0 + i * st, y, bw, 42, ids[i], i === ans ? BLUE_HI : i === 0 ? { stroke: BLUE, sw: 2.5 } : {});
      text(svg, cx(i), y - 6, String(i), { size: 11, fill: GRAY, anchor: "middle" });
    }
    const g1 = group(svg, 1);
    for (let i = 2; i < N + 2; i++) arc(g1, cx(ans) - 4, cx(i) + 4, y - 12, 50 + 11 * (N + 2 - i), ORANGE, svg.mk.o, 1.6);
    text(g1, 20, 44, `head 0: weight ${att[2].toFixed(3)} = 1/${N} per letter → CNT`,
         { size: 15, fill: ORANGE, weight: 700 });
    let ones = 0;
    for (let i = 2; i < N + 2; i++) {
      const b = tr.blocks[0].x[i][at("MATCH")] > 0.5;
      ones += b ? 1 : 0;
      text(g1, cx(i), y + 66, `mark ${b ? 1 : 0}`, { size: 13, fill: b ? BLUE : GRAY, anchor: "middle", weight: b ? 700 : 400 });
    }
    down(g1, cx(ans), y + 46, y + 70, BLUE, svg.mk.b, 2);
    text(g1, cx(ans) + 20, y + 92, `CNT = ${N} × ${ones}/${N} = ${plain(cnt)}`,
         { size: 15, fill: BLUE, weight: 700, anchor: "end" });
    const g2 = group(svg, 2);
    arc(g2, cx(ans) - 8, cx(0), y - 12, 150, BLUE, svg.mk.b);
    text(g2, 20, 22, `head 1: S0 ← TV of row 0 = e${sub(j)}`, { size: 15, fill: BLUE, weight: 700 });

    const g3 = group(svg, 3), base = 318, per = 3 * (N + 1);
    text(g3, 60, 262, `bump group j = s₀ = ${j}: β_c′(CNT) for c′ = 0 … ${N}`, { size: 14, fill: GRAY, weight: 700 });
    let fired = -1;
    for (let c = 0; c <= N; c++) {
      const u = j * per + 3 * c, hid = b1.hid[ans];
      const beta = hid[u] - 2 * hid[u + 1] + hid[u + 2], x = 70 + c * 62;
      if (beta > 0.5) fired = c;
      box(g3, x, base - beta * 40, 30, Math.max(1, beta * 40), { rx: 2, fill: beta > 0.5 ? ORANGE : "#cbd5e1", stroke: "none" });
      node("line", { x1: x - 8, y1: base, x2: x + 38, y2: base, stroke: "#94a3b8", "stroke-width": 1 }, g3);
      text(g3, x + 15, base + 18, `c′=${c}`, { size: 13, anchor: "middle", weight: beta > 0.5 ? 700 : 400 });
    }
    if (fired >= 0) {
      const target = (j + fired) % M;
      [`bump (j = ${j}, c′ = ${fired}) fires: β = 1`,
       `OUT at (${j} + ${fired}) mod ${M} = ${target}`,
       `emits ${tok(emitted)}   (gold sₙ = ${tok(gold)}) ${emitted === gold ? "✓" : "✗"}`]
        .forEach((s, i) => text(g3, 905, 282 + i * 22, s,
          { size: 15, anchor: "end", fill: i === 2 ? GREEN : ORANGE, weight: 700 }));
    }
    return svg;
  }

  // ------------------------------------------------------------------ slide 8: playground
  function ctl8() {
    const out = [el("span", "lbl", "query q")];
    range(0, A).forEach((a) => out.push(btn(LETTERS[a], state.q === a, () => { state.q = a; renderAll(); }, "letter")));
    out.push(s0Label());
    range(0, M).forEach((v) => out.push(btn(String(v), state.s0 === v, () => { state.s0 = v; renderAll(); })));
    out.push(el("span", "lbl", "word (click to change)"));
    state.word.forEach((c, i) => out.push(btn(LETTERS[c], c === state.q, () => {
      state.word[i] = (state.word[i] + 1) % A;
      renderAll();
    }, "letter")));
    out.push(btn("Random", false, randomWord));
    out.push(btn("Reset", false, () => {
      Object.assign(state, { s0: DEFAULT.s0, q: DEFAULT.q, word: DEFAULT.word.slice() });
      renderAll();
    }));
    return out;
  }

  function outputs() {
    const wrap = el("div", "hc-outputs");
    for (const prog of ["process", "outcome"]) {
      const ids = run[prog].ids, gold = run.gold[prog], ok = ids.every((v, i) => v === gold[i]);
      const line = el("div", "hc-out-line");
      line.append(el("span", "hc-out-name", prog));
      ids.slice(N + 3).forEach((id) => line.append(el("span", "hc-chip" + (isValue(id) ? " val" : ""), tok(id))));
      line.append(el("span", ok ? "hc-ok" : "hc-bad", ok ? "✓ matches the gold row" : "✗ differs from gold"));
      wrap.append(line);
    }
    return wrap;
  }

  function ctl8b() {
    const set = (k, v) => { state[k] = v; refresh(["ctl8b", "fig8"]); };
    return [
      el("span", "lbl", "Residual stream of"),
      btn("process", state.prog === "process", () => set("prog", "process")),
      btn("outcome", state.prog === "outcome", () => set("prog", "outcome")),
      el("span", "lbl", "after"),
      btn("embedding", state.layer === 0, () => set("layer", 0)),
      btn("block 0", state.layer === 1, () => set("layer", 1)),
      btn("block 1", state.layer === 2, () => set("layer", 2)),
    ];
  }

  function fig8() {
    const r = run[state.prog], ids = r.ids, T = ids.length;
    const X = state.layer === 0 ? r.trace.x0 : r.trace.blocks[state.layer - 1].x;
    const cw = 14, ch = 13, ml = 44, mt = 34;
    const svg = newSvg(ml + W * cw + 4, mt + P * ch + 4);
    for (const [name, size] of SLOT_SIZES) {
      const x = ml + SLOT[name].start * cw;
      text(svg, x + (size * cw) / 2, mt - 6, size >= 3 ? name : name[0], { size: 10, fill: GRAY, anchor: "middle", weight: 700 });
      node("title", {}, svg.lastChild, name);
    }
    for (let i = 0; i < T; i++) {
      text(svg, ml - 4, mt + i * ch + 10, `${i} ${tok(ids[i])}`, { size: 9, fill: GRAY, anchor: "end" });
      for (let w = 0; w < W; w++) {
        const v = X[i][w], name = SLOT_SIZES.find(([n]) => w >= SLOT[n].start && w < SLOT[n].start + SLOT[n].size)[0];
        const fill = Math.abs(v) < 1e-6 ? "#ffffff" : v > 0 ? mix(BLUE, Math.min(1, v)) : mix("#b91c1c", Math.min(1, -v));
        const rect = box(svg, ml + w * cw, mt + i * ch, cw, ch, { rx: 0, fill, stroke: "#eef2f7", sw: 0.5 });
        node("title", {}, rect, `row ${i} (${tok(ids[i])}), ${name}[${w - SLOT[name].start}] = ${v.toFixed(3)}`);
      }
    }
    for (const [name] of SLOT_SIZES) {
      const x = ml + SLOT[name].start * cw;
      node("line", { x1: x, y1: mt - 2, x2: x, y2: mt + T * ch, stroke: "#64748b", "stroke-width": 0.8 }, svg);
    }
    const fig = el("div", "fig hc-heat");
    fig.append(svg);
    return fig;
  }

  // ------------------------------------------------------------------ wiring
  const RENDER = {
    fig1, slots: figSlots, slotinfo: slotInfo, heads: headControls, fig4, fig5,
    ctl6, fig6, ctl7, fig7, ctl8, outputs, ctl8b, fig8,
  };

  function refresh(names) {
    for (const name of names) {
      document.querySelectorAll(`[data-hc="${name}"]`).forEach((host) => paint(host, RENDER[name]));
    }
    const mj = window.MathJax, tex = names.filter((n) => TEX_HOSTS.includes(n));
    if (!tex.length || !mj) return;
    const hosts = tex.flatMap((n) => Array.from(document.querySelectorAll(`[data-hc="${n}"]`)));
    const ready = mj.startup && mj.startup.promise ? mj.startup.promise : Promise.resolve();
    ready.then(() => mj.typesetPromise && mj.typesetPromise(hosts)).catch(() => {});
  }

  const TEX_HOSTS = ["slotinfo", "fig4"];

  function renderAll() {
    compute();
    refresh(Object.keys(RENDER));
  }

  function init() {
    document.querySelectorAll("[data-hc]").forEach((host) => {
      host.addEventListener("click", (event) => {
        if (event.target.closest("button, rect")) event.stopPropagation();
      });
    });
    document.querySelectorAll(".hc-controls").forEach((c) => c.addEventListener("click", (e) => e.stopPropagation()));
    renderAll();
  }

  window.HandcodedModel = { forward, generate, PARAMS, SLOT, W, P, F, GAP, C, A, N, M, VOCAB };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
