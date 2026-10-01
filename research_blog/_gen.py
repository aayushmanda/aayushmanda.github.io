from pathlib import Path

BLUE, ORANGE, GRAY, INK = "#1d4ed8", "#c2410c", "#6b7280", "#1f2937"
FILL_BLUE, FILL_ORANGE = "#eff6ff", "#ffedd5"
FONT = "font-family:'Source Serif 4',Georgia,serif"


def svg_open(w, h, uid):
    return (
        f'<svg viewBox="0 0 {w} {h}" role="img" style="{FONT}">'
        f'<defs>'
        f'<marker id="o{uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{ORANGE}"/></marker>'
        f'<marker id="b{uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{BLUE}"/></marker>'
        f'<marker id="g{uid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{GRAY}"/></marker>'
        f'</defs>'
    )


def text(x, y, s, size=16, color=INK, anchor="middle", weight=400, italic=False):
    style = ' font-style="italic"' if italic else ""
    return (f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" text-anchor="{anchor}" '
            f'font-weight="{weight}"{style}>{s}</text>')


def row(tokens, x0, y, step, w, h=42, fills=None, strokes=None, index=True, values=()):
    out = []
    for i, tok in enumerate(tokens):
        x = x0 + i * step
        fill = (fills or {}).get(i, "#ffffff")
        stroke, sw = (strokes or {}).get(i, ("#93c5fd", 1.5))
        out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
        small = tok in ("SEP", "EOS")
        color = BLUE if i in values else INK
        out.append(text(x + w / 2, y + h / 2 + (5 if small else 7), tok, 13 if small else 20, color))
        if index:
            out.append(text(x + w / 2, y - 6, i, 11, GRAY))
    return "".join(out)


def cx(i, x0, step, w):
    return x0 + i * step + w / 2


def arc(x1, x2, y, lift, color, uid, width=2):
    tag = {"#c2410c": "o", "#1d4ed8": "b", "#6b7280": "g"}[color]
    mid = (x1 + x2) / 2
    return (f'<path d="M{x1},{y} Q{mid},{y - lift} {x2},{y}" fill="none" stroke="{color}" '
            f'stroke-width="{width}" marker-end="url(#{tag}{uid})"/>')


def line(x1, y1, x2, y2, color, uid, width=2, dash=False):
    tag = {"#c2410c": "o", "#1d4ed8": "b", "#6b7280": "g"}[color]
    d = ' stroke-dasharray="5 4"' if dash else ""
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"{d} '
            f'marker-end="url(#{tag}{uid})"/>')


def bracket(x1, x2, y, label, color=GRAY, size=14):
    return (f'<path d="M{x1},{y} v8 H{x2} v-8" fill="none" stroke="{color}" stroke-width="1.5"/>'
            + text((x1 + x2) / 2, y + 26, label, size, color))


PROMPT = ["1", "a", "b", "a", "d", "a", "c", "a", "SEP"]
STATES = ["1", "2", "2", "0", "0", "1"]

# ---------------------------------------------------------------- slide 1: rows
x0, st, w = 110, 46, 42
proc = PROMPT + STATES + [":", "1", "EOS"]
outc = PROMPT + [":", "1", "EOS"]
vals_p = {0, 9, 10, 11, 12, 13, 14, 16}
vals_o = {0, 10}
s1 = svg_open(960, 270, 1)
s1 += text(12, 92, "process", 17, BLUE, "start", 700)
s1 += row(proc, x0, 65, st, w, fills={i: FILL_ORANGE for i in range(9, 18)},
          strokes={i: (ORANGE, 1.5) for i in range(9, 18)}, values=vals_p)
s1 += bracket(x0, x0 + 9 * st - 4, 113, "prompt: n + 3 = 9 tokens")
s1 += bracket(x0 + 9 * st, x0 + 15 * st - 4, 113, "s₁ … sₙ, one update each", ORANGE)
s1 += bracket(x0 + 15 * st, x0 + 18 * st - 4, 113, ": sₙ EOS", ORANGE)
s1 += text(12, 202, "outcome", 17, BLUE, "start", 700)
s1 += row(outc, x0, 175, st, w, fills={i: FILL_ORANGE for i in range(9, 12)},
          strokes={i: (ORANGE, 1.5) for i in range(9, 12)}, values=vals_o, index=False)
