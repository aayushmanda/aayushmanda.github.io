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
      const xIn = copyRows(x), delta = zeros(T, W), att = [], heads = [];
      for (let h = 0; h < H; h++) {
        const q = x.map((r) => matvec(blk.q[h], r));
        const k = x.map((r) => matvec(blk.k[h], r));
        const v = x.map((r) => matvec(blk.v[h], r));
        const a = zeros(T, T), sc = zeros(T, T), o = zeros(T, W);
        for (let i = 0; i < T; i++) {
          const s = range(0, i + 1).map((j) => dot(q[i], k[j]) / Math.sqrt(P));
          const mx = Math.max(...s), e = s.map((z) => Math.exp(z - mx));
          const zsum = e.reduce((acc, z) => acc + z, 0);
          for (let j = 0; j < T; j++) sc[i][j] = j <= i ? s[j] : -Infinity;
          for (let j = 0; j <= i; j++) {
            a[i][j] = e[j] / zsum;
            for (let w = 0; w < W; w++) o[i][w] += a[i][j] * v[j][w];
          }
        }
        for (let i = 0; i < T; i++) for (let w = 0; w < W; w++) delta[i][w] += o[i][w];
        att.push(a);
        heads.push({ q, k, v, s: sc, a, o });
      }
      for (let i = 0; i < T; i++) for (let w = 0; w < W; w++) x[i][w] += delta[i][w];
      const xAttn = copyRows(x), pre = [], hid = [], mlpOut = [];
      for (let i = 0; i < T; i++) {
        const pr = matvec(blk.win, x[i]).map((z, u) => z + blk.bin[u]);
        const hd = pr.map((z) => Math.max(0, z));
        const out = matvec(blk.wout, hd);
        for (let w = 0; w < W; w++) x[i][w] += out[w];
        pre.push(pr);
        hid.push(hd);
        mlpOut.push(out);
      }
      trace.blocks.push({ xIn, heads, att, xAttn, pre, hid, mlpOut, x: copyRows(x) });
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
    const svg = newSvg(900, 372), tr = run.process.trace, ids = run.process.ids, y = 105;
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
        text(g3, c, y + 258, "1 + 1 − 1.5 = 0.5, ReLU × 2 = 1", { size: 14, fill: ORANGE, weight: 700, anchor: "middle" });
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

  // ------------------------------------------------------------------ matrix walkthrough
  // Every head and MLP of both blocks drawn as explicit matrix products of the live run.
  // A product C = A·B is laid out with B above C and A to its left, so row i of A and
  // column j of B meet at C[i, j].
  const KIND_LABEL = { blk0: "block 0", q: "Q", k: "K", s: "scores", a: "softmax", v: "V", o: "A·V",
                       zero: "unused head", add: "add heads", pre: "XWᵀ + b", relu: "ReLU", out: "HWᵀ",
                       res: "add MLP", read: "logits" };
  const CS = 10, RED = "#b91c1c";
  const SLOT_OF = [];
  for (const [name, size] of SLOT_SIZES) for (let i = 0; i < size; i++) SLOT_OF.push(name);
  const slotLab = (w) => { const n = SLOT_OF[w]; return SLOT[n].size > 1 ? n + sub(w - SLOT[n].start) : n; };
  const tp = (mat) => Array.from({ length: mat[0].length }, (_, j) => Float64Array.from(mat, (r) => r[j]));
  const cols = (mat, idx) => mat.map((r) => Float64Array.from(idx, (c) => r[c]));
  const diff = (X, Y) => X.map((r, i) => Float64Array.from(r, (v, w) => v - Y[i][w]));
  const argmaxAbs = (r) => {
    let best = 0;
    for (let i = 0; i < r.length; i++) if (isFinite(r[i]) && Math.abs(r[i]) > Math.abs(isFinite(r[best]) ? r[best] : 0)) best = i;
    return best;
  };
  const fmtV = (v) => {
    if (v === -Infinity) return "−∞";
    const a = Math.abs(v);
    if (a < 5e-10) return "0";
    const s = a >= 1e-3 ? String(Number(a.toFixed(a >= 100 ? 1 : 3))) : a.toExponential(1);
    return (v < 0 ? "−" : "") + s;
  };
  const hn = (nm) => `${nm[0]}${nm[2] ? `<sub>${nm[2]}</sub>` : ""}${nm[1] ? `<sup>${nm[1]}</sup>` : ""}`;
  const shapeOf = (spec) => `${spec.M.length}×${spec.M[0].length}`;

  function usedUnits(blk) {
    return range(0, F).filter((u) => blk.bin[u] !== 0 || blk.win[u].some((v) => v !== 0));
  }

  function mxStages(prog) {
    const p = PARAMS[prog], out = [];
    const used = (b, h) => p.blocks[b].v[h].some((r) => r.some((v) => v !== 0));
    if (prog === "outcome") out.push({ b: 0, kind: "blk0", op: "Block 0" });
    for (const b of prog === "process" ? [0, 1] : [1]) {
      for (let h = 0; h < H; h++) {
        const op = `B${b} head ${h}`;
        if (!used(b, h)) out.push({ b, h, kind: "zero", op });
        else for (const kind of ["q", "k", "s", "a", "v", "o"]) out.push({ b, h, kind, op });
      }
      out.push({ b, kind: "add", op: `B${b} add` });
      for (const kind of ["pre", "relu", "out", "res"]) out.push({ b, kind, op: `B${b} MLP` });
    }
    out.push({ b: L - 1, kind: "read", op: "Readout" });
    return out;
  }

  const STAGES = { process: mxStages("process"), outcome: mxStages("outcome") };
  const MX = { process: { idx: 0, focus: null, anim: true }, outcome: { idx: 0, focus: null, anim: true } };
  const mxNames = (prog) => ["ctl", "fig", "side"].map((k) => `mx${k}${prog[0]}`);
  let mxDir = 1;

  const HEAD_INTENT = {
    "0 0": "every letter row (2–" + (N + 1) + ") points at row 1, the query letter; other rows point at row 0.",
    "process 1 0": `each state row points at itself (it holds s<sub>t−1</sub>), and SEP (row ${N + 2}) points at row 0, which holds s<sub>0</sub>; other rows point at row 1.`,
    "process 1 1": `the state row ${N + 1}+t points at row 1+t, the letter w<sub>t</sub>; other rows point at row 0.`,
    "process 1 2": `row ${2 * N + 3} (':') points at row ${2 * N + 2}, which holds s<sub>n</sub>; other rows point at row 1.`,
    "outcome 1 0": `row ${N + 3} (':') points at every letter row 2–${N + 1} at once; other rows point at row 0.`,
    "outcome 1 1": `row ${N + 3} (':') points at row 0, which holds s<sub>0</sub>; other rows point at row 1.`,
  };
  const HEAD_RESULT = {
    "0 0": "QRY of every letter row now holds e<sub>q</sub>.",
    "process 1 0": "PREV of each state row now holds e<sub>s<sub>t−1</sub></sub>.",
    "process 1 1": "MT of each state row now holds the mark [w<sub>t</sub> = q].",
    "process 1 2": "OUT of row ':' now holds e<sub>s<sub>n</sub></sub>.",
    "outcome 1 0": `CNT of row ':' = ${N} × (average mark) = the number of matches c.`,
    "outcome 1 1": "S0 of row ':' now holds e<sub>s<sub>0</sub></sub>.",
  };
  const headKey = (prog, st) => (st.b === 0 ? "0 0" : `${prog} ${st.b} ${st.h}`);

  function mlpIntent(prog, b) {
    if (b === 0) return `${A} units, one AND gate per letter a: Z = TL<sub>a</sub> + QRY<sub>a</sub> − 1.5. W<sub>out</sub> writes 2·H into MATCH.`;
    if (prog === "process") return `${2 * M} units, two per state value j: PREV<sub>j</sub> − MT − 0.5 (no match: stay at j) and PREV<sub>j</sub> + MT − 1.5 (match: move to j+1). W<sub>out</sub> writes 2·H into OUT.`;
    return `${3 * M * (N + 1)} units, three per pair (s<sub>0</sub> = j, count c): Z = CNT − c + k + ${N + 2}(S0<sub>j</sub> − 1), k ∈ {+1, 0, −1}. W<sub>out</sub> weights (1, −2, 1) turn each triple into a spike that is 1 only when CNT = c and j = s<sub>0</sub>, written to OUT<sub>(j+c) mod ${M}</sub>.`;
  }

  function vCopies(Wv) {
    const pairs = new Map();
    for (let dst = 0; dst < W; dst++) {
      for (let src = 0; src < W; src++) if (Wv[dst][src]) pairs.set(`${SLOT_OF[src]} → ${SLOT_OF[dst]}`, Wv[dst][src]);
    }
    return [...pairs].map(([k, v]) => k + (v !== 1 ? ` (×${plain(v)})` : "")).join(", ");
  }

  function slotsTouched(mat) {
    const names = [];
    for (const [name, size] of SLOT_SIZES) {
      const s = SLOT[name].start;
      if (mat.some((r) => range(s, s + size).some((w) => Math.abs(r[w]) > 1e-6))) names.push(name);
    }
    return names.join(", ") || "none";
  }

  function defRow(prog, st) {
    if (st.kind === "read") return prog === "process" ? 2 * N + 3 : N + 3;
    if (st.b === 0) {
      const x = run[prog].trace.blocks[0].x;
      const r = range(2, N + 2).find((i) => x[i][at("MATCH")] > 0.5);
      return r === undefined ? 2 : r;
    }
    if (prog === "outcome") return N + 3;
    return st.h === 2 ? 2 * N + 3 : N + 1 + state.t;
  }

  function mxData(prog) {
    const st = STAGES[prog][MX[prog].idx], tr = run[prog].trace, ids = run[prog].ids, T = ids.length;
    const pr = PARAMS[prog], blk = pr.blocks[st.b], bt = tr.blocks[st.b];
    const hd = st.h === undefined ? null : bt.heads[st.h], units = usedUnits(blk);
    const X = { M: bt.xIn, nm: ["X"], r: "T", c: "W" };
    const d = { st, ids, T, layout: "falk", scale: 1, units };
    const side = (mats, ops) => Object.assign(d, { layout: "side", mats, ops });
    switch (st.kind) {
      case "q": case "k": {
        const up = st.kind.toUpperCase();
        Object.assign(d, { A: X, B: { M: tp(blk[st.kind][st.h]), nm: ["W", up + "⊤"], r: "W", c: "P" },
                           C: { M: hd[st.kind], nm: [up], r: "T", c: "P" } });
        break;
      }
      case "s":
        Object.assign(d, { A: { M: hd.q, nm: ["Q"], r: "T", c: "P" }, B: { M: tp(hd.k), nm: ["K", "⊤"], r: "P", c: "T" },
                           C: { M: hd.s, nm: ["S"], r: "T", c: "T" }, scale: 1 / Math.sqrt(P) });
        break;
      case "a":
        side([{ M: hd.s, nm: ["S"], r: "T", c: "T" }, { M: hd.a, nm: ["A"], r: "T", c: "T" }], ["softmax"]);
        break;
      case "v": case "zero":
        Object.assign(d, { A: X, B: { M: tp(blk.v[st.h]), nm: ["W", "V⊤"], r: "W", c: "W" },
                           C: { M: hd.v, nm: ["V"], r: "T", c: "W" } });
        break;
      case "o":
        Object.assign(d, { A: { M: hd.a, nm: ["A"], r: "T", c: "T" }, B: { M: hd.v, nm: ["V"], r: "T", c: "W" },
                           C: { M: hd.o, nm: ["ΔX", "", String(st.h)], r: "T", c: "W" } });
        break;
      case "add":
        side([X, { M: diff(bt.xAttn, bt.xIn), nm: ["ΣΔX"], r: "T", c: "W" }, { M: bt.xAttn, nm: ["X"], r: "T", c: "W" }], ["+", "="]);
        break;
      case "pre":
        Object.assign(d, { A: { M: bt.xAttn, nm: ["X"], r: "T", c: "W" },
                           B: { M: tp(units.map((u) => blk.win[u])), nm: ["W", "⊤", "in"], r: "W", c: "F", cmap: units },
                           C: { M: cols(bt.pre, units), nm: ["Z"], r: "T", c: "F", cmap: units },
                           bias: Float64Array.from(units, (u) => blk.bin[u]) });
        break;
      case "relu":
        side([{ M: cols(bt.pre, units), nm: ["Z"], r: "T", c: "F", cmap: units },
              { M: cols(bt.hid, units), nm: ["H"], r: "T", c: "F", cmap: units }], ["ReLU"]);
        break;
      case "out":
        Object.assign(d, { A: { M: cols(bt.hid, units), nm: ["H"], r: "T", c: "F", cmap: units },
                           B: { M: units.map((u) => Float64Array.from(range(0, W), (w) => blk.wout[w][u])),
                                nm: ["W", "⊤", "out"], r: "F", c: "W", rmap: units },
                           C: { M: bt.mlpOut, nm: ["ΔX"], r: "T", c: "W" } });
        break;
      case "res":
        side([{ M: bt.xAttn, nm: ["X"], r: "T", c: "W" }, { M: bt.mlpOut, nm: ["ΔX"], r: "T", c: "W" },
              { M: bt.x, nm: ["X"], r: "T", c: "W" }], ["+", "="]);
        break;
      case "blk0": {
        const b0 = tr.blocks[0];
        side([{ M: tr.x0, nm: ["X"], r: "T", c: "W" }, { M: diff(b0.x, tr.x0), nm: ["ΔX"], r: "T", c: "W" },
              { M: b0.x, nm: ["X"], r: "T", c: "W" }], ["+", "="]);
        break;
      }
      case "read":
        Object.assign(d, { A: { M: tr.blocks[L - 1].x, nm: ["X"], r: "T", c: "W" },
                           B: { M: tp(pr.readout), nm: ["R", "⊤"], r: "W", c: "V" },
                           C: { M: tr.logits, nm: ["logits"], r: "T", c: "V" }, pred: true });
        break;
    }
    const f = MX[prog].focus, i = Math.min(f ? f.i : defRow(prog, st), T - 1);
    const result = d.layout === "falk" ? d.C.M : d.mats[d.mats.length - 1].M;
    let j;
    if (f) j = f.j;
    else if (st.kind === "a") j = argmax(hd.a[i]);
    else if (d.layout === "side" && d.mats.length === 3) j = argmaxAbs(d.mats[1].M[i]);
    else j = argmaxAbs(result[i]);
    d.i = i;
    d.j = j;
    if (d.layout === "falk") {
      d.terms = range(0, d.A.M[0].length).map((kk) => [kk, d.A.M[i][kk], d.B.M[kk][j]])
        .filter(([, a, b]) => Math.abs(a * b) > 1e-9)
        .sort((x, y) => Math.abs(y[1] * y[2]) - Math.abs(x[1] * x[2]));
    }
    return d;
  }

  // ---- drawing
  // Full color at |v| >= 1, lighter below; leaks under 1e-4 are drawn white (click shows the exact value).
  const cellFill = (v) => (v === -Infinity ? "#e5e7eb" : Math.abs(v) < 1e-4 ? null
    : mix(v > 0 ? BLUE : RED, 0.3 + 0.7 * Math.min(1, Math.abs(v))));

  function drawMat(g, spec, x, y, o = {}) {
    const mat = spec.M, R = mat.length, Cn = mat[0].length;
    box(g, x, y, Cn * CS, R * CS, { rx: 0, fill: "#ffffff", stroke: "#94a3b8", sw: 0.8 });
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < Cn; c++) {
        const fill = cellFill(mat[r][c]);
        if (!fill && !o.pick) continue;
        const rect = node("rect", { x: x + c * CS, y: y + r * CS, width: CS, height: CS,
                                    fill: fill || "#ffffff", "fill-opacity": fill ? 1 : 0 }, g);
        if (o.pick) { rect.setAttribute("data-i", r); rect.setAttribute("data-j", c); }
        if (o.rowDelay && fill) {
          rect.setAttribute("class", "mx-in");
          rect.style.setProperty("--d", r * o.rowDelay + "ms");
        }
      }
    }
    const line = (x1, y1, x2, y2) => node("line", { x1, y1, x2, y2, stroke: "#cbd5e1", "stroke-width": 0.7 }, g);
    for (const [name] of SLOT_SIZES.slice(1)) {
      const s = SLOT[name].start * CS;
      if (spec.c === "W") line(x + s, y, x + s, y + R * CS);
      if (spec.r === "W") line(x, y + s, x + Cn * CS, y + s);
    }
  }

  function labelOf(kind, idx, map, ids) {
    if (kind === "T") return `row ${idx} (${tok(ids[idx])})`;
    if (kind === "W") return slotLab(idx);
    if (kind === "P") return `pos ${idx}`;
    if (kind === "F") return `u${map ? map[idx] : idx}`;
    if (kind === "V") return `“${tok(idx)}”`;
    return "b";
  }

  // Column labels above (which = "top", edge = y) or row labels to the left (which = "left", edge = x).
  function axisLabels(g, spec, which, start, edge, ids) {
    const top = which === "top", kind = top ? spec.c : spec.r, map = top ? spec.cmap : spec.rmap;
    const n = top ? spec.M[0].length : spec.M.length;
    const put = (pos, s, bold) => (top
      ? text(g, pos + 3, edge - 4, s, { size: 8, fill: bold ? INK : GRAY, weight: bold ? 700 : 400,
                                        transform: `rotate(-90 ${pos + 3} ${edge - 4})` })
      : text(g, edge - 4, pos + 3, s, { size: 8, fill: bold ? INK : GRAY, weight: bold ? 700 : 400, anchor: "end" }));
    if (kind === "W") {
      for (const [name, size] of SLOT_SIZES) put(start + (SLOT[name].start + size / 2) * CS, name, true);
      return;
    }
    const every = n > 24 ? 6 : 1;
    for (let k = 0; k < n; k += every) {
      const s = kind === "T" ? (top ? String(k) : `${k} ${tok(ids[k])}`) : kind === "V" ? tok(k)
        : kind === "F" ? `u${map ? map[k] : k}` : String(k);
      put(start + (k + 0.5) * CS, s);
    }
  }

  function svgName(p, x, y, nm, anchor) {
    const t = text(p, x, y, nm[0], { size: 13, weight: 700, anchor: anchor || "end", fill: BLUE });
    if (nm[2]) node("tspan", { dy: 3, "font-size": 9 }, t, nm[2]);
    if (nm[1]) node("tspan", { dy: nm[2] ? -9 : -6, "font-size": 9 }, t, nm[1]);
    return t;
  }

  function animate(svg, rows, rowMs, sweepY) {
    svg.style.setProperty("--dur", rows * rowMs + "ms");
    svg.style.setProperty("--rows", rows);
    svg.style.setProperty("--sweep", rows * CS + "px");
  }

  function falkSvg(d) {
    const { A: Am, B: Bm, C: Cm } = d, r = Am.M.length, k = Am.M[0].length, c = Bm.M[0].length;
    const lm = 64, tm = 50, gap = 46, bh = d.bias ? CS + 12 : 0, extra = d.pred ? 46 : 14;
    const Ax = lm, Bx = lm + k * CS + gap, By = tm, Ay = tm + k * CS + gap + bh, Cx = Bx, Cy = Ay;
    const svg = newSvg(Cx + c * CS + extra, Cy + r * CS + 12, "mx");
    const rowMs = Math.round(Math.min(90, 1400 / r));
    animate(svg, r, rowMs);
    drawMat(svg, Bm, Bx, By);
    drawMat(svg, Am, Ax, Ay);
    drawMat(svg, Cm, Cx, Cy, { pick: true, rowDelay: rowMs });
    if (d.bias) {
      drawMat(svg, { M: [d.bias], r: "1", c: Cm.c }, Cx, Cy - CS - 6);
      text(svg, Cx - 6, Cy - 6 - 2, "+ b", { size: 10, weight: 700, anchor: "end", fill: BLUE });
    }
    axisLabels(svg, Bm, "top", Bx, By, d.ids);
    axisLabels(svg, Bm, "left", By, Bx, d.ids);
    axisLabels(svg, Am, "top", Ax, Ay, d.ids);
    axisLabels(svg, Am, "left", Ay, Ax, d.ids);
    svgName(svg, Ax - 6, Ay - 10, Am.nm);
    svgName(svg, Bx - 6, By - 10, Bm.nm);
    svgName(svg, Cx - 6, Cy - (d.bias ? CS + 22 : 10), Cm.nm);
    if (k * CS >= 150) {
      const t = text(svg, lm + (k * CS) / 2, tm + (k * CS) / 2 - 4, "", { size: 15, anchor: "middle", fill: GRAY });
      t.textContent = `(${shapeOf(Am)}) · (${shapeOf(Bm)})`;
      text(svg, lm + (k * CS) / 2, tm + (k * CS) / 2 + 16, `→ ${shapeOf(Cm)}`, { size: 15, anchor: "middle", fill: GRAY });
    }
    if (d.pred) {
      for (let rr = 0; rr < r; rr++) {
        const p = argmax(Cm.M[rr]), next = d.ids[rr + 1], used = rr >= N + 2 && next !== undefined;
        const t = text(svg, Cx + c * CS + 6, Cy + rr * CS + 8, "→ " + tok(p),
                       { size: 8, weight: used ? 700 : 400, fill: !used ? "#9ca3af" : p === next ? GREEN : RED });
        t.setAttribute("class", "mx-in");
        t.style.setProperty("--d", rr * rowMs + "ms");
      }
    }
    const i = d.i, j = d.j, g = node("g", { class: "mx-late", "pointer-events": "none" }, svg);
    box(g, Ax, Ay + i * CS, Cx + (j + 1) * CS - Ax, CS, { rx: 0, fill: ORANGE, stroke: "none" }).setAttribute("fill-opacity", 0.1);
    box(g, Cx + j * CS, By, CS, Cy + (i + 1) * CS - By, { rx: 0, fill: ORANGE, stroke: "none" }).setAttribute("fill-opacity", 0.1);
    const outline = (x, y, w, h, color, sw) => node("rect", { x, y, width: w, height: h, fill: "none", stroke: color, "stroke-width": sw }, g);
    outline(Ax, Ay + i * CS, k * CS, CS, ORANGE, 1.2);
    outline(Bx + j * CS, By, CS, k * CS, ORANGE, 1.2);
    for (const [kk] of d.terms.slice(0, 12)) {
      outline(Ax + kk * CS, Ay + i * CS, CS, CS, ORANGE, 2.2);
      outline(Bx + j * CS, By + kk * CS, CS, CS, ORANGE, 2.2);
    }
    outline(Cx + j * CS, Cy + i * CS, CS, CS, INK, 2.4);
    node("rect", { x: Ax, y: Ay, width: Cx + c * CS - Ax, height: CS, fill: ORANGE, "fill-opacity": 0.22,
                   class: "mx-sweep", "pointer-events": "none" }, svg);
    return svg;
  }

  // X + ΔX = X: three matrices with the same columns, stacked so each stays large.
  function stackSvg(d) {
    const mats = d.mats, r = mats[0].M.length, c = mats[0].M[0].length, lm = 64, tm = 50, gap = 30;
    const ys = mats.map((_, n) => tm + n * (r * CS + gap)), width = lm + c * CS + 14;
    const svg = newSvg(width, ys[ys.length - 1] + r * CS + 10, "mx");
    const rowMs = Math.round(Math.min(90, 1400 / r));
    animate(svg, r, rowMs);
    axisLabels(svg, mats[0], "top", lm, tm, d.ids);
    mats.forEach((m, n) => {
      drawMat(svg, m, lm, ys[n], { pick: true, rowDelay: n === mats.length - 1 ? rowMs : 0 });
      axisLabels(svg, m, "left", ys[n], lm, d.ids);
      svgName(svg, lm - 6, ys[n] - 6, m.nm);
      if (n) text(svg, lm + (c * CS) / 2, ys[n] - 9, d.ops[n - 1], { size: 18, weight: 700, anchor: "middle", fill: ORANGE });
    });
    const i = d.i, j = d.j, g = node("g", { class: "mx-late", "pointer-events": "none" }, svg);
    for (const y of ys) {
      node("rect", { x: lm, y: y + i * CS, width: c * CS, height: CS, fill: ORANGE, "fill-opacity": 0.1, stroke: ORANGE, "stroke-width": 1.2 }, g);
      node("rect", { x: lm + j * CS, y: y + i * CS, width: CS, height: CS, fill: "none", stroke: INK, "stroke-width": 2.4 }, g);
    }
    node("rect", { x: lm, y: ys[ys.length - 1], width: c * CS, height: CS, fill: ORANGE, "fill-opacity": 0.22,
                   class: "mx-sweep", "pointer-events": "none" }, svg);
    return svg;
  }

  function sideSvg(d) {
    if (d.mats.length === 3) return stackSvg(d);
    const mats = d.mats, r = mats[0].M.length, lm = 64, tm = 50, gap = 64;
    let x = lm;
    const xs = mats.map((m) => { const x0 = x; x += m.M[0].length * CS + gap; return x0; });
    const width = x - gap + 14, svg = newSvg(width, tm + r * CS + 30, "mx");
    const rowMs = Math.round(Math.min(90, 1400 / r));
    animate(svg, r, rowMs);
    mats.forEach((m, n) => {
      const w = m.M[0].length * CS;
      drawMat(svg, m, xs[n], tm, { pick: true, rowDelay: n === mats.length - 1 ? rowMs : 0 });
      axisLabels(svg, m, "top", xs[n], tm, d.ids);
      svgName(svg, xs[n] + w / 2, tm + r * CS + 22, m.nm, "middle");
      if (n < d.ops.length) {
        text(svg, xs[n] + w + gap / 2, tm + (r * CS) / 2 + 5, d.ops[n],
             { size: d.ops[n].length > 1 ? 11 : 20, weight: 700, anchor: "middle", fill: ORANGE });
      }
    });
    axisLabels(svg, mats[0], "left", tm, lm, d.ids);
    const i = d.i, j = d.j, g = node("g", { class: "mx-late", "pointer-events": "none" }, svg);
    box(g, lm, tm + i * CS, width - 14 - lm, CS, { rx: 0, fill: ORANGE, stroke: "none" }).setAttribute("fill-opacity", 0.1);
    mats.forEach((m, n) => {
      node("rect", { x: xs[n], y: tm + i * CS, width: m.M[0].length * CS, height: CS, fill: "none", stroke: ORANGE, "stroke-width": 1.2 }, g);
      if (j < m.M[0].length) node("rect", { x: xs[n] + j * CS, y: tm + i * CS, width: CS, height: CS, fill: "none", stroke: INK, "stroke-width": 2.4 }, g);
    });
    node("rect", { x: lm, y: tm, width: width - 14 - lm, height: CS, fill: ORANGE, "fill-opacity": 0.22,
                   class: "mx-sweep", "pointer-events": "none" }, svg);
    return svg;
  }

  function mxFig(prog) {
    const d = mxData(prog), svg = d.layout === "falk" ? falkSvg(d) : sideSvg(d);
    svg.classList.add(MX[prog].anim ? "mx-anim" : "mx-still");
    svg.addEventListener("click", (e) => {
      const t = e.target, i = t.getAttribute && t.getAttribute("data-i");
      if (i === null || i === undefined) return;
      MX[prog].focus = { i: +i, j: +t.getAttribute("data-j") };
      MX[prog].anim = false;
      refresh(mxNames(prog));
    });
    const wrap = el("div", "mx-svg");
    wrap.append(svg);
    return wrap;
  }

  // ---- side panel
  function stageTitle(st) {
    if (st.kind === "read") return "Readout";
    if (st.kind === "blk0") return "Block 0 output";
    const part = st.h !== undefined ? `head ${st.h}` : st.kind === "add" ? "attention" : "MLP";
    return `Block ${st.b} · ${part} · ${KIND_LABEL[st.kind]}`;
  }

  function formulaHtml(d) {
    const st = d.st;
    if (d.layout === "falk") {
      return `${hn(d.C.nm)} = ${hn(d.A.nm)} · ${hn(d.B.nm)}${d.bias ? " + b" : ""}${d.scale !== 1 ? ` / √${P}` : ""}`
        + `<span class="mx-shape">(${shapeOf(d.A)}) · (${shapeOf(d.B)}) → ${shapeOf(d.C)}</span>`;
    }
    return {
      a: "A = softmax(S), applied to each row",
      relu: "H = ReLU(Z) = max(0, Z)",
      add: "X ← X + ΔX<sub>0</sub> + ΔX<sub>1</sub> + ΔX<sub>2</sub>",
      res: "X ← X + ΔX<sub>MLP</sub>",
      blk0: "X ← X + ΔX<sub>block 0</sub>",
    }[st.kind] + `<span class="mx-shape">each matrix ${shapeOf(d.mats[0])}</span>`;
  }

  function whyHtml(prog, d) {
    const st = d.st, key = headKey(prog, st), blk = PARAMS[prog].blocks[st.b];
    switch (st.kind) {
      case "q": return `W<sup>Q</sup> reads only the POS slot, so each row of Q is a pointer C·e<sub>target</sub> with C = ${C.toFixed(1)}. In this head ${HEAD_INTENT[key]}`;
      case "k": return "W<sup>K</sup> copies POS, so row j of K is e<sub>j</sub>: each row's key is its own position. This is the same in every head.";
      case "s": return `S[i, j] = q<sub>i</sub>·k<sub>j</sub> / √${P} is ${GAP} where row i points at row j, and 0 elsewhere. Gray cells (j &gt; i) are masked: a row cannot read later rows.`;
      case "a": return `Each row of S becomes weights that sum to 1. A single ${GAP} among zeros gets weight ≈ 1; several tied ${GAP}s share it equally.`;
      case "v": return `W<sup>V</sup> copies ${vCopies(blk.v[st.h])}. Every other column of V is 0.`;
      case "o": return `Row i of ΔX<sub>${st.h}</sub> is a weighted sum of the rows of V, using row i of A as weights. ${HEAD_RESULT[key]}`;
      case "zero": return `This head is unused: W<sup>V</sup> = 0, so V = 0 and ΔX<sub>${st.h}</sub> = A·V = 0 whatever the attention pattern is.`;
      case "add": return `All heads read the same X, and their outputs are added to it. Slots changed: ${slotsTouched(d.mats[1].M)}.`;
      case "pre": return `${mlpIntent(prog, st.b)} Showing the ${d.units.length} units this MLP uses (F = ${F}; the rest are all zero).`;
      case "relu": return "Negative entries become 0. In each row only the units whose condition holds stay positive.";
      case "out": return `Each surviving unit writes into its output slot. Slots written: ${slotsTouched(d.C.M)}.`;
      case "res": return `The MLP output is added to X. ${st.b === 0 ? "MATCH now holds the marks." : "OUT now holds the value each row prints."}`;
      case "blk0": return "Block 0 has exactly the same weights as in the process program (previous slide): it writes QRY and MATCH. This is the X that enters block 1.";
      case "read": return "R reads OUT (weight 20 per value) and POS for the rows that print ':' and EOS. The largest logit in row i is the token predicted for position i+1 (right; green = correct). Gray rows are the prompt: their predictions are never used.";
    }
    return "";
  }

  function focusHtml(d) {
    const { i, j, ids } = d, lab = (spec, axis, idx) => labelOf(spec[axis], idx, axis === "r" ? spec.rmap : spec.cmap, ids);
    if (d.layout === "falk") {
      const v = d.C.M[i][j];
      let h = `<p class="mx-fh">${hn(d.C.nm)}[${lab(d.C, "r", i)}, ${lab(d.C, "c", j)}] = ${fmtV(v)}</p>`;
      if (v === -Infinity) return h + `<p>Masked: row ${i} cannot read the later row ${j}.</p>`;
      const show = d.terms.slice(0, 5);
      if (show.length) {
        h += `<table class="mx-terms"><tr><th>k</th><th>${hn(d.A.nm)}[i, k]</th><th></th><th>${hn(d.B.nm)}[k, j]</th><th></th></tr>`
          + show.map(([kk, a, b]) => `<tr><td>${lab(d.A, "c", kk)}</td><td>${fmtV(a)}</td><td>×</td><td>${fmtV(b)}</td>`
            + `<td>= ${fmtV(a * b)}</td></tr>`).join("") + "</table>";
      } else h += `<p class="mx-more">Every term is 0.</p>`;
      if (d.terms.length > 5) {
        const rest = d.terms.slice(5).reduce((s, [, a, b]) => s + a * b, 0);
        h += `<p class="mx-more">+ ${d.terms.length - 5} smaller terms (sum ${fmtV(rest)})</p>`;
      }
      if (d.scale !== 1) h += `<p class="mx-more">sum ${fmtV(v / d.scale)}, then ÷ √${P} = ${fmtV(v)}</p>`;
      if (d.bias) h += `<p class="mx-more">sum ${fmtV(v - d.bias[j])}, then + b = ${fmtV(d.bias[j])} → ${fmtV(v)}</p>`;
      if (d.pred) {
        const p = argmax(d.C.M[i]), next = ids[i + 1];
        h += `<p>Row ${i} predicts “${tok(p)}”` + (i >= N + 2 && next !== undefined
          ? (p === next ? " ✓ the next token" : ` ✗ (next is “${tok(next)}”)`) : " (prompt row, not used)") + "</p>";
      }
      return h;
    }
    const st = d.st, rowName = `Row ${i} (${tok(ids[i])})`;
    if (st.kind === "a") {
      const s = d.mats[0].M[i], a = d.mats[1].M[i], order = range(0, i + 1).sort((x, y) => a[y] - a[x]);
      const top = order.slice(0, 3), rest = order.slice(3);
      return `<p class="mx-fh">${rowName}: softmax over ${i + 1} visible rows</p>`
        + top.map((jj) => `<p>row ${jj}: S = ${fmtV(s[jj])} → A = ${fmtV(a[jj])}</p>`).join("")
        + (rest.length ? `<p class="mx-more">${rest.length} other rows: A ≤ ${fmtV(Math.max(...rest.map((jj) => a[jj])))} each</p>` : "");
    }
    if (st.kind === "relu") {
      const z = d.mats[0].M[i], hh = d.mats[1].M[i];
      const order = range(0, z.length).filter((u) => Math.abs(z[u]) > 1e-9).sort((x, y) => hh[y] - hh[x] || Math.abs(z[y]) - Math.abs(z[x]));
      return `<p class="mx-fh">${rowName}</p>` + order.slice(0, 6)
        .map((u) => `<p>u${d.units[u]}: Z = ${fmtV(z[u])} → H = ${fmtV(hh[u])}</p>`).join("")
        + (order.length > 6 ? `<p class="mx-more">+ ${order.length - 6} more units, all with H = 0</p>` : "");
    }
    const [x0, dx, x1] = d.mats.map((m) => m.M[i]);
    const changed = range(0, W).filter((w) => Math.abs(dx[w]) > 1e-6);
    return `<p class="mx-fh">${rowName}</p>` + (changed.length
      ? changed.slice(0, 8).map((w) => `<p>${slotLab(w)}: ${fmtV(x0[w])} + ${fmtV(dx[w])} = ${fmtV(x1[w])}</p>`).join("")
        + (changed.length > 8 ? `<p class="mx-more">+ ${changed.length - 8} more</p>` : "")
      : "<p>Nothing changes in this row.</p>");
  }

  function mxSide(prog) {
    const d = mxData(prog), wrap = el("div", "mx-side-in");
    const parts = [["mx-stage", stageTitle(d.st)], ["mx-formula", formulaHtml(d)], ["mx-why", whyHtml(prog, d)]];
    for (const [cls, html] of parts) { const p = el("p", cls); p.innerHTML = html; wrap.append(p); }
    const foc = el("div", "mx-focus");
    foc.innerHTML = focusHtml(d);
    wrap.append(foc, el("p", "mx-hint", "Blue > 0, red < 0, full color at |v| ≥ 1, white below 10⁻⁴. Click any cell to inspect it · ← → step through."));
    return wrap;
  }

  function mxGo(prog, n, keepFocus) {
    if (n < 0 || n >= STAGES[prog].length) return false;
    MX[prog].idx = n;
    if (!keepFocus) MX[prog].focus = null;
    MX[prog].anim = true;
    refresh(mxNames(prog));
    return true;
  }

  function mxCtl(prog) {
    const list = STAGES[prog], idx = MX[prog].idx, cur = list[idx], out = [el("span", "lbl", "Part")];
    [...new Set(list.map((s) => s.op))].forEach((op) =>
      out.push(btn(op, op === cur.op, () => mxGo(prog, list.findIndex((s) => s.op === op)))));
    out.push(el("span", "mx-break"), el("span", "lbl", "Step"));
    list.forEach((s, n) => { if (s.op === cur.op) out.push(btn(KIND_LABEL[s.kind], n === idx, () => mxGo(prog, n))); });
    out.push(btn("◀", false, () => mxGo(prog, idx - 1)), btn("▶", false, () => mxGo(prog, idx + 1)),
             btn("Replay", false, () => mxGo(prog, idx, true)), el("span", "hc-val", `${idx + 1} / ${list.length}`));
    return out;
  }

  // Arrow keys and deck clicks step through the stages before leaving the slide.
  function activeMx() {
    const slide = document.querySelector(".slide.is-on"), host = slide && slide.querySelector("[data-mx]");
    return host ? host.getAttribute("data-mx") : null;
  }

  function mxWire() {
    window.addEventListener("keydown", (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const fwd = e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ";
      const back = e.key === "ArrowLeft" || e.key === "PageUp" || e.key === "Backspace";
      if (!fwd && !back) return;
      mxDir = fwd ? 1 : -1;
      const prog = activeMx();
      if (prog && mxGo(prog, MX[prog].idx + mxDir)) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    window.addEventListener("click", (e) => {
      const t = e.target;
      if (!t.closest) return;
      const next = t.closest("[data-next]"), prev = t.closest("[data-prev]");
      if (!next && !prev && t.closest("button, a, rect, .hc-controls")) return;
      if (!t.closest("[data-deck]")) return;
      const dir = next ? 1 : prev ? -1 : e.clientX > window.innerWidth * 0.72 ? 1 : e.clientX < window.innerWidth * 0.28 ? -1 : 0;
      if (!dir) return;
      mxDir = dir;
      const prog = activeMx();
      if (prog && mxGo(prog, MX[prog].idx + dir)) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    document.querySelectorAll("[data-mx]").forEach((host) => {
      const slide = host.closest(".slide"), prog = host.getAttribute("data-mx");
      let was = slide.classList.contains("is-on");
      new MutationObserver(() => {
        const on = slide.classList.contains("is-on");
        if (on && !was) {
          MX[prog].idx = mxDir < 0 ? STAGES[prog].length - 1 : 0;
          MX[prog].focus = null;
          MX[prog].anim = true;
          refresh(mxNames(prog));
        }
        was = on;
      }).observe(slide, { attributes: true, attributeFilter: ["class"] });
    });
  }

  // ------------------------------------------------------------------ wiring
  const RENDER = {
    fig1, slots: figSlots, slotinfo: slotInfo, heads: headControls, fig4, fig5,
    ctl6, fig6, ctl7, fig7, ctl8, outputs, ctl8b, fig8,
    mxctlp: () => mxCtl("process"), mxfigp: () => mxFig("process"), mxsidep: () => mxSide("process"),
    mxctlo: () => mxCtl("outcome"), mxfigo: () => mxFig("outcome"), mxsideo: () => mxSide("outcome"),
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
    mxWire();
    renderAll();
  }

  window.HandcodedModel = { forward, generate, PARAMS, SLOT, W, P, F, GAP, C, A, N, M, VOCAB };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
