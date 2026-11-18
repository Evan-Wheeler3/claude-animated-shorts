# <Video title>: production retrospective

Copy to `videos/<name>/PRODUCTION-RETROSPECTIVE.md`. Write only what happened (commits, renders, measurements). Mark
anything unresolved as such. Promote reusable lessons to `docs/learning/PRODUCTION-LESSONS.md`.

## 1. Project overview
Topic, runtime, dates, gates passed, final deliverables (paths).

## 2. Initial implementation
What existed at the start (assets, code), what was built first, first render results.

## 3. Problems encountered
Numbered; for each: symptom, where seen (render path / frame), root cause.

## 4. Iterations performed
Per problem or per shot: what changed, render before/after (paths), result.

## 5. Solutions that worked
The fix and the file/function that implements it.

## 6. Failed approaches
What was tried and why it did not work.

## 7. Performance considerations
Render times per still / per frame, scale used, bottlenecks (software GL, shadow map size, ...).

## 8. Reusable improvements
Code or docs promoted to `src/pipeline/` or `docs/learning/`.

## 9. Outstanding limitations
Known issues shipped or deferred, with the reason.

## 10. Recommendations for the next production
Concrete, actionable.