s1 += bracket(x0, x0 + 9 * st - 4, 223, "the same prompt")
s1 += bracket(x0 + 9 * st, x0 + 12 * st - 4, 223, ": sₙ EOS", ORANGE)
c10 = cx(10, x0, st, w)
s1 += (f'<path d="M736,186 Q{c10 + 40},150 {c10 + 2},171" fill="none" stroke="{ORANGE}" '
       f'stroke-width="2" marker-end="url(#o1)"/>')
s1 += text(742, 192, "one value carries", 15, ORANGE, "start", 700)
s1 += text(742, 211, "all n = 6 letters", 15, ORANGE, "start", 700)
s1 += "</svg>"

# ---------------------------------------------------------------- slide 3: residual stream
slots = [("TL", 4, "0–3"), ("TV", 3, "4–6"), ("POS", 18, "7–24"), ("QRY", 4, "25–28"),
         ("MATCH", 1, "29"), ("PREV", 3, "30–32"), ("MT", 1, "33"), ("CNT", 1, "34"),
         ("S0", 3, "35–37"), ("OUT", 3, "38–40")]
color = {"TL": "#e0e7ff", "TV": "#e0e7ff", "POS": "#e0e7ff", "QRY": "#dcfce7", "MATCH": "#dcfce7",
         "PREV": "#ffedd5", "MT": "#ffedd5", "CNT": "#fef9c3", "S0": "#fef9c3", "OUT": "#fde2e2"}
s3 = svg_open(900, 250, 3)
x, scale, top, hh = 40, 20, 92, 46
pos = {}
for name, size, rng in slots:
    wdt = size * scale
    pos[name] = (x, x + wdt)
    s3 += f'<rect x="{x}" y="{top}" width="{wdt}" height="{hh}" fill="{color[name]}" stroke="#64748b" stroke-width="1"/>'
    if size >= 3:
        s3 += text(x + wdt / 2, top + 22, name, 15, INK, weight=700)
        s3 += text(x + wdt / 2, top + 39, f"{size}", 12, GRAY)
    x += wdt
narrow = [("MATCH", 172), ("MT", 190), ("CNT", 208)]
for name, y in narrow:
    a, b = pos[name]
    s3 += f'<line x1="{(a + b) / 2}" y1="{top + hh}" x2="{(a + b) / 2}" y2="{y - 13}" stroke="{GRAY}" stroke-width="1"/>'
    s3 += text((a + b) / 2, y, f"{name} · 1", 12, INK, weight=700)
s3 += text(40, top + hh + 22, "index", 12, GRAY, "start")
for name, size, rng in slots:
    a, b = pos[name]
    if size >= 3:
        s3 += text((a + b) / 2, top + hh + 22, rng, 12, GRAY)
s3 += text(450, 240, "W = 2A + 4m + 2n + 9 = 41", 15, BLUE, weight=700)


def over(a, b, label, y, col, uid=3):
    return (f'<path d="M{a + 2},{top - 6} V{y + 8} H{b - 2} V{top - 6}" fill="none" stroke="{col}" stroke-width="1.6"/>'
            + text((a + b) / 2, y, label, 14, col, weight=700))


s3 += over(pos["TL"][0], pos["POS"][1], "written by the embeddings", 52, BLUE)
s3 += over(pos["QRY"][0], pos["MATCH"][1], "block 0", 52, "#15803d")
s3 += over(pos["PREV"][0], pos["MT"][1], "process", 30, ORANGE)
s3 += over(pos["CNT"][0], pos["S0"][1], "outcome", 52, "#a16207")
s3 += over(pos["OUT"][0], pos["OUT"][1], "both", 30, "#b91c1c")
s3 += line(pos["OUT"][0] + 30, top + hh + 4, pos["OUT"][0] + 30, top + hh + 52, "#c2410c", 3)
s3 += text(pos["OUT"][0] + 30, top + hh + 70, "readout", 13, ORANGE, weight=700)
s3 += "</svg>"

# ---------------------------------------------------------------- slide 4: routing head
x0, st, w = 60, 90, 62
s4 = svg_open(900, 250, 4)
s4 += row(PROMPT, x0, 168, st, w, strokes={1: (BLUE, 3)}, values={0})
qx = cx(1, x0, st, w)
for i in range(2, 8):
    s4 += arc(cx(i, x0, st, w) - 6, qx + 6, 162, 30 + 16 * (i - 1), ORANGE, 4)
