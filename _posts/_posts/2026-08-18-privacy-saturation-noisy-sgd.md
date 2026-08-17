---
title: 'Privacy Saturation in Noisy-SGD: Why More Iterations Don’t Always Mean More Privacy Loss'
date: 2026-08-18
permalink: /posts/2026/08/privacy-saturation-noisy-sgd/
tags:
  - Differential Privacy
  - Optimization
  - Machine Learning
---

In private machine learning, Noisy Stochastic Gradient Descent (Noisy-SGD / DP-SGD) is the standard algorithm for training privacy-preserving models[cite: 1]. Standard composition bounds in Rényi Differential Privacy (RDP) suggest that privacy loss grows linearly with the number of iterations $T$[cite: 1]:

$$\varepsilon_{\text{RDP}}(T) \lesssim \frac{\alpha L^2}{n^2 \sigma^2} T$$

This linear scaling implies that running additional training steps continuously consumes the privacy budget, even after the optimization procedure has already converged[cite: 1].

In our recent work, **The Convergence of the Privacy Loss in Strongly Convex Optimization** (joint with Kaushik Doddamani and Pranav at IIT Madras), we examine why this linear growth picture is incomplete[cite: 1].

---

### The Intuition: Privacy Amplification by Iteration

Noisy-SGD is not just a sequence of independent randomized disclosures—it is a **noisy contractive dynamical system**[cite: 1]. In smooth convex settings over a bounded domain $\mathcal{K}$ with diameter $D$[cite: 1]:
1. **Contractive Steps**: Gradient steps with step size $\eta \le 2/M$ and projections onto convex sets are non-expansive[cite: 1].
2. **Gaussian Smoothing**: Injecting Gaussian noise causes the iterative process to gradually "forget" initial discrepancies between adjacent dataset trajectories[cite: 1].

---

### Key Theoretical Result

Instead of growing indefinitely, the privacy loss initially increases and then **saturates** after reaching a characteristic time scale $\bar{T} \approx \frac{Dn}{L\eta}$[cite: 1]:

$$\varepsilon_{\text{RDP}}(T) \lesssim \frac{\alpha L^2}{n^2 \sigma^2} \min \left\{ T, \frac{Dn}{L\eta} \right\}$$

The proof balances two competing dynamics over a final window of $R$ iterations[cite: 1]:
* **Privacy Amplification by Sampling**: Pays a cost of $\mathcal{O}\left(\frac{\alpha L^2}{n^2 \sigma^2} R\right)$, which increases with $R$[cite: 1].
* **Privacy Amplification by Iteration**: Yields a forgetting bound of $\mathcal{O}\left(\frac{\alpha D^2}{\eta^2 \sigma^2 R}\right)$, which decreases with $R$ due to contractive geometry[cite: 1].

Balancing these terms yields the optimal window size $R \asymp \frac{Dn}{L\eta}$, proving that running Noisy-SGD beyond the saturation scale does not incur additional privacy cost beyond constant factors[cite: 1].

---

### References
* Altschuler, J. M., & Talwar, K. (2023). *Privacy of noisy stochastic gradient descent: More iterations without more privacy loss*[cite: 1].
* Mironov, I. (2017). *Rényi differential privacy*[cite: 1].
EOF