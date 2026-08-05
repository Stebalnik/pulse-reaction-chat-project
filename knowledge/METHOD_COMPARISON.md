# Method comparison

| Method | Input | Main assumption | Motion/illumination handling | Compute | Evidence in repository | Status |
|---|---|---|---|---|---|---|
| GREEN | RGB traces | Green channel often has strong pulsatile component | Weak; must be quality-gated | Low | van Es 2023; Macwan 2019; Poh 2010; Maestre-Rendon 2020; Lee 2014 | Baseline only |
| CHROM | RGB traces | Chrominance projection suppresses common-mode variation | Moderate motion robustness; can fail under low illumination | Low | de Haan 2013; van Es 2023; Macwan 2019 | MVP candidate |
| POS | Temporally normalized RGB traces | Plane-orthogonal-to-skin projection | Moderate motion robustness; can fail under low illumination | Low | van Es 2023; Macwan 2019; Zhang 2021; Fallet 2018 | MVP candidate |
| ICA/BSS | RGB traces | Independent components can separate pulse-like source from mixed RGB observations | Component order is unstable; low light and motion require ambiguity gates | Medium | Poh 2010; Ghanadian 2018; Christinaki not_reported | Benchmark comparator |
| PCA | RGB traces | Orthogonal components may isolate pulse-like variance | Can perform well in some setups; not motion/lighting proof; component choice still needs ambiguity handling | Low-medium | Fouad 2019; Gavriloaia 2015; Christinaki not_reported | Benchmark comparator |
| Adaptive skin segmentation | Frame pixels and face ROI | Removing nonskin pixels can improve trace quality | Helps ROI quality; segmentation mistakes and too-low valid pixel count become failure modes | Medium | Fouad 2019; van Es 2023; Chari not_reported | MVP support |
| Illumination equalization | ROI luminance/color traces | Stabilizing luminance reduces shadow/lighting variation | Helps but may overfit setup; must be measured | Medium | Ghanadian 2018; Zhang 2021; Sun 2012 | MVP support experiment |
| MAICA | RGB traces after face/skin processing | Periodic rPPG component can guide ICA extraction | Better than ICA in reported realistic datasets; vulnerable to periodic motion | Medium-high | Macwan 2019 | Phase 1.5 candidate |
| JBSS + skin-reflection projection | Facial and background ROI traces | Background ROI helps remove common illumination before projection | Stronger under changing/low illumination; ROI degrades under fast head motion | Medium-high | Zhang 2021 | Phase 1.5 candidate |
| RGB-space/diffuse ROI weighting | Regional RGB traces and diffuse/specular cues | Weighting before nonlinear inference can reduce imaging-noise and specular bias | Targets skin-tone/lighting/shadow bias | Medium-high | Chari not_reported | Fairness experiment |
| Adaptive frequency tracking / ASVD | RGB/iPPG traces | Streaming frequency trackers can reduce latency versus isolated FFT windows | Needs SQI and estimator-latency reporting | Medium | Fallet 2016; Fallet 2018 | Post-MVP streaming candidate |
| PCA + EMD forehead ROI | Forehead pixel sequences | Principal components and EMD can isolate pulse-like frequency content | Weak validation; fragile ROI | Medium | Gavriloaia 2015 | Low priority |
| Multi-imager ICA | Multi-camera RGB traces | More spatial dimensions mitigate rigid motion artifacts | Stronger under severe head motion, but requires special hardware | High | Kiehl 2015 | Not MVP |
