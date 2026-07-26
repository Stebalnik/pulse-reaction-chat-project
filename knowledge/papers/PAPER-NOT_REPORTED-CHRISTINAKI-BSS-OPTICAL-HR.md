# PAPER-NOT_REPORTED-CHRISTINAKI-BSS-OPTICAL-HR

## identity

- title: Comparison of Blind Source Separation Algorithms for Optical Heart Rate Monitoring
- authors: Eirini Christinaki, Giorgos Giannakakis, Franco Chiarugi, Matthew Pediaditis, Galateia Iatraki, Dimitris Manousos, Kostas Marias, Manolis Tsiknakis
- year: not_reported
- venue: not_reported
- doi: not_reported
- source_pdf: `Sources/Comparison_of_Blind_Source_Separation_Al.pdf`
- evidence_status: PROVISIONAL

## research_question

Compare blind source separation approaches for optical/camera-based HR monitoring.

## method

- Compares BSS algorithms such as ICA/PCA-style source separation on optical HR traces.
- Exact method details require re-reading before implementation.

## capture

not_reported in this pass

## participants

not_reported

## ground_truth

not_reported

## evaluation

not_reported in this pass

## results

No numeric project claim accepted in this pass.

## limitations

- Short paper with limited extraction detail.
- Treat as background for BSS comparison, not as priority-setting evidence.

## reproducibility

Low-to-medium after full formula extraction.

## project_relevance

- score: 4/10
- Useful to remind the benchmark harness to keep source-separation algorithms pluggable.

## evidence_updates

- Supports adding BSS comparison hooks after POS/CHROM/GREEN are working.

## proposed_experiments

- Add `source_separation_method` to benchmark config when ICA/PCA variants are implemented.
