# QA report — 2026-10-02

**Result: broad QA completed, with eight fixes; not a full release certification.** The final automated suite has **146 passing tests**, zero failures, and clean formatting. Three synthetic campaigns passed live server scenarios with separate anonymous DM/player identities. A fourth campaign exercised the actual player and DM interfaces together. The remaining gaps below prevent claiming that every feature is proven correct.

## Fixed in this checkout

| Finding | Reproduction | Result after correction |
| --- | --- | --- |
| Pact slots could not pay for another class's spells | Wizard/warlock exhausts normal slots, retains pact slots, attempts Magic Missile | Casting remains available; the picker names the pact pool, consumes it, and uses its level for the roll |
| Wild Shape healing affected the original character | Wolf at 5/11 HP, druid at 38/38; heal 3 | Wolf becomes 8/11; original HP remain 38. Local, potion and DM healing use the same helper |
| Transformation and voluntary reversion did not consume actions | Moon druid transforms during a tracked turn | Transformation spends the selected action or bonus action and one use. A second bonus action is refused; automatic reversion from damage still works |
| Combat/party displayed original HP and AC during Wild Shape | Original AC 12/HP 38; wolf AC 13/HP 11 | Player metrics and shared party summary show the active beast; player movement and HP dialog match it |
| Unattuned magic weapons still applied attack/damage effects | Unattuned Sun Blade with +2 and extra damage | Bonuses and extra damage remain inactive until attuned |
| Casting dialog described the primary class's casting modifier | A spell belongs to a secondary class using a different ability | Dialog uses the spell's own caster, matching the existing roll implementation |
| Encounter difficulty counted the primary level only | Wizard 3 / warlock 2 fighting a goblin | Level-five thresholds are 250/500/750/1100; the UI now calls this encounter Trivial |
| DM initiative controls crossed the phone card edge | Goblin and a long character name at a 390px viewport | Controls wrap beneath the name; verified document width and scroll width both 380px (scrollbar excluded) |

The offline cache fingerprint was regenerated so clients receive the changes.

## Automated coverage

The original suite passed before edits (128 tests). Added matrix, printing and regression tests raise the total to 146. Some original tests are syntax checks; the count is not 146 complete user journeys.

- All 13 classes at levels 1–20: finite derived stats, proficiency, total level, hit dice, resources, pending choices and validated saved sheets.
- All 118 subclasses: level-20 features and valid granted spell references.
- All 156 ordered pairs of different classes: combined level, proficiency, hit dice and import validation.
- All 155 race variants and 78 backgrounds: references, racial spell links and defense calculation.
- All 524 spell summaries: roll parsing at native level and level 9, without invalid numeric output. This checks parsing, not the full rules text of every spell.
- All 96 magic item entries: addition, attunement, quantity-zero inactivity and validation.
- All 334 monsters: companion imports and validation.
- Printed output for all 13 classes, plus escaping of imported character names and notes.
- Targeted regression coverage for pact spending/exhaustion/recovery, Wild Shape healing/action use/vitals, revival, unattuned weapon effects and total multiclass level in party summaries.
- Existing suites cover weapon profiles, critical hits, advantage, feats, defenses, timed effects, multiclass spell slots, origins, saved characters, backup mocks and cloud conflict handling.

## Played scenarios

### Local browser characters

**Bruna, fighter 1:** completed the full character creator with human bonuses, Soldier skill grants, selected skills, standard array, weapons, chain mail and shield. Review and final sheet showed AC 18 and HP 12. Tested tracked turns, physical attack/critical rolls, compact mode, persistence and phone layout.

**Lyra, wizard 3:** imported a synthetic sheet, cast Detect Magic, spent a slot, recorded concentration/duration, received damage and failed the concentration check. Added and attuned a Ring of Protection; AC rose from 12 to 13.

**Nara, Moon druid 5:** imported an owl companion, searched eligible beasts in English, became a wolf, tested beast damage/healing, action restrictions, spell blocking and reversion. Twenty damage against an 11-HP wolf restored original form and left the original character at 29/38. Short rest restored Wild Shape uses; long rest restored HP. Advanced to druid 6 (38→45 maximum HP) and undid the change back to level 5. Malformed JSON was rejected without replacing the sheet.

**Pact regression character:** wizard 3 / warlock 2, all normal slots spent. Cast Magic Missile from a pact slot through the UI; the pact pool decreased 2→1 while normal slots remained empty.

### Configured live server

Three campaigns were created with synthetic data only: **QA 2026-10-02 – Arcane Ruins**, **Moon Forest**, and **Pact Siege**. Each exercised the app's actual Cloud module with independent DM, player and outsider identities:

- Create/join/attach and character synchronization.
- Outsider access denial and player refusal when editing DM settings.
- DM campaign settings/session data.
- PC and monster initiative, hidden creature filtering, and secret HP/AC withheld from players.
- Attack resolution against hidden AC and server-side monster damage.
- Passing a player's turn; refusing a player attempting to pass a monster's turn.
- Loot creation/claim; refusing a second claim.
- Homebrew rule publication.
- Pending healing command retrieval and marking applied.
- Refusing player-forged gold commands.
- Character update/flush and encounter termination.

**QA 2026-10-02 – Goblin Road** additionally used the real browser interfaces: player joins, live presence, DM sends six damage, both views update 34→28 HP, reload preserves 28 HP without duplicate damage, session starts/ends, 150 XP and summary arrive, a goblin is imported, party enters initiative and multiclass difficulty is checked. These two browser tabs share one local anonymous session; distinct-role permissions were verified in the separate API scenarios above.

Four clearly named QA tables and their synthetic records remain on the configured server. The API campaigns used temporary anonymous identities. No existing campaign data was edited. No database migrations were applied; no commits or GitHub pushes were made.

## Visual inspection

Inspected screenshots of all seven player sections on desktop, the character creator, compact combat on a phone, the complete DM view and its phone initiative controls, magic items, Wild Shape, and the generated printable layout. Desktop player routes had matching document/scroll widths (1270px). The verified phone compact layout and fixed DM layout had no horizontal page overflow.

Selected evidence is in [docs/qa/2026-10-02](2026-10-02/). The printable screenshot is a screen preview of the actual generated HTML at A4 content width, not a native PDF pagination result.

## Remaining findings and verification limits

1. **P1 — Cloud backup deployment missing.** The interface reports migration 007 is required. A read-only server check returned HTTP 404 / `PGRST205`: `public.backups` is absent from the schema cache. Live backup/restore cannot work until [007_backups.sql](../../supabase/migrations/007_backups.sql) is deployed. Mock backup tests pass, which does not establish production availability.
2. **P2 — Wild Shape physical ability rolls (fixed after this report: checks, saves and initiative now use the beast STR/DEX/CON; max HP keeps the druid CON).** A wolf has STR/DEX/CON 12/15/12, but `Rules.scores` still returns the druid's 14/14/14 and the generic CON save remains +2. Beast attack buttons use copied attack bonuses; ordinary physical checks and saves are not fully replaced. HP/AC/movement/healing fixes do not complete that rules feature. Physical scores, retained/beast proficiencies, form defenses and equipment interaction need a dedicated implementation and tests. See the [official SRD 5.1 Wild Shape rules](https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf).
3. **P3 — Difficulty text after reload.** The DM difficulty line is absent until the lazily loaded monster catalog is available and the view redraws. Opening a monster and updating the tracker restores it. This is separate from the corrected multiclass-level calculation.
4. **JSON download round trip unverified.** Clicking export produced no console error, but the browser tool did not capture a download event. JSON imports and malformed-file rejection were exercised. Actual file download/round-trip still needs a normal-browser check.
5. **Native print/PDF unverified.** Generated content, escaping and screen layout were checked. Browser print dialog interaction, physical page breaks, large level-20 spellbooks and printer output were not verified.
6. **Remaining mobile routes not certified.** The compact player and DM phone screens were verified. Later viewport overrides affected a different browser surface while the player tab stayed at desktop width, so those captures are counted only as desktop evidence, not phone passes.
7. **Other unexercised live branches:** email/password creation, password changes, account merging, destructive deletion, full airplane-mode/reconnect behavior, concurrent two-player loot races, prepared encounter launch animations, and the complete area-save/friendly-fire chain. Their presence in code, syntax checks or related unit tests is not a live end-to-end pass. No real credentials or user accounts were changed.

The test matrix establishes broad data and regression coverage, not every optional rules exception or every combination of choices. Resolve items 1–2 before describing the new backup and Wild Shape features as fully working.