s4 += text(470, 34, "query of row i = C · e_target(i),  key of row j = e_j", 16, INK)
s4 += text(470, 58, "score = C / √P = GAP = 16 on the target, 0 elsewhere", 16, ORANGE, weight=700)
s4 += text(qx, 236, "target", 13, BLUE, weight=700)
s4 += text(cx(5, x0, st, w), 236, "rows 2–7 all point at row 1 (the query letter)", 13, GRAY)
s4 += "</svg>"

# ---------------------------------------------------------------- slide 5: block 0
s5 = svg_open(900, 300, 5)
letters = ["b", "a", "d", "a", "c", "a"]
x0, st, w = 210, 110, 70
s5 += text(20, 72, "wₜ", 17, INK, "start", 700)
s5 += text(20, 152, "best unit", 17, INK, "start", 700)
s5 += text(20, 170, "pre-activation", 13, GRAY, "start")
s5 += text(20, 242, "MATCH", 17, INK, "start", 700)
for t, c in enumerate(letters):
    x = x0 + t * st
    hit = c == "a"
    s5 += f'<rect x="{x}" y="45" width="{w}" height="42" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1.5"/>'
    s5 += text(x + w / 2, 73, c, 20)
    s5 += text(x + w / 2, 37, f"t = {t + 1}", 11, GRAY)
    s5 += line(x + w / 2, 90, x + w / 2, 128, GRAY, 5, 1.5)
    s5 += text(x + w / 2, 156, "+0.5" if hit else "−0.5", 19, ORANGE if hit else GRAY, weight=700)
    s5 += line(x + w / 2, 166, x + w / 2, 212, GRAY, 5, 1.5)
    fill, stroke = (FILL_BLUE, BLUE) if hit else ("#ffffff", "#cbd5e1")
    s5 += f'<rect x="{x}" y="218" width="{w}" height="42" rx="6" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
    s5 += text(x + w / 2, 246, "1" if hit else "0", 20, BLUE if hit else GRAY, weight=700)
s5 += text(x0 + st + w / 2, 290, "1 + 1 − 1.5 = 0.5,  ReLU × 2 = 1", 14, ORANGE, weight=700)
s5 += text(x0 + 4 * st + w / 2, 290, "0 + 1 − 1.5 < 0,  ReLU = 0", 14, GRAY)
s5 += "</svg>"

# ---------------------------------------------------------------- slide 6: process block 1
proc_in = PROMPT + STATES + [":"]
x0, st, w = 36, 53, 47
s6 = svg_open(900, 300, 6)
s6 += row(proc_in, x0, 150, st, w, fills={11: FILL_BLUE, 5: FILL_ORANGE},
          strokes={11: (BLUE, 3), 5: (ORANGE, 2.5)}, values={0, 9, 10, 11, 12, 13, 14})
c11, c5, c15, c14 = (cx(i, x0, st, w) for i in (11, 5, 15, 14))
s6 += arc(c11 - 6, c5 + 4, 144, 110, ORANGE, 6)
s6 += text((c11 + c5) / 2, 50, "head 1: MT ← MATCH at w₄ = 1", 15, ORANGE, weight=700)
s6 += (f'<path d="M{c11 - 10},{146} C{c11 - 34},{92} {c11 + 34},{92} {c11 + 10},{146}" fill="none" '
       f'stroke="{BLUE}" stroke-width="2" marker-end="url(#b6)"/>')
s6 += text(c11 + 30, 100, "head 0: PREV ← s₃ = 2", 15, BLUE, "start", 700)
s6 += arc(c15 - 4, c14 + 4, 144, 30, GRAY, 6, 1.5)
s6 += text(c15 - 6, 118, "head 2", 12, GRAY)
s6 += line(c11, 196, c11, 236, BLUE, 6)
s6 += text(c11, 258, "MLP: PREV₂ + MT − 1.5 = 0.5  →  OUT₀", 15, BLUE, weight=700)
s6 += text(c11, 280, "predicts the next token s₄ = (2 + 1) mod 3 = 0", 14, INK)
s6 += text(cx(2, x0, st, w), 214, "w₁ … w₆", 13, GRAY)
s6 += text(cx(11.5, x0, st, w), 214, "", 13, GRAY)
s6 += "</svg>"

