---
title: "PatchAlign: Fair and accurate skin disease image classification by alignment with clinical labels"
collection: publications
category: Peer Reviewed Paper
permalink: /publication/MICCAI24
excerpt: 'This paper is about the number 1. The number 2 is left for future work.'
date: 2024-10-03
venue: 'MICCAI'
slidesurl: 'http://aayushmanda.github.io/files/slides1.pdf'
paperurl: 'https://arxiv.org/pdf/2409.04975'
bibtexurl: 'http://aayushmanda.github.io/files/bibtex1.bib'
citation: 'Aayushman, Gaddey, H., Mittal, V., Chawla, M., & Gupta, G. R. (2024). MICCAI'
---

Deep learning models have achieved great success in automating skin lesion diagnosis. However, the ethnic disparity in these models' predictions needs to be addressed before deploying them. We introduce a novel approach, PatchAlign, to enhance skin condition image classification accuracy and fairness by aligning with clinical text representations of skin conditions. PatchAlign uses Graph Optimal Transport (GOT) Loss as a regularizer to perform cross-domain alignment. The representations obtained are robust and generalize well across skin tones, even with limited training samples. To reduce the effect of noise and artifacts in clinical dermatology images, we propose a learnable Masked Graph Optimal Transport for cross-domain alignment that further improves fairness metrics.
We compare our model to the state-of-the-art FairDisCo on two skin lesion datasets with different skin types: Fitzpatrick17k and Diverse Dermatology Images (DDI). PatchAlign enhances the accuracy of skin condition image classification by 2.8% (in-domain) and 6.2% (out-domain) on Fitzpatrick17k, and 4.2% (in-domain) on DDI compared to FairDisCo. Additionally, it consistently improves the fairness of true positive rates across skin tones.
