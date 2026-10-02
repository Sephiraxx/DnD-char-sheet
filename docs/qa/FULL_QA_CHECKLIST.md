# Full QA checklist — 2026-10-02

All 192 supplied checklist lines are assessed below. **This is a QA assessment, not a claim that all 192 journeys passed.** **162 pass · 5 fail · 25 skipped.** Machine-readable results are in `checklist-results.json` beside this report.

**Rating: 8/10.** The sheet is substantial, attractive and useful for play. Its main gaps are unusual rules combinations and release verification, rather than missing main pages.

## What the marks mean

- **✓ Pass:** the stated behavior was verified to the scope described in the evidence column. `UI` means real browser interaction; `Logic` means executable tests of the actual application modules; `Live` means the configured server with synthetic identities and data. A logic pass does not establish every browser/device combination.
- **✗ Fail:** a reproducible discrepancy remains in this checkout or configured service.
- **– Skip:** the complete expectation was not verified. Partial results and the exact limitation are recorded; skips are not counted as passes.

The baseline was commit `4d26104`. Earlier runs in this same QA work covered three independent server campaigns (Arcane Ruins, Moon Forest, Pact Siege) and the Goblin Road player/DM UI campaign. This completion pass added a campaign for concurrent loot and backup ownership, four full creator paths, additional player interactions, a sixth campaign (Lantern Keep) covering full table creation, DM commands, shared rolls, Bless, area saves and encounter launch, plus 30 regression tests. The final suite has **177 passing tests, zero failures**, and clean formatting. Test counts include syntax checks and are not counts of user journeys.

The follow-up account/encounter results already recorded in [QA_REPORT.md](QA_REPORT.md) are attributed explicitly below. They were not silently treated as new browser runs. The old Goblin Road join code now returns “No existe una mesa con ese código”; the earlier report's claim that all four old QA tables remain is therefore stale.

## Corrected in this completion pass

1. **Point buy on a phone:** long labels pushed controls into the neighboring card. At 390px, clicking Constitution could hit the Intelligence card, leaving the score unchanged. Cards now stack the label over 44px controls. Retested clicks and the 27-point cap at 390px; layouts also verified at actual 320px, 768px and 1270px widths.
2. **Effective ability display:** an attuned Amulet of Health showed a +4 modifier beside the written Constitution 13. It now shows `19 (objeto)`. Active Wild Shape physical cards show the beast's scores and `(bestia)`.
3. **Level-up with magic Constitution:** the HP step described the written modifier although the resulting maximum used the magic score. The preview and minimum-HP calculation now use effective Constitution, for primary and secondary classes. A rolled 1 with written CON 3 and an Amulet correctly adds 5 HP.

4. **Secondary-class level-up confirmation and HP:** provisional views had an invalid legacy subclass, carried another class’s spent slots and held the old total level. New-class confirmation could fail, and the review understated HP. Views now validate without altering real spent resources; total level advances in previews. Actual wizard/barbarian and wizard/warlock UI confirmations plus secondary level-four ASI regressions pass.
5. **Remote own-turn navigation:** initiative delivered the turn notice but left the player on Personaje. The remote turn handler now opens Combat. Retested against a real DM turn event, with a regression for own and other turns.
6. **Encounter overlay on phones:** long announcements clipped, and some decorative particles introduced horizontal scrolling. Text now wraps within the viewport and particles remain inside the overlay. All 25 animation choices were previewed and visually inspected.

The offline cache fingerprint was regenerated. These changes are local; no commit, push, deployment or database migration was made in this pass.

## Remaining failures

| Priority | Check | Reproduction and impact |
| --- | --- | --- |
| P2 | I-02 | Wizard 3 / fighter 1 has 3d6 + 1d10. The actual short-rest handler accepts **three d10 results**, heals 33 with CON +1, and marks three dice spent. It tracks a single aggregate spent count, so it cannot enforce availability separately for each die type. |
| P2 | N-07 | Become a wolf with no personal Stealth proficiency. The monster has **Sigilo +4**, but the sheet gives **+2**. STR/DEX/CON, vitals and original HP are correct; the form omits the beast's skill/save proficiency data. |
| P2 | R-07 | Monster breath’s target picker is restricted to player characters (`monsters-ui.js:273,420`). With a dragon and three skeletons in initiative, only the player sheets can be selected. Successful/failed player saves resolve correctly, but the dragon’s skeleton allies cannot receive friendly fire through this flow. |
| P3 | R-02 | Wolf trait headings are Spanish, but the descriptions of Keen Hearing and Smell and Pack Tactics are English. Other monster prose is also only partly translated. The checklist's completely Spanish stat block is not achieved. |
| P2 | S-03 | Fresh live anonymous identities were created **without CAPTCHA tokens**. This is evidence that server enforcement is not presently requiring CAPTCHA for that flow; the dashboard toggle itself was not accessible. The client has a Turnstile key, which alone does not prove server enforcement. |