# ---------------------------------------------------------------- slide 7: outcome block 1
out_in = PROMPT + [":"]
x0, st, w = 60, 86, 58
s7 = svg_open(920, 300, 7)
s7 += row(out_in, x0, 160, st, w, fills={9: FILL_BLUE}, strokes={9: (BLUE, 3)}, values={0})
c9 = cx(9, x0, st, w)
for i in range(2, 8):
    s7 += arc(c9 - 4, cx(i, x0, st, w) + 4, 154, 26 + 11 * (9 - i), ORANGE, 7, 1.6)
s7 += arc(c9 - 8, cx(0, x0, st, w) + 4, 154, 150, BLUE, 7)
s7 += text(cx(4.5, x0, st, w), 24, "head 1: S0 ← s₀ = 1", 15, BLUE, weight=700)
s7 += text(cx(5, x0, st, w), 78, "head 0: weight 1/6 on each letter", 15, ORANGE, weight=700)
for t, bit in enumerate([0, 1, 0, 1, 0, 1]):
    s7 += text(cx(t + 2, x0, st, w), 226, f"b = {bit}", 13, BLUE if bit else GRAY, weight=700 if bit else 400)
s7 += line(c9, 206, c9, 244, BLUE, 7)
s7 += text(c9, 266, "CNT = 6 · 3/6 = 3", 15, BLUE, "middle", 700)
s7 += text(c9 - 40, 290, "bump (j = 1, c = 3) fires  →  OUT at (1 + 3) mod 3 = 1", 15, ORANGE, "end", 700)
s7 += "</svg>"


def fig(svg, wide="52rem"):
    return f'<div class="fig" style="max-width:{wide}">{svg}</div>'


BAR = '''  <div class="deck-bar">
    <a class="deck-home" href="/" aria-label="Home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5 L12 4 L20 10.5"/><path d="M7 10 V20 H17 V10"/></svg></a>
    <button type="button" data-prev aria-label="Previous slide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5 L8 12 L15 19"/></svg></button>
    <button type="button" data-next aria-label="Next slide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5 L16 12 L9 19"/></svg></button>
    <span data-count></span>
  </div>
'''

slides = []

slides.append(r'''  <section class="slide">
    <p class="slide-kicker">1 · The task and the two losses</p>
    <h2>Same prompt, two continuations</h2>
    <p>Count the query letter modulo \(m\): \(s_t = (s_{t-1} + [w_t = q]) \bmod m\). Running example: \(A = 4\), \(m = 3\), \(n = 6\), \(s_0 = 1\), \(q = \texttt{a}\), word \(\texttt{b a d a c a}\).</p>
''' + fig(s1, "56rem") + r'''
    <ul>
      <li>Orange tokens carry the loss. Process supervises \(s_1, \dots, s_n\) and the answer. Outcome supervises only the answer.</li>
      <li>Both exact programs are weights of <em>one</em> architecture. Everything is scored by greedy free-running generation.</li>
    </ul>
  </section>''')

slides.append(r'''  <section class="slide">
    <p class="slide-kicker">2 · One architecture</p>
    <h2>Two blocks, three heads, no LayerNorm</h2>
    <div class="math">\[
      \begin{aligned}
      X^{(0)} &= E_{\mathrm{tok}}[\mathrm{ids}] + E_{\mathrm{pos}}[0{:}T] \in \mathbb{R}^{T \times W},
      \qquad Q_h = X W^{Q\top}_h,\ K_h = X W^{K\top}_h \in \mathbb{R}^{T \times P} \\
      X &\leftarrow X + \textstyle\sum_{h=1}^{3} \mathrm{softmax}\big(Q_h K_h^{\top}/\sqrt{P} + M\big)\, X W^{V\top}_h
      \qquad X \leftarrow X + \mathrm{ReLU}(X W_{\mathrm{in}}^{\top} + b)\, W_{\mathrm{out}}^{\top}
      \end{aligned}
    \]</div>
    <table class="slide-table compact">
      <thead><tr><th>Tensor</th><th>Shape</th><th>\(n{=}6,\ m{=}3\)</th><th>\(n{=}12,\ m{=}2\)</th></tr></thead>
      <tbody>
        <tr><td>\(E_{\mathrm{tok}}\), \(R\)</td><td>\(|\mathcal V| \times W\)</td><td>10 × 41</td><td>9 × 49</td></tr>
        <tr><td>\(E_{\mathrm{pos}}\)</td><td>\(P \times W\)</td><td>18 × 41</td><td>30 × 49</td></tr>
        <tr><td>\(W^Q, W^K\) per block</td><td>\(H \times P \times W\)</td><td>3 × 18 × 41</td><td>3 × 30 × 49</td></tr>
        <tr><td>\(W^V\) per block</td><td>\(H \times W \times W\)</td><td>3 × 41 × 41</td><td>3 × 49 × 49</td></tr>
        <tr><td>\(W_{\mathrm{in}}\), \(W_{\mathrm{out}}^{\top}\) per block</td><td>\(F \times W\)</td><td>63 × 41</td><td>78 × 49</td></tr>
        <tr><td>Parameters</td><td></td><td>30,958</td><td>49,842</td></tr>
      </tbody>
    </table>
    <p>\(|\mathcal V| = A + m + 3\) (letters, values, SEP, :, EOS). \(P = 2n + 6\) is the longest row and the head width. \(F = \max\{A,\ 3m(n+1),\ 2n+1\}\). Logits are \(X R^{\top} \in \mathbb{R}^{T \times |\mathcal V|}\).</p>
  </section>''')

