---
title: 'Privacy Saturation in Noisy-SGD: Why More Iterations Don’t Always Mean More Privacy Loss'
date: 2026-08-17
permalink: /posts/2012/08/blog-post-1/
tags:
  - Differential Privacy
  - Optimization
  - Machine Learning
---

$$\DeclareMathOperator*{\inf}{inf} \DeclareMathOperator*{\sup}{sup}$$

## 1. Introduction & Motivation

In private machine learning, **Noisy Stochastic Gradient Descent** (also referred to as **DP-SGD** or **Noisy-SGD**) stands as the fundamental workhorse algorithm. The procedure modifies standard SGD by clipping per-sample gradients to a bounded norm and injecting Gaussian noise into minibatch gradient updates at every step.

Historically, privacy analyses of Noisy-SGD rely on **composition theorems**. In the **Rényi Differential Privacy (RDP)** framework introduced by Mironov (2017), each step is viewed as a separate privacy-releasing mechanism. Under standard privacy amplification by subsampling and composition (Abadi et al., 2016; Wang et al., 2019), running \(T\) iterations on a dataset of size \(n\) with minibatch size \(b\), gradient Lipschitz constant \(L\), and noise scale \(\sigma\) yields an RDP upper bound of the form:

$$\epsilon_{\text{RDP}}(T) \le \frac{\alpha L^2}{n^2 \sigma^2} T$$

### The Theoretical Paradox
This classical bound grows **linearly with the number of iterations \(T\)**. It implies an unsettling paradox: *every additional training step continuously burns through the privacy budget, even if the optimization trajectory has long since converged to a stationary state*.

However, as shown by Altschuler and Talwar (2023), this unbounded linear growth is an artifact of treating the dynamics as \(T\) independent releases. Noisy-SGD is **not** merely a sequence of independent disclosures; it is a **noisy contractive dynamical system**.

When loss functions are \(M\)-smooth and convex, and updates are projected onto a closed convex domain \(K\) of diameter \(D\), the update operator is non-expansive. Coupled with Gaussian noise injection at every iteration, the system exhibits **privacy amplification by iteration (PABI)**: *the state space continually loses memory of initial condition discrepancies*.

This blog post provides a mathematical exploration of **privacy saturation**, proving that the privacy loss of Noisy-SGD flattens out after a characteristic burn-in time scale:

$$\bar{T} \approx \frac{Dn}{L\eta}$$

---

## 2. Problem Setup & Mathematical Definitions

Consider two adjacent datasets \(X = \{x_1, \dots, x_n\}\) and \(X' = \{x_1', \dots, x_n'\}\) in a domain \(\mathcal{X}^n\) that differ in exactly one entry, say at index \(i^*\).

### Domain and Function Assumptions
1. **Feasible Domain \(K\)**: Let \(K \subset \mathbb{R}^d\) be a closed convex set with bounded diameter:
   $$D = \text{diam}(K) = \sup_{u, v \in K} \|u - v\|_2 < \infty$$
2. **Loss Functions**: For each data point \(x_i\), the associated loss \(f_i: K \to \mathbb{R}\) is convex, \(L\)-Lipschitz (\(|f_i(u) - f_i(v)| \le L\|u-v\|\)), and \(M\)-smooth (\(\|\nabla f_i(u) - \nabla f_i(v)\| \le M\|u-v\|\)) on \(K\).

### Algorithm: Projected Noisy-SGD
Starting from an arbitrary initialization \(W_0 = W_0' = w_0 \in K\), at iteration \(t \in \{0, \dots, T-1\}\), a minibatch \(B_t \subset [n]\) of size \(b\) is sampled uniformly at random. The update evolves as:

$$W_{t+1} = \Pi_K \left[ W_t - \frac{\eta}{b} \sum_{i \in B_t} \nabla f_i(W_t) + \eta Z_t \right], \quad Z_t \sim \mathcal{N}(0, \sigma^2 I_d)$$

where \(\Pi_K\) denotes Euclidean projection onto \(K\), and \(\eta > 0\) is the step size. The noise added directly to the iterate has covariance \(\eta^2 \sigma^2 I_d\).

### Privacy Guarantees
We measure privacy using Rényi Differential Privacy (RDP).

* **Definition (Rényi Divergence)**: For probability distributions \(P\) and \(Q\) with densities \(p\) and \(q\), the Rényi divergence of order \(\alpha > 1\) is defined as:
  $$\mathcal{D}_\alpha(P \| Q) = \frac{1}{\alpha - 1} \log \int p(x)^\alpha q(x)^{1-\alpha} \, dx$$
* **Definition (RDP)**: An algorithm \(\mathcal{A}\) satisfies \((\alpha, \epsilon)\)-RDP if \(\mathcal{D}_\alpha(P_{\mathcal{A}(X)} \| P_{\mathcal{A}(X')}) \le \epsilon\) for all adjacent \(X, X'\).

---

## 3. Preliminary Lemmas & Optimal Transport Foundation

Understanding why privacy saturates requires combining two distinct concepts: **statistical distinguishability** (measured by Rényi divergence) and **geometric state separation** (measured via Optimal Transport and \(W_\infty\) distance).

### Geometric Contraction & Divergence Properties

* **Lemma 1 (Gradient Step Contraction)**: If \(f\) is convex and \(M\)-smooth, then for any step size \(\eta \le 2/M\), the gradient mapping \(u \mapsto u - \eta \nabla f(u)\) is non-expansive:
  $$\|(u - \eta \nabla f(u)) - (v - \eta \nabla f(v))\| \le \|u - v\|$$
  Since projection \(\Pi_K\) onto a convex set is non-expansive (\(\|\Pi_K(u) - \Pi_K(v)\| \le \|u-v\|\)), the entire update step is non-expansive.

* **Lemma 2 (Post-Processing & Composition)**:
  * *Post-Processing*: \(\mathcal{D}_\alpha(h_\# \mu \| h_\# \nu) \le \mathcal{D}_\alpha(\mu \| \nu)\) for any deterministic or randomized mapping \(h\).
  * *Conditional Composition*: For sequence of random variables \((X_1, \dots, X_k)\) and \((Y_1, \dots, Y_k)\):
    $$\mathcal{D}_\alpha(P_{X_{1:k}} \| P_{Y_{1:k}}) \le \sum_{i=1}^k \sup_{x_{<i}} \mathcal{D}_\alpha(P_{X_i | X_{<i} = x_{<i}} \| P_{Y_i | Y_{<i} = x_{<i}})$$

### The Optimal Transport Perspective: \(W_\infty\) Distance & Shifted RDP

To track how geometric contraction reduces privacy loss over time, we introduce the \(\infty\)-Wasserstein distance \(W_\infty\) and **Shifted Rényi Divergence**.

* **Definition (\(W_\infty\) Distance)**: For distributions \(\mu, \nu\), the \(W_\infty\) metric measures the essential supremum distance under optimal coupling:
  $$W_\infty(\mu, \nu) = \inf_{\pi \in \Pi(\mu, \nu)} \text{ess\,sup}_{(X,Y) \sim \pi} \|X - Y\|_2$$
  If \(W_\infty(\mu, \nu) \le z\), then \(\mu\) and \(\nu\) can be coupled such that their realizations are almost surely within Euclidean distance \(z\).

* **Definition (Shifted Rényi Divergence)**: For \(z \ge 0\), the \(z\)-shifted Rényi divergence is defined as:
  $$\mathcal{D}_\alpha^{(z)}(\mu \| \nu) = \inf_{\tilde{\mu}: W_\infty(\tilde{\mu}, \mu) \le z} \mathcal{D}_\alpha(\tilde{\mu} \| \nu)$$
  *Interpretation*: Before evaluating statistical divergence, we are allowed to shift distribution \(\mu\) by a geometric distance of up to \(z\).

* **Lemma 3 (Shift-Reduction for Gaussian Noise)**: For any distributions \(\mu, \nu\) and shift \(a \ge 0\):
  $$\mathcal{D}_\alpha^{(z)}(\mu * \mathcal{N}(0, \sigma^2 I_d) \| \nu * \mathcal{N}(0, \sigma^2 I_d)) \le \mathcal{D}_\alpha^{(z+a)}(\mu \| \nu) + \frac{\alpha a^2}{2\sigma^2}$$

* **Lemma 4 (Contraction-Reduction)**: Let \(\phi, \phi'\) be coupled contractive random functions with \(\sup_x \|\phi(x) - \phi'(x)\| \le s\) almost surely. Then:
  $$\mathcal{D}_\alpha^{(z+s)}(\phi_\# \mu \| \phi'_\# \mu') \le \mathcal{D}_\alpha^{(z)}(\mu \| \mu')$$

---

## 4. Main Theorem & Formal Proof

### Theorem 1 (Privacy Saturation of Noisy-SGD)
Under the setup in Section 2, if the step size satisfies \(\eta \le 2/M\), then for any total number of iterations \(T \ge 1\), projected Noisy-SGD satisfies:

$$\mathcal{D}_\alpha(P_{W_T} \| P_{W_T'}) \le \frac{\alpha L^2}{n^2 \sigma^2} \min \left\{ T, \left\lceil \frac{Dn}{L\eta} \right\rceil \right\}$$

---

### Complete Proof Walkthrough

#### Step 1: Noise Splitting Trick
Let \(\{W_t\}_{t=0}^T\) and \(\{W_t'\}_{t=0}^T\) be trajectories produced on adjacent datasets \(X, X'\) using identical initializations \(w_0\) and identical minibatch sequences \(B_0, \dots, B_{T-1}\).

Decompose the Gaussian noise variance \(\sigma^2\) into two independent components:
$$\sigma^2 = \sigma_1^2 + \sigma_2^2$$

Assign:
* \(Y_t \sim \mathcal{N}(0, \eta^2 \sigma_1^2 I_d)\): reserved for driving the **iteration-forgetting mechanism**.
* \(Z_t \sim \mathcal{N}(0, \eta^2 \sigma_2^2 I_d)\): reserved for absorbing the **sampled Gaussian privacy cost**.

The trajectories can be rewritten as:
$$W_{t+1} = \Pi_K \left[ W_t - \frac{\eta}{b} \sum_{i \in B_t} \nabla f_i(W_t) + Y_t + Z_t \right]$$
$$W_{t+1}' = \Pi_K \left[ W_t' - \frac{\eta}{b} \sum_{i \in B_t} \nabla f_i(W_t') + Y_t + Z_t' \right]$$

where \(Z_t' = \tilde{Z}_t + \frac{\eta}{b} \left( \nabla f_{i^*}(W_t') - \nabla f_{i^*}'(W_t') \right) \mathbb{I}_{\{i^* \in B_t\}}\) with \(\tilde{Z}_t \sim \mathcal{N}(0, \eta^2 \sigma_2^2 I_d)\).

#### Step 2: Lookback Window \(\tau = T - R\)
Fix an arbitrary lookback time \(\tau \in \{0, \dots, T-1\}\) and let \(R = T - \tau\) be the window of final iterations to analyze.

By Post-Processing (Lemma 2) and Conditional Composition (Lemma 2) applied to \((Z_{\tau:T-1}, W_T)\):
$$\mathcal{D}_\alpha(P_{W_T} \| P_{W_T'}) \le \underbrace{\mathcal{D}_\alpha(P_{Z_{\tau:T-1}} \| P_{Z_{\tau:T-1}'})}_{\text{Term I: Sampling Cost}} + \underbrace{\sup_z \mathcal{D}_\alpha(P_{W_T | Z_{\tau:T-1}=z} \| P_{W_T' | Z_{\tau:T-1}'=z})}_{\text{Term II: Iteration Forgetting Cost}}$$

#### Step 3: Bounding Term I (Sampling Cost)
Using Subsampled Gaussian Mechanism bounds over the \(R\) steps:
* The changed item \(i^*\) enters \(B_t\) with probability \(q = b/n\).
* The maximum gradient shift induced by the single changed point is \(m_t \le \frac{2\eta L}{b}\).

Applying the subsampled RDP lemma over \(R\) steps:
$$\mathcal{D}_\alpha(P_{Z_{\tau:T-1}} \| P_{Z_{\tau:T-1}'}) \le \frac{\alpha L^2}{n^2 \sigma_2^2} R$$

#### Step 4: Bounding Term II (Iteration Forgetting Cost)
Condition on \(Z_{\tau:T-1} = Z_{\tau:T-1}' = z\). Since \(W_\tau, W_\tau' \in K\) and \(\text{diam}(K) = D\), the maximum initial distance at time \(\tau\) satisfies:

$$W_\infty(P_{W_\tau}, P_{W_\tau'}) \le D$$

Applying the PABI bound (Lemma 3 & 4) across the \(R\) contractive steps with step allocations \(a_t = D/R\):
$$\sup_z \mathcal{D}_\alpha(P_{W_T | Z_{\tau:T-1}=z} \| P_{W_T' | Z_{\tau:T-1}'=z}) \le \frac{\alpha D^2}{2 \eta^2 \sigma_1^2 R}$$

#### Step 5: Trade-off Optimization & Burn-In Scale
Combining both terms:
$$\mathcal{D}_\alpha(P_{W_T} \| P_{W_T'}) \le \frac{\alpha L^2}{n^2 \sigma_2^2} R + \frac{\alpha D^2}{2 \eta^2 \sigma_1^2 R}$$

Setting equal noise splits \(\sigma_1^2 = \sigma_2^2 = \sigma^2 / 2\):
$$F(R) = \frac{2\alpha L^2}{n^2 \sigma^2} R + \frac{\alpha D^2}{\eta^2 \sigma^2 R}$$

Minimizing \(F(R)\) with respect to \(R\) gives the optimal window size \(R^*\):
$$\frac{dF}{dR} = 0 \implies R^* = \frac{Dn}{L\eta}$$

* If \(T \le \bar{T} = \left\lceil \frac{Dn}{L\eta} \right\rceil\), evaluate composition from \(t = 0\) (\(R = T\)), yielding \(\mathcal{D}_\alpha \le \frac{\alpha L^2}{n^2 \sigma^2} T\).
* If \(T > \bar{T}\), set \(\tau = T - \bar{T}\) (\(R = \bar{T}\)), yielding \(\mathcal{D}_\alpha \le \frac{\alpha L^2}{n^2 \sigma^2} \bar{T}\).

Combining both regimes yields the final saturation bound:
$$\mathcal{D}_\alpha(P_{W_T} \| P_{W_T'}) \le \frac{\alpha L^2}{n^2 \sigma^2} \min \left\{ T, \left\lceil \frac{Dn}{L\eta} \right\rceil \right\} \quad \blacksquare$$

---

## 5. Summary & Key Takeaways
1. **Dynamics Matter**: Privacy loss does not accumulate indefinitely in noisy contractive optimization systems.
2. **Optimal Transport Bridge**: The \(W_\infty\) metric and shifted Rényi divergence provide the mathematical tools needed to isolate geometric state contraction from statistical divergence.
3. **Practical Consequence**: You can train DP-SGD models for significantly more epochs until convergence without suffering linear privacy degradation, provided the domain is bounded.

---

## 6. References
* Altschuler, J. M., & Talwar, K. (2023). *Privacy of noisy stochastic gradient descent: More iterations without more privacy loss*. arXiv:2205.13710.
* Abadi, M., et al. (2016). *Deep learning with differential privacy*. CCS '16.
* Mironov, I. (2017). *Rényi differential privacy*. IEEE CSF.
* Dwork, C., & Feldman, V. (2018). *Privacy-preserving prediction*. arXiv:1803.10266.
* Peyré, G., & Cuturi, M. (2020). *Computational Optimal Transport*. Foundations and Trends in Machine Learning.
EOF