The last item is an inference from successful tokenless sign-ins and the documented token requirement, not a dashboard observation. See [Supabase anonymous sign-in](https://supabase.com/docs/reference/javascript/auth-signinanonymously) and [CAPTCHA protection](https://supabase.com/docs/guides/auth/auth-captcha). The Wild Shape discrepancy is against the retained/beast proficiency rules in [SRD 5.1](https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf).

## A — Opening, offline and updates

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| A-01 | – | First open on a phone | Phone-width browser layouts checked; no physical phone or fresh mobile-browser welcome session available. |
| A-02 | ✓ | Desktop welcome | UI: welcome offers create, join a table and DM entry points. |
| A-03 | – | Home-screen installation | Requires iOS/Android installation and standalone launch on hardware. Manifest/icon presence is not an installation pass. |
| A-04 | – | Airplane-mode reopen and save | Cache-file coverage and local saving pass; actual phone airplane mode and cold offline launch not exercised. |
| A-05 | – | Closed app receives deployment | Logic: waiting update activates immediately and reloads once. No real new version was published during this QA. |
| A-06 | – | Update banner during use | Logic: delayed installation offers the banner; visibility return requests an update. Actual deployment/switch-away journey not performed. |
| A-07 | – | Actualizar | Logic: button activates the worker, removes the banner and reloads once. New deployed version not exercised. |
| A-08 | – | Después | Logic: dismisses without activation/reload. Actual deployed-version banner not exercised in-browser. |

## B — Character creator

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| B-01 | ✓ | Open and exit | UI: creator opens at class; Salir closes it. |
| B-02 | ✓ | Class cards and filters | UI: filters and fighter/wizard cards; hit die, saves and class details displayed. |
| B-03 | ✓ | Starting level | UI: fighter starting level changed to 2; review and created HP match that level. |
| B-04 | ✓ | Book filtering | UI: eight books reduced to PHB only; backgrounds reduced to 20 and race families to 9, with PHB labels. Logic: common source filtering applies to spells too. |
| B-05 | ✓ | Background search/custom | UI: custom background selected and persisted in draft; Sage/Soldier found in English/Spanish. Soldier and Sage grants appear automatically in skills. |
| B-06 | ✓ | Race/subrace/custom | UI: High Elf traits/languages/speed and grants; PHB tiefling creation; custom Copperkin name accepted into the next step. |
| B-07 | ✓ | Ability methods | UI: array, manual, 4d6 drop-lowest and point buy. Retest reaches exactly 27; every increment is disabled at the cap. Racial bonuses shown. |
| B-08 | ✓ | Class skill count | UI: two class selections; origin grants disabled and excluded from those two choices. |
| B-09 | ✓ | Creator spells | UI: wizard 3 cantrips, 6 book spells, 4 prepared at level 1; extra selections refused clearly. Fighter has no class-spell step. Logic covers caster limits. |
| B-10 | ✓ | Chain mail and shield | UI: fighter review and created sheet AC 18 before choosing Defense style. |
| B-11 | ✓ | Details/review/create | UI: fighter and tiefling names, languages, speed, HP, AC and skills match review. |
| B-12 | ✓ | Tiefling Thaumaturgy | UI: full PHB tiefling creator; Taumaturgia appears as a racial extra on the resulting sheet. |
| B-13 | ✓ | Draft resume | UI: exit, reload, reopen restores the step and choices; explicit resume message. |
| B-14 | ✓ | Restart confirmation/clear | UI: user accepted the restart confirmation. Creator returned to empty class step 1; reload/reopen confirmed the old draft was cleared. |
| B-15 | ✓ | Create into a table | UI/Live: valid Lantern Keep code in step 1 applies PHB, starting level 2, fixed 16/15/14/12/10/8 array and array-only method; completed fighter joins the table automatically. |
| B-16 | ✓ | Full phone creator | UI: complete fighter and tiefling flows at actual 390px; point-buy overlap found, fixed and retested. Other widths checked for the corrected cards. |

## C — Characters, saving and files

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| C-01 | ✓ | Switch characters | UI: fighter, wizard, druid and pact characters; chosen sheet opens and list closes. |
| C-02 | ✓ | Create from open sheet | UI: Personajes → Crear personaje closes list and opens creator, repeatedly. |
| C-03 | – | Desktop JSON download | Export was clicked; in-app browser did not deliver a download event. Earlier follow-up records a successful normal-browser round trip; not independently repeated here. |
| C-04 | – | iPhone/Android export | Physical Safari/Android and native share sheet unavailable. |
| C-05 | – | Export/import identical copy | Fixture imports pass. Earlier follow-up reports an exported-file round trip with magic items/multiclass; actual downloaded file was not captured here. |
| C-06 | ✓ | Broken JSON | UI: malformed file refused, current sheet preserved; validation tests reject corrupt data. |
| C-07 | ✓ | Replace-current import confirmation | UI: file chooser selected a character fixture; Importar ficha names the replacement and asks before applying. Cancel leaves QA Nara and its 34/52 HP unchanged. |
| C-08 | ✓ | Previous copy | UI: origin languages edited, recovery confirmed; preceding language list restored and toast shown. |
| C-09 | ✓ | Header/journal undo | UI: header undo restores a change; Diario Deshacer removes the added rope entry and its history record. |
| C-10 | ✓ | Two-tab update notice | UI: edit in one tab announces “Ficha actualizada desde otra pestaña” in the other. |
| C-11 | – | Delete character | UI: Mi ficha → Eliminar personaje opens a confirmation. Actual removal and automatic fallback await the requested human confirmation. Logic remove/active-character protection passes. |

## D — Personaje page

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| D-01 | ✓ | Scores/modifiers/bonuses | Logic and UI: proficiency, expertise, bard half-proficiency implementation, effective item/beast modifiers; displayed arcana +6 after INT change. |
| D-02 | ✓ | Skill/save roll dialog | UI: d20 dialogs expose Normal, advantage/disadvantage and physical die; physical saves and attacks exercised. |
| D-03 | ✓ | Edit abilities/AC dependencies | UI: STR/INT edit updates attack/skill bonuses; equipped defense recalculates. Logic covers base/formula AC. |
| D-04 | ✓ | Proficiency/expertise | UI: Arcana proficiency + expertise saved; bonus updates with INT. |
| D-05 | ✓ | Origin/identity edit | UI: three card steps, languages edit; class, HP, inventory and feat remain. Recovery restores preceding identity. |
| D-06 | ✓ | Fire resistance | UI: manually added fire resistance; damage 2 becomes 1 with explanation. |
| D-07 | – | Native PDF | Generated light print HTML and contents checked; native print dialog/PDF export unavailable. |
| D-08 | – | Level-20 PDF pagination | Automated printed content covers all classes; physical page breaks/cuts in a large native PDF not verified. |

## E — Combat, full view

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| E-01 | ✓ | Begin own turn | UI and Logic: action, bonus and reaction available. |
| E-02 | ✓ | Second action refused | UI disables spent actions; Logic refuses an additional action. Action Surge exception tested separately. |
| E-03 | ✓ | End/next turn and reaction | Logic: end preserves spent reaction; start resets tokens. UI next-turn confirmation resets action. |
| E-04 | ✓ | Typed resisted damage | UI: 2 fire damage halved to 1; reason shown. |
| E-05 | ✓ | Temporary HP first | UI: temp 7, damage 5 leaves temp 2 without changing current HP. |
| E-06 | ✓ | Zero HP | UI: unconscious/prone and death-save controls appear. |
| E-07 | ✓ | Death-save outcomes | UI physical dice: three successes stable, three failures dead, natural 20 restores 1 HP. |
| E-08 | ✓ | Heal from zero | UI and Logic: death counters clear and unconscious ends; prone correctly remains. |
| E-09 | ✓ | Conditions affect rolls | Logic: poisoned/prone disadvantage, invisible advantage, cancellation, and STR/DEX automatic failures. |
| E-10 | ✓ | Dice/results | UI: physical/digital attack and companion rolls show animated results and journal entries. This verifies the shared rolling/result system. |
| E-11 | ✓ | Spanish glossary | UI: dice notation, modifiers, advantage, components and concentration explained in Spanish. |
| E-12 | ✓ | DM Inspiration star/use | UI/Live: DM grants ★; player selects Inspiration in the requested check, physical d20 14 +3 =17; Inspiration is consumed and DM control returns to ★ Insp. |

## F — Attacks

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| F-01 | ✓ | Correct to-hit | Logic and UI: weapon ability/proficiency, wizard staff, fighter weapons; live hidden-AC hit resolution. |
| F-02 | ✓ | Critical doubles dice | UI physical 20; Logic asserts doubled damage rolls, without doubling the flat modifier. |
| F-03 | ✓ | Advantage/disadvantage | Logic asserts both d20 and highest/lowest selection; UI dialogs expose both modes. |
| F-04 | ✓ | Off-hand modifier | Logic: positive modifier omitted unless Two-Weapon Fighting. |
| F-05 | ✓ | Weapon overrides | Logic: explicit INT, proficiency, +1 and extra 1d6 update attack/damage totals. The full editing form is not a separate end-to-end run. |
| F-06 | ✓ | Extra Attack | Logic: fighter 5 has two attacks per action; class matrix covers progression. |
| F-07 | ✓ | Monk unarmed | UI/Logic: full wood-elf monk 1 creator, STR 8 and DEX 17. Combat unarmed strike uses +5 to hit and 1d4+3 bludgeoning; monk Martial Arts scaling also tested. |

## G — Spells and casting

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| G-01 | ✓ | Choose slot | UI: Detect Magic cast with a selected level-2 slot, pool 2→1; normal level-1 spending also exercised. |
| G-02 | ✓ | Fireball level 5 | Logic: 10d6. |
| G-03 | ✓ | Magic Missile level 3 | Logic: five darts, total 5d4+5, note states 1d4+1 each. |
| G-04 | ✓ | Level-five cantrips | Logic: Fire Bolt 2d10; Eldritch Blast two separate beams of 1d10. |
| G-05 | ✓ | Cure Wounds modifier | Logic: healing flag and spellcasting modifier included; slot scaling 2d8 at level 2. |
| G-06 | ✓ | Concentration after damage | UI: pending CON save, DC 10, fail removes concentration; damage/DC calculation uses adjusted damage. |
| G-07 | ✓ | Replace concentration | Logic: second spell replaces first; old linked local effect removed. Remote allies are covered by O-10's separate limitation. |
| G-08 | ✓ | Ritual without slots | UI: +10-minute explanation; starting Detect Magic ritual preserves 2/2 slots and records concentration. |
| G-09 | ✓ | 2014 bonus spell rule | Logic: bonus spell blocks leveled action spell but permits action cantrip; reverse casting order also refused. |
| G-10 | ✓ | Solo tirar spends nothing | UI: Solo tirar Magic Missile rolls 3d4+3; slots stay 2/2 and the action remains free. This comparison used untracked combat. |
| G-11 | ✓ | No compatible slots | Logic: exhausted pools refused with “No quedan espacios…”; no mutation on rejected cast. |
| G-12 | ✓ | Pact short-rest recovery | Logic and UI: pact casting/spending; short reset restores pact and preserves ordinary spent slots. |

## H — Compact combat

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| H-01 | ✓ | Preference persists | UI: compact survives reload and applies to next character; full view restores detailed controls. |
| H-02 | ✓ | Metrics stay pinned while scrolling | UI: scroll position 1365px; compact metrics remain at top 8px, with HP/AC/initiative/DC/speed visible. Screenshot inspected. |
| H-03 | ✓ | HP and initiative controls | UI: compact HP opens the correct dialog; initiative uses shared d20 handler. Initiative result itself not a distinct live-table test. |
| H-04 | ✓ | Slot/resource pills | UI: slot availability 3→2; Arcane Recovery 1→0 after confirming use. |
| H-05 | ✓ | Favorites | UI: two stars show only those spells; “Ver los 7” restores all, “Solo favoritos” returns the filter. |
| H-06 | ✓ | Concentration row | UI: pending line with Tirar, Superada, Fallada; passing clears prompt. Screenshot saved. |
| H-07 | ✓ | Phone compact | UI: actual 390px, no horizontal overflow, readable controls. |

## I — Resources and rests

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| I-01 | ✓ | Seven class resources | Logic: actual handlers for rage, Second Wind, Action Surge, ki, sorcery, channel; Bardic Inspiration use/reset. Chosen costs/action types and second-action refusal tested. |
| I-02 | ✗ | Hit Dice/rest recovery | UI single-class physical/digital healing and recovery pass. Multiclass handler accepts 3d10 when only 1d10 exists; see failure above. |
| I-03 | ✓ | Long rest | UI restores HP/temp/resources; Logic covers slot/pact recovery and half Hit Dice. |
| I-04 | ✓ | Zero-HP long rest refused | UI: clear refusal requiring at least 1 HP. |
| I-05 | ✓ | Custom resource | UI: three Map Charges pips, spend 3→2, short rest without dice restores 3/3. |

## J — Spell manager

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| J-01 | ✓ | Full manager/counters | UI: wizard full cards, cantrip/book/prepared counters; save reports excess clearly. |
| J-02 | ✓ | Wizard book/prepare limit | UI: add Grease to book, unprepare Magic Missile, save at 6/6; seven prepared refused. Logic tests boundary. |
| J-03 | ✓ | Cleric/druid/domain limits | Logic: both preparation boundaries enforced; Life domain spells usable and excluded from prepared count. |
| J-04 | ✓ | Bard/sorcerer known limit | Logic: actual manager validation accepts exact limit and rejects one extra for each class. |
| J-05 | ✓ | Spanish/English search | UI: Magic Missile and Proyectil mágico resolve to same card; scope/filter controls exercised. |
| J-06 | ✓ | Any-class/level DM extra | UI: wizard level 1 adds True Resurrection (level 9, another class) through whole-catalog Extra del DM; saved extra appears on the sheet. |
| J-07 | ✓ | Custom spell create/edit/cast | UI: create Cartographer Spark, select as extra, edit summary, cast from combat; action/effect recorded. |

## K — Class and level-up

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| K-01 | ✓ | Levels 1–20 | UI progression/ASI markers; matrix evaluates every class at every level. |
| K-02 | ✓ | Up-to-date/pending list | UI: automatic Amulet/feat/equipment summaries, high-elf missing-cantrip task/button and count. |
| K-03 | ✓ | Average/rolled HP | UI: fighter average and physical 8, druid average; magic-CON preview/calculation corrected and regression tested. |
| K-04 | ✓ | Required subclass | UI: cannot advance fighter 3 without subclass; Champion chosen and saved. Logic requires due subclasses. |
| K-05 | ✓ | ASI distributions/cap | UI previews +2 and +1/+1; Logic applies each and refuses >20. |
| K-06 | ✓ | Feat search/automation | UI English Resilient finds Resistente; card shows automatic effects and ability choice. |
| K-07 | ✓ | Resilient choice | UI WIS 10→11, WIS save becomes proficient +2; feat persists in class summary. |
| K-08 | ✓ | Skill Expert choices | Logic: new skill and expertise applied, missing choices rejected. Full Skilled/Skill Expert picker interaction not separately run. |
| K-09 | ✓ | Tough/Alert/Mobile/Observant | Logic: +2 HP/level, +5 initiative, +10 speed, +5 passive bonus. |
| K-10 | ✓ | Lucky | Logic: three points; short rest preserves spend, long rest restores. |
| K-11 | ✓ | War Caster concentration | Logic: actual concentration dialog selects advantage when feat present. |
| K-12 | ✓ | Armor feats | Logic: armor proficiency additions and score cap; equipped armor uses the same proficiency source. |
| K-13 | ✓ | Priest level-up/preparation save | UI: druid 5→6 prepares Aura de vitalidad and confirms; new cleric secondary level 1 chooses Life domain, cantrips, Shield of Faith and Guiding Bolt and saves. Resulting combat catalog includes the secondary spells and automatic Bless. |
| K-14 | ✓ | Pact-required invocations | UI: Improved Pact Weapon disabled before choosing a pact; warlock level 3 chooses Pact of the Blade, then the invocation becomes selectable. |
| K-15 | ✓ | Edit class choice without level | UI: independent warlock invocation editor saves Devil’s Sight and Eyes of the Rune Keeper, then changes Devil’s Sight to Improved Pact Weapon without advancing level. |
| K-16 | ✓ | XP level-ready line | UI/Live: DM grants 1000 XP to fighter 2; Clase displays that XP is enough to level up. |

## L — Multiclass

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| L-01 | ✓ | Level-up chooser entries | UI: mixed wizard/warlock chooser lists main class, secondary class and new class; single-class druid and tiefling chooser also exercised. |
| L-02 | ✓ | Requirement warning/override | UI: wizard with STR 8 sees barbarian STR 13 warning and can continue when prerequisites are overridden by the table. |
| L-03 | ✓ | Secondary class HP/proficiencies | UI/Logic: new barbarian secondary shows proficiencies and d12 HP. Found confirmation/HP-review bugs, fixed and retested: wizard 1, CON +2, average 7 gives 8→17 HP. Cleric secondary domain/spells also saved. |
| L-04 | ✓ | Secondary spell tables | Logic: per-class views, usable/prepared lists and caster selection; broad class-pair matrix. Full secondary manager UI is separate in L-08. |
| L-05 | ✓ | Wizard 8/cleric 1 slots | Logic: exact 4/3/3/3/1 assertion. |
| L-06 | ✓ | Secondary casting ability | Logic: cleric WIS DC/attack; caster dialog fixed in earlier pass to match class-specific stats. |
| L-07 | ✓ | Pact pays wizard spell | UI: ordinary slots exhausted, wizard Magic Missile consumes pact 2→1, normal pool unchanged. |
| L-08 | ✓ | Multiclass cards/edit controls | UI: secondary warlock card shows spells, attack/DC, choices and pending entries. Options changed and saved; Conjuros editor opened and saved unchanged. |
| L-09 | ✓ | Secondary level-four ASI step | Logic: actual LevelUp.startFor and wizard handlers advance secondary fighter 3→4, offer ASI and apply +2 STR, preserving primary level and spent slots. |

## M — Equipment and magic items

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| M-01 | ✓ | Catalog/custom/quantity/weight | UI: custom Map Case 2→3 at 1.5 lb each, weight 27.5 lb; rope from catalog added and undone. |
| M-02 | ✓ | Coins | UI: gasto 3 po changes 10→7 and equivalent total; Logic covers change-making and insufficient funds. Income uses same signed transaction path. |
| M-03 | ✓ | Equipped defense/warnings | UI chain mail/shield AC and stealth warning; Logic equipment formulas/proficiencies and penalties. |
| M-04 | ✓ | Magic search/catalog | UI English Amulet of Health and Ring of Protection searches; Spanish names displayed. Matrix covers all 96 entries. |
| M-05 | ✓ | Longsword +1 naming | UI: Arma +1 with base Espada larga creates Espada larga +1, attack +2 (STR -1 + proficiency 2 + magic 1), damage 1d8+0. |
| M-06 | ✓ | Ring of Protection | UI attunement raises AC 12→13; Logic save +1 and no bonus while unattuned. |
| M-07 | ✓ | Attunement limit | Logic rejects fourth attunement; UI handler checks the same maximum before mutation. |
| M-08 | ✓ | Unattuned magic weapons | Regression: Sun Blade bonuses and extra damage inactive until attuned; activation/quantity matrix. |
| M-09 | ✓ | Amulet of Health | UI max HP rises, written CON preserved; corrected card shows 19 (objeto), +4. Regression covers written/effective separation. |
| M-10 | ✓ | +2 focus | Logic: Grimoire adds +2 to DC/attack; War Mage wand adds attack only. |
| M-11 | ✓ | Equipped magic armor | Logic: chain mail +1 only contributes when selected as equipped. |
| M-12 | ✓ | Ring of Resistance | Logic: attuned fire ring halves 10 fire damage to 5. |
| M-13 | ✓ | Wand UI charges/rest toast | UI: wand charges 7→5 with pips; long rest restores 7 and toast reports +2 recovered. |
| M-14 | ✓ | Drink healing potion | UI/Logic: Tomar rolls 2d4+2, healing toast shows 4; quantity 2→1. Generic healing helper applies HP; later long rest restores full HP. Immediate potion-only HP difference was not separately captured. |
| M-15 | ✓ | Custom magic bonuses/charges | UI: custom charm gives AC +2, saves +1 and spell DC +2; AC 12→14, DC 13→15; charges 3→2, long rest restores 3 and reports +1. |

## N — Companions and Wild Shape

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| N-01 | ✓ | Bestiary companion | UI owl search/add; displayed HP/AC/speed/attacks. Matrix imports all 334 creatures. |
| N-02 | ✓ | Custom companion | UI Clockwork Mouse saved with 5 HP, AC 12, speed 30, Mordisco +4/1d6+2. |
| N-03 | ✓ | Companion HP/attack/damage | UI HP 5→3; d20 dialog result 10+4; damage [2]+2=4. |
| N-04 | ✓ | Level-two shape limits | Logic: standard CR 1/4, Moon CR 1, beast-only and no flight/swim. |
| N-05 | ✓ | Level-four/eight movement | Logic: swim unlocks at 4, flight and CR 1 at 8; below-level refusals asserted. |
| N-06 | ✓ | Transformation action/use | UI and Logic: Moon bonus/action choices, use spent; repeated/out-of-turn use refused. |
| N-07 | ✗ | Beast stats and proficiencies | HP/AC/physical scores/rolls now correct; wolf Stealth +4 still becomes +2 because beast proficiency is omitted. |
| N-08 | ✓ | Excess damage | UI: 20 against wolf 11 causes reversion and 9 to druid; Logic confirms temp first/excess. |
| N-09 | ✓ | Heal beast | UI 5→8 beast HP, original unchanged; regression for caps and shared helper. |
| N-10 | ✓ | Low-level casting blocked | UI/Logic: wild-shaped low-level druid refused. Level-18 component/class exceptions were not comprehensively assessed. |
| N-11 | ✓ | Voluntary return | UI returns to original druid; action tracking correction tested separately. |

## O — Shared table, player

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| O-01 | ✓ | Join/table name | Earlier UI Goblin Road join and live campaign joins pass; current old code has expired/deleted. |
| O-02 | ✓ | Live party vitals | Live/UI HP, AC, conditions and resources; summaries include concentration/passive values and active beast vitals. |
| O-03 | ✓ | Shared roll log | UI/Live: player physical normal d20 13 appears in both player shared log and DM log. |
| O-04 | ✓ | DM request/answer | UI/Live: DM Perception DC 15 request reaches player; physical 14 +3 =17 automatically appears in DM response. |
| O-05 | ✓ | All nine DM commands | UI/Live: all listed grants delivered: typed damage 8 (temp absorbs 5, HP 22→19), heal 2→21, temp HP, Poisoned, gold +25 (10→35), Silver Lantern ×2, XP 1000, bonus d4, short-rest and long-rest prompts. Long rest restores HP 22/22. |
| O-06 | – | Offline/reconnect | Earlier follow-up records pending→upload; current pass lacks a genuine disconnected device/network journey. |
| O-07 | – | Offline two-device conflict | Logic detects concurrent changes; actual conflict dialog and both choice outcomes not exercised. |
| O-08 | ✓ | Shared initiative auto-switch | UI/Logic: remote own-turn event initially failed to switch routes. Fixed: DM ends/starts combat while player on Personaje; player URL becomes #combat with ES TU TURNO and reset actions. |
| O-09 | ✓ | Hidden-AC attack/status | Live: player attack resolution against secret AC, monster damage/status; secrets withheld from player responses. |
| O-10 | ✓ | Bless to allies/end propagation | UI/Live: secondary cleric casts Bless on self and fighter ally. Fighter receives Bendecir (de QA Nara); caster ends concentration; fighter effect disappears and DM logs its removal. Two sheets switched in one browser identity; distinct-role permissions tested separately. |
| O-11 | ✓ | Leave table/local character | UI/Live: QA Nara clicks Salir de la mesa, confirms, returns to join screen; its name, multiclass and 34/52 HP remain locally and the table status link disappears. |

## P — Account and cloud backup

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| P-01 | – | Save email/password access | Earlier follow-up records pass; new-credential entry requires a human handoff and was not repeated. |
| P-02 | – | Interrupted access retry | Earlier follow-up records fix/pass; not independently repeated with credentials. |
| P-03 | – | Change password | Earlier follow-up records new works/old refused. Human credential-change handoff required for a repeat. |
| P-04 | – | Another-device sign-in UI | Earlier follow-up records table/backup list; current live restore used isolated synthetic sessions, not the password sign-in UI. |
| P-05 | ✓ | Restore/edit same backup | New Live: second device restores same local ID, edit updates one row; third device reads edit; unrelated users refused. |
| P-06 | ✓ | Backup count/list/Copy now UI | UI/Live: account shows 8 de 8 ficha(s) copiada(s), last-copy time and Copiar ahora; clicking temporarily disables it. Separate live sessions list and restore their owned copies, including copies absent from a local device. |
| P-07 | ✓ | Automatic new-character backup | UI/Live: full creator makes QA Cloud Monk without table code, with an existing anonymous session. Without clicking Copy now, the backup count increases from 8/8 to 9/9; observed 29 seconds after creation. Exact sub-second upload latency was not measured. |
| P-08 | – | Delete cloud copy confirmation | New Live synthetic rows removed; earlier follow-up records UI deletion. UI confirmation/list disappearance not repeated here. |
| P-09 | – | Existing-email account merge | Earlier follow-up records successful merge with character/copy counts; credential handoff needed to repeat. |
| P-10 | – | Production CAPTCHA appears once | Local app deliberately omits widget; no fresh real-site challenge was completed. Backend concern is recorded at S-03. |

## Q — DM tables, party and session

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| Q-01 | ✓ | Create six-character code | Earlier DM UI and new Live campaigns create valid six-character table codes. |
| Q-02 | ✓ | Every setting drives creator/preserves log | UI/Live: saved PHB, starting level 2, house rules, array-only method and fixed 16/15/14/12/10/8 array all apply to full fighter creation. Second draft uses roll-only with minimum 18: all six 4d6 results clamp to 18. Restored original settings. Session 1 / 1000 XP history and private note survive settings saves and reload. |
| Q-03 | ✓ | Live party | Earlier DM/player UI updates together; Live independent identities synchronize character data. |
| Q-04 | ✓ | DM damage/healing/defenses | UI DM damage updates both views, reload does not duplicate it; typed defense/healing helpers tested in Logic. |
| Q-05 | ✓ | DC request/automatic answers | UI/Live: Perception request with visible DC 15, physical player result 17 arrives automatically. Area-save result replies also verified. |
| Q-06 | ✓ | All DM grants/messages/rests | UI/Live: gold, items, message, short and long rests, bonus die and Inspiration all delivered and applied in the Lantern Keep campaign; player and DM logs compared. |
| Q-07 | ✓ | Session/XP/summary | Earlier UI session start/end delivers 150 XP and summary; follow-up records save-access prompt. |
| Q-08 | ✓ | Exclusive loot claim | New Live: ten simultaneous two-player races; exactly one win, one refusal each; stored winner correct and retry refused. |
| Q-09 | ✓ | Homebrew visible | Live campaigns publish/read house rules; player cannot forge DM settings. |
| Q-10 | ✓ | Private notes retained/hidden | UI: private lantern-curse note retained after DM reload and absent from player DOM. Notes stored locally; separate-role live access controls also pass. |
| Q-11 | – | Exact-name table deletion | UI: wrong typed name rejected with El nombre no coincide. Correct-name permanent deletion awaits the required at-action human confirmation; local retention after deletion not yet verified. |
| Q-12 | ✓ | Phone DM | Earlier actual 390px screenshot and width check: initiative controls wrap under names with no sideways overflow. |

## R — DM monsters and encounters

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| R-01 | ✓ | Spanish/English monster search | Catalog preserves English aliases/Spanish names; wolf searches and bestiary imports tested. |
| R-02 | ✗ | Completely Spanish stat block | Spanish numeric labels/actions, but wolf trait descriptions remain English; see reproducible finding. |
| R-03 | ✓ | Secret monster numbers | Live distinct-role tests: player responses omit monster HP/AC/save numbers. |
| R-04 | ✓ | Hidden/reveal | Live: hidden monster excluded, then visible after reveal. |
| R-05 | ✓ | Initiative order/turn passing | Live PC/monster order and current marker; own turn permitted, monster turn passing refused. All remove/condition UI variants not separate runs. |
| R-06 | ✓ | Monster attack/player damage | Live attack/monster damage resolution and player HP update; typed defense engine passes. |
| R-07 | ✗ | Area save/half/friendly fire | UI/Live: successful breath save halves 20→10 damage. Two-player 8-damage breath gives fighter failed 3/full 8 and druid successful 17/half 4. However monster breath target selector lists only player sheets: dragon cannot include its skeleton allies in the area. See remaining failure. |
| R-08 | ✓ | Multiclass difficulty/reload | Earlier correction uses total level; Logic asserts total-level summary; follow-up records lazy-load/reload fix. Reload result is attributed to that follow-up. |
| R-09 | ✓ | Every encounter animation type | UI: all 25 animation choices previewed, measured and screenshots visually inspected at 390px. Distinct themes/particles render; client and scroll widths both 380px for every choice after containment fix. |
| R-10 | ✓ | Launch animation/initiative request | UI/Live: prepared skeleton encounter launches player animation, adds creatures to initiative and delivers initiative request. Player physical 20 +2 gives 22 and appears in DM order. |

## S — Final release checks

| ID | Result | Feature | Evidence / limitation |
| --- | --- | --- | --- |
| S-01 | ✓ | Seven player pages on phone widths | New UI: all seven routes at actual 390px, screenshots inspected; layout measurements at 320px and 768px too. No horizontal page/control overflow in those route checks. Hardware tap/OS differences are outside this mark. |
| S-02 | ✓ | Keyboard focus/Escape | UI: Tab gives visible 3px outline; Escape closes ordinary modal. Native creator restart confirmation accepted by user, with cleared draft verified at B-14. |
| S-03 | ✗ | CAPTCHA enforcement restored | Live fresh anonymous sign-ins succeed without token. Client key is present; backend enforcement is not demonstrated and appears off for this flow. |
| S-04 | – | All QA users/tables deleted | The separate loot/backup campaign and its child records were removed and verified absent. Lantern Keep permanent cleanup awaits confirmation; nine local characters (eight QA plus pre-existing Lyra Test) remain for review. Auth-identity cleanup and complete earlier table inventory require administrator access. |
| S-05 | – | Migrations 001–007/all features live | Initial schema is `supabase/schema.sql` (no separately named 001 file); migrations 002–007 are present. Deployed backup/loot permissions pass Live. Complete merge/encounter/area-save sign-off is deferred. |

## Evidence and remaining release work

The full rules/data matrix and earlier campaign evidence are in [QA_REPORT.md](QA_REPORT.md). New sanitized runtime results are in [live-results.json](2026-10-02/followup/live-results.json), [rules-findings.json](2026-10-02/followup/rules-findings.json), [layout-results.json](2026-10-02/followup/layout-results.json), and [breakpoint-results.json](2026-10-02/followup/breakpoint-results.json). No credentials or session tokens are included.

Screenshots include all seven phone routes, caster/warrior creator screens, compact concentration and scrolling, point-buy before/after, the remote turn, import/deletion confirmations, ally Bless, all 25 encounter themes, table minimum rolls and automatic tableless backup. Animation measurements are in [animation-results.json](2026-10-02/followup/animation-results.json). The point-buy screenshots labeled 320/768 were verified against the actual DOM viewport width; a preliminary viewport request that did not apply was excluded.

![Corrected point buy at 390px](2026-10-02/followup/point-buy-fixed.jpg)

![Compact concentration controls](2026-10-02/followup/compact-concentration.jpg)

Before release: resolve the five failed checks; finish skipped live UI branches; use a real iPhone and Android for install/offline/export checks; verify actual PDF pagination; have the account owner verify CAPTCHA settings and remove disposable auth identities/any remaining QA records. A skipped check can only become a pass after its described journey is performed.

## Fixed after this report (same day)

| Check | Fix | Verified |
| --- | --- | --- |
| I-02 | Hit Dice are tracked per die type (`hdSpentByDie`). The short rest offers each die with how many are left and refuses more than that type has; long rest recovers the largest dice first. Older sheets and manual edits keep working (untyped spent dice come off the smallest dice). | Test: wizard 3 / fighter 1 refuses 3d10, spends 1d10 + 2d6, long rest returns the d10 first. |
| N-07 | Wild Shape copies the beast's skill and save bonuses from its stat block (Spanish or English) and uses the higher of yours and the beast's, per the 2014 rules. | Test: wolf Stealth +4 and DEX save +5 over the druid's own. |
| R-07 | A monster's breath (or any «Pedir salvación» with damage) can include other creatures in initiative as «fuego amigo». Their saves go to «Salvaciones pendientes» and roll with their own bonus. | Live: young red dragon breathes on its two skeletons; both save (+2), take half (15) and drop to Derrotado. |
| R-02 | The most common traits are now fully Spanish (Pack Tactics, keen senses, Magic Resistance, Legendary Resistance, Amphibious, Spider Climb and webs, swarms, Undead Fortitude, Sunlight Sensitivity, Nimble Escape, Relentless, shapechanger sentences, and more). | Then completed: every trait, action, reaction and legendary action of the 334 monsters is Spanish (572 hand-translated texts, numbers kept as placeholders), spell lists use the catalog names, and the stat lines (languages, senses, defenses, alignment, FUE/DES/CON/INT/SAB/CAR) are Spanish. Tests fail if English comes back. **Fixed.** |
| S-03 | Not code: CAPTCHA has to be enabled in Supabase (Authentication → Attack Protection → Enable CAPTCHA, provider Turnstile, with the secret key). | Owner action. |