slides.append(r'''  <section class="slide">
    <p class="slide-kicker">3 · Block encoding of the residual stream</p>
    <h2>Every coordinate has a name</h2>
''' + fig(s3, "56rem") + r'''
    <div class="math">\[
      E_{\mathrm{tok}}[a, \mathrm{TL}_a] = 1, \quad E_{\mathrm{tok}}[A{+}v, \mathrm{TV}_v] = 1, \quad E_{\mathrm{pos}}[i, \mathrm{POS}_i] = 1,
      \qquad R[A{+}v, \mathrm{OUT}_v] = 20
    \]</div>
    <ul>
      <li>Each slot holds a one-hot or one scalar, so every weight below is a small block of 0s and \(\pm 1\)s between named slots.</li>
      <li>The readout also puts 20 on \(R[{:}, \mathrm{POS}_i]\) and \(R[\mathrm{EOS}, \mathrm{POS}_j]\) at the two rows that must emit those tokens.</li>
    </ul>
  </section>''')

slides.append(r'''  <section class="slide">
    <p class="slide-kicker">4 · The one attention trick</p>
    <h2>A routing head is a position lookup</h2>
    <div class="math">\[
      W^{K}_h[:, \mathrm{POS}] = I_P, \quad W^{Q}_h[\mathrm{tgt}(i), \mathrm{POS}_i] = C = \mathrm{GAP}\sqrt{P}
      \ \Longrightarrow\
      \tfrac{q_i^{\top} k_j}{\sqrt P} = \mathrm{GAP}\cdot \mathbb{1}[j = \mathrm{tgt}(i)]
    \]</div>
''' + fig(s4) + r'''
    <ul>
      <li>\(\mathrm{GAP} = \max\{16,\ 3\log 8(n+3)\}\), so any other position gets weight at most \(e^{-16} \approx 10^{-7}\). A list of targets gives a uniform average.</li>
      <li>The value matrix copies one slot into another, for example \(W^{V}_0[\mathrm{QRY}, \mathrm{TL}] = I_A\). Rows without a target attend to a harmless default row.</li>
    </ul>
  </section>''')

slides.append(r'''  <section class="slide">
    <p class="slide-kicker">5 · Block 0, shared by both programs</p>
    <h2>Mark every letter that equals the query</h2>
    <div class="math">\[
      x_{\mathrm{QRY}} \leftarrow e_q \ \text{(head 0)}, \qquad
      x_{\mathrm{MATCH}} \mathrel{+}= 2\sum_{a=1}^{A} \mathrm{ReLU}\big(x_{\mathrm{TL}_a} + x_{\mathrm{QRY}_a} - 1.5\big) = [w_t = q]
    \]</div>
''' + fig(s5) + r'''
    <ul>
      <li>Uses \(A\) of the \(F\) hidden units: \(W_{\mathrm{in}}\) is \(A \times W\) with two 1s per row, \(b = -1.5\), and \(W_{\mathrm{out}}\) writes 2 into the single MATCH coordinate.</li>
    </ul>
  </section>''')

