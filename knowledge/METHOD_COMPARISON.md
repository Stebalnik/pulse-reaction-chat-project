# Method comparison

| Method | Input | Main assumption | Motion/illumination handling | Compute | Evidence in repository | Status |
|---|---|---|---|---|---|---|
| GREEN | RGB traces | Green channel often has strong pulsatile component | Weak; must be quality-gated | Low | van Es 2023; Macwan 2019 | Baseline only |
| CHROM | RGB traces | Chrominance projection suppresses common-mode variation | Moderate motion robustness; can fail under low illumination | Low | van Es 2023; Macwan 2019 | MVP candidate |
| POS | Temporally normalized RGB traces | Plane-orthogonal-to-skin projection | Moderate motion robustness; can fail under low illumination | Low | van Es 2023; Macwan 2019; Zhang 2021 | MVP candidate |
| MAICA | RGB traces after face/skin processing | Periodic rPPG component can guide ICA extraction | Better than ICA in reported realistic datasets; vulnerable to periodic motion | Medium-high | Macwan 2019 | Phase 1.5 candidate |
| JBSS + skin-reflection projection | Facial and background ROI traces | Background ROI helps remove common illumination before projection | Stronger under changing/low illumination; ROI degrades under fast head motion | Medium-high | Zhang 2021 | Phase 1.5 candidate |
| RGB-space/diffuse ROI weighting | Regional RGB traces and diffuse/specular cues | Weighting before nonlinear inference can reduce imaging-noise and specular bias | Targets skin-tone/lighting/shadow bias | Medium-high | Chari not_reported | Fairness experiment |
| PCA + EMD forehead ROI | Forehead pixel sequences | Principal components and EMD can isolate pulse-like frequency content | Weak validation; fragile ROI | Medium | Gavriloaia 2015 | Low priority |
| Multi-imager ICA | Multi-camera RGB traces | More spatial dimensions mitigate rigid motion artifacts | Stronger under severe head motion, but requires special hardware | High | Kiehl 2015 | Not MVP |
