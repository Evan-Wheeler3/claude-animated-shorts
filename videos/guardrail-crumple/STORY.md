---
story_id: guardrail-crumple
working_title: Why Guardrails Crumple
script_status: draft
codex_status: blocked
claude_status: in_production
target_duration_seconds: 49
format: "9:16"
owner_approved_script_at: null
---

# Why Guardrails Crumple

A car skids off a cliffside bend. Replay the skid with a guardrail to show how it redirects the car, then move to the end of the rail to compare two head-on impacts. The cutaway shows an impact head flattening the beam and feeding it sideways. End on the stopped car and the curled strip of steel.

- [Narrator script](SCRIPT.md)
- [Timed shot list](SHOTLIST.md)
- [Claude handoff](CLAUDE-PROMPT.md)

The city and the three crashes are a dramatized example.

- The face of the barrier is intended to redirect a vehicle in a side hit. During a head-on hit, an energy-absorbing end terminal can dissipate energy by extruding the rail away from the vehicle. [FHWA Guardrail 101](https://highways.fhwa.dot.gov/safety/rwd/reduce-crash-severity/guardrail-101)
- In the extrusion design shown, the head travels down the W-beam, deforms it and pushes it out the side. The cutaway is a schematic. The real result depends on impact and installation conditions. [FHWA and AASHTO crash analysis](https://www.fhwa.dot.gov/guardrailsafety/safetyanalysis/)
- ~~The abrupt stop at the old end is a dramatized comparison.~~ **Resolved 2026-11-22 (Claude, owner-approved line change):** the documented head-on hazard of untreated blunt W-beam ends was *spearing*: the rail could pierce the occupant compartment. Turned-down ends were a cheap fix that reduced spearing but could ramp a car into a launch or rollover. Energy-absorbing terminals came later to address both. Sources: [Wisconsin TOPS Lab guardrail-end report](https://topslab.wisc.edu/wp-content/uploads/2017/05/Guardrail-End-report.pdf), [TRB 1989 "Development of Guardrail Extruder Terminal"](https://onlinepubs.trb.org/Onlinepubs/trr/1989/1233/1233-004.pdf), [FHWA guardrail safety history](https://www.fhwa.dot.gov/guardrailsafety/history.cfm), [FHWA-AASHTO terminal analysis](https://www.fhwa.dot.gov/guardrailsafety/safetyanalysis/). The FHWA pages could not be fetched from the production container (network policy), so these were read through search summaries. SCRIPT.md line 5 changed from "…your car came to a sudden stop." to "…the rail could spear right through your car." Shot 5 shows the blunt beam end punching into the grille.

The handoff is saved for review. Script approval and production have yet to begin.

## Revision 2026-11-22 (owner)
- SCRIPT.md was reworded for clarity in full sentences; the owner approved the new text. Line 4 is the main fix: the rail bending was never the problem, the end of the rail was.
- Narration is the owner's cloned voice at 1.18× (`run_mac.sh`, built on the Mac). Sound is music only, with no SFX or chord hits.
- Every cut and beat now follows `voice/words.json`, so the new take re-times the picture and the music automatically.