slides.append(r'''  <section class="slide">
    <p class="slide-kicker">6 · Block 1, process program</p>
    <h2>One update per emitted state</h2>
''' + fig(s6, "56rem") + r'''
    <div class="math">\[
      u^{0}_j = \mathrm{ReLU}(x_{\mathrm{PREV}_j} - x_{\mathrm{MT}} - 0.5) \to \mathrm{OUT}_j,
      \;
      u^{1}_j = \mathrm{ReLU}(x_{\mathrm{PREV}_j} + x_{\mathrm{MT}} - 1.5) \to \mathrm{OUT}_{j+1 \bmod m}
    \]</div>
    <ul>
      <li>Row \(n{+}1{+}t\) adds its own value \(s_{t-1}\) to the mark of \(w_t\). For \(t = 1\) that row is SEP, which reads \(s_0\) at row 0.</li>
      <li>\(2m\) units, here 6 of 63. Head 2 copies \(s_n\) after the colon.</li>
    </ul>
  </section>''')

slides.append(r'''  <section class="slide">
    <p class="slide-kicker">7 · Block 1, outcome program</p>
    <h2>Read all \(n\) marks at the colon</h2>
''' + fig(s7, "56rem") + r'''
    <div class="math">\[
      x_{\mathrm{CNT}} = n \cdot \tfrac{1}{n}\textstyle\sum_t b_t = c, \quad
      \beta_{c'}(x) = r(x{-}c'{+}1) - 2r(x{-}c') + r(x{-}c'{-}1) = \mathbb{1}[x = c']
    \]</div>
    <ul>
      <li>One bump per \((s_0 = j,\ c')\), gated by \((n{+}2)(x_{\mathrm{S0}_j} - 1)\), writes \(\mathrm{OUT}_{(j + c') \bmod m}\): \(3m(n{+}1)\) units, here all 63.</li>
      <li>Same tensors as slide 6. Block 0 is shared. Process uses \(2m\) units of block 1, outcome \(3m(n{+}1)\).</li>
    </ul>
  </section>''')

deck = '<div class="deck" data-deck>\n' + BAR + "\n".join(slides) + "\n</div>\n"

page = '''<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Hand-Coded Process and Outcome Programs - Aayushman</title>
    <meta name="description" content="Seven slides on two exact programs for letter counting written into the same two-block Transformer: tensor shapes, the residual-stream layout, and the weights of each block.">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
    <script>
      try {
        var t = localStorage.getItem("theme");
        if (t) document.documentElement.setAttribute("data-theme", t);
      } catch (e) {}
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/style.css?v=35">
    <style>
      .content .slide-table.compact { font-size: clamp(1rem, 1.5vw, 1.25rem); }
      .content .slide-table.compact th, .content .slide-table.compact td { padding: 0.3rem 0.7rem; }
      .slide .math { font-size: clamp(1.05rem, 1.6vw, 1.35rem); }
    </style>
    <script>
      window.MathJax = {
        tex: {
          inlineMath: [["\\\\(", "\\\\)"], ["$", "$"]],
          displayMath: [["\\\\[", "\\\\]"], ["$$", "$$"]]
        },
        options: { skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"] },
        startup: { typeset: false }
      };
    </script>
    <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  </head>
  <body>
    <div id="reading-progress" class="reading-progress" aria-hidden="true"></div>
    <nav class="site-nav" aria-label="Primary navigation">
      <a href="/">Home</a>
      <a href="/papers/">Papers</a>
      <a href="/teaching/">Academic Activities</a>
      <a href="/research_blog/" aria-current="page">Research Blog</a>
      <button class="theme-toggle" type="button" aria-label="Toggle dark mode">
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>
      </button>
    </nav>

    <main class="page">
      <h1 class="page-title tight">Hand-Coded Process and Outcome Programs</h1>
      <article class="content">
''' + deck + '''      </article>
    </main>
    <script src="/assets/slides.js?v=8" defer></script>
    <script>
      document.addEventListener("DOMContentLoaded", function () {
        if (window.initSlides) window.initSlides(document.querySelector(".content"));
        var script = document.querySelector('script[src*="mathjax"]');
        function go() {
          var mj = window.MathJax;
          var ready = mj && mj.startup && mj.startup.promise ? mj.startup.promise : Promise.resolve();
          ready.then(function () { if (window.typesetCurrentSlide) window.typesetCurrentSlide(); });
        }
        if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) go();
        else if (script) script.addEventListener("load", go, { once: true });
      });
    </script>
    <script src="/assets/theme-toggle.js?v=9" defer></script>
  </body>
</html>
'''

Path(__file__).with_name("handcoded-programs-slides.html").write_text(page)
print("slides", deck.count('<section class="slide'))
