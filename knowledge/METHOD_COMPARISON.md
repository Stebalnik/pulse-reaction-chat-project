# Method comparison

| Method | Input | Main assumption | Motion handling | Compute | Evidence in repository | Status |
|---|---|---|---|---|---|---|
| GREEN | RGB traces | Green channel often has strong pulsatile component | Weak | Low | Pending ingestion | Baseline |
| CHROM | RGB traces | Chrominance projection suppresses common-mode variation | Moderate | Low | Pending ingestion | Candidate |
| POS | Temporally normalized RGB traces | Plane-orthogonal-to-skin projection | Moderate | Low | Pending ingestion | Candidate |
