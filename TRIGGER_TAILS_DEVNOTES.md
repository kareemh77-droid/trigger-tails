# Trigger Tails – developer notes (as of v42f)

Keep this in the GitHub repo and attach it at the start of a new chat so Claude can read it first instead of re-discovering the game.

## What it is
One self-contained `index.html` (Three.js r128 from cdnjs, PeerJS from unpkg), a PWA on GitHub Pages (`kareemh77-droid/trigger-tails`). 2 phones play co-op/versus (Android + iPhone).

## Shipping a version
- Upload `index.html`, `sw.js` and any changed packs, then fully close and reopen the app on both phones.
- Bump `VERSION` in `sw.js` every release (`trigger-tails-v42f`). Missing packs never break the install; the game falls back.
- `PROTO` (in index.html) changes only when two phones could no longer talk to each other (network format). Visual-only changes do not bump it.
- Packs: `models.pack`, `sfx.pack`, `sfx2.pack` (Western/Space weapon sounds + `imp_*` impact sounds; v42f rebuilt it, so it must be re-uploaded), `guns.pack` (magic TTG1, real gun models + clips), `fx.pack` (magic TTFX, explosion flipbooks).

## Standing rules from the owner
- Weapon sounds: only the real sound packs he supplied. Never synthesize weapon sounds.
- Gun Game ladder, every arsenal: pistol first, heaviest gun last, explosives around the halfway mark, melee at the end (slot order `[0,1,9,5,7,8,6,14,2,12,10,11,13,4,3]`).
- Do not start the next roadmap item until he okays it.

## How the source was built (inside a session only)
Patch chain, each step reads the previous HTML and uses `sub1(old, new)` which asserts an exact match: `p42.py -> p42c.py -> p42d.py (reload scripts) -> p42e.py (flipbook explosions) -> p42f.py (hand holds, pack warnings, bullet impacts)`.
Those working folders vanish between sessions. A new session should start from the latest `index.html` he uploads and edit it directly with exact-match replacements.

## Systems and where to look (search the function name)
- **Arsenals**: `ARSENALS`, `ARS_ID` (Classic, Western, Space); weapon defs in `WEAPONS` (fields like `splash`, `burnT`, `pull`, `boom` = sound name, `kind`, `mag`, `rl`).
- **Explosions**: `explodeAt(pos, owner, def)` -> `explosionFx(pos, r, def)` -> `flipbookBoom` (when `FXB.ready`) else old sphere puffs `fx()`. `updateFx` calls `fbUpdate`. Loader `loadFx()`. Sheets: `boom1 boom2 air1 air5 air6 air7 air7o` (fire + smoke), `wisp` (smoke loop), `ball` (additive fireball loop). Space blasts (`def.boom` starting `s_`) are tinted from `def.glow || def.color`; `def.burnT` (Whiskey Bomb) adds fireballs. Extras: flash, ground ring, debris, sparks, scorch.
- **fx.pack format**: `TTFX` + u32 header length + JSON `{sheets:{name:{o,len,t,mode,cols,cell,n,g,crops,ox,oy,fire,dur,pm,loop}}}` + image blobs. Each frame has its own tight crop square, so pixels go where the fire is. Built from the user's flipbooks (Unity free VFX, CC0) and aerial-explosion videos (keyed from black).
- **Reload animations**: scripts `RLX['arsenal/slot']` with gun pose keys, left/right hand paths, part keys and props; engine functions `rlxScript`, `rlxHand`, `rlxParts`. A script only runs when that gun's GLB is loaded from `guns.pack`.
- **Guns**: `glbParse` / `loadGuns` read `guns.pack`; model clips live in each model entry.
- **Hand holds (v42f)**: Western/Space guns are different sizes from the Classic ones, so each arsenal has its own hold table `ARS_HOLD[arsenalId][slot]` (+ `applyArsHold(id)`, called from `setArsenal`). It rewrites the third-person `GRIP`/`GUN_OFF` and the first-person `FPL.GRIPS/CLS_OF/WPOSE` for the slots that need it, restores the Classic values otherwise, then clears the grip caches (`FPL.clearCache()` and `fpArms.geos`). Grip points were measured from each GLB. Reload scripts use `null` hand keys (= base grip), so they follow automatically.
- **Bullet impacts (v42f)**: `impactAt(p, def, dt)` runs when a non-rocket projectile hits the world (called from `updateProjectiles`, wrapped in try/catch so effects can never stop the game). It finds the surface point (bisection), the surface normal (terrain slope or axis probes), then draws: pooled bullet-hole decals (`impHole`, max 34, fade out), sparks and chips (reuse the `fbDebLive` debris system), dust puffs (`fx`), a short flash. Style by weapon: ice = frost decal, `s_*`/`plasma` sfx = scorch + coloured sparks, bolt = puff only, lead bullets = hole + dust (ground) or hole + sparks (walls). `impFleck` = a few sparks when a bullet hits a squirrel. Sounds `imp_rock`, `imp_metal` (ricochet, 35% on walls), `imp_zap`, `imp_ice` come from `sfx2.pack`; if the pack is missing the impact is silent (never synthesized). Water hits splash with the existing `splash` sound.
- **Pack warnings (v42f)**: `packWarn(name)` shows a toast ("... did not load") when `sfx.pack`, `sfx2.pack`, `fx.pack` or `guns.pack` fails to fetch, and when `sfx2.pack` is present but old (missing `w_revolver`, `s_beam`, `rl_revolver`, `imp_rock` 20 s after decode).
- **Flames**: `flameFx` draws the flamethrower stream with small puffs (still the old look).

## Testing (headless Chrome, SwiftShader)
- Regression suites use a stubbed THREE (`stub2.js`) on `page42.html`; visual checks use real `three.min.js` pages.
- A local server must be running: `cd /home/claude && python3 -m http.server 8766`. `runall42.sh` and `runars42.sh` do not start it. `withsrv.sh` starts it and then kills it, so never run it while a suite is going.
- Known failures that also happen on older builds (ignore): `aud42` seam, `king42c` host packet, `muz42` "no casing made" and one dragon hit, `bot42` flamethrower/freeze, `hit42` "ticks" error. `pu42` and `king42b` sometimes fail under load; rerun them alone.
- v42f: `aud42` counts sounds, expected is now 91 sounds / 193 takes (Classic 43 + arsenal 48).
- The stub lacks some THREE methods; add them to `stub2.js` (test-only) instead of changing the game.

## Roadmap and open items
- Flamethrower: waiting on the CGHEVEN "Flamethrower 01 – FPV/Front/Side" flipbooks (or MP4s) from him, then wire into `flameFx`.
- Camera shake on explosions: not built yet.
- v43 Zombie Siege co-op; v44 Modern Warfare + Medieval/Fantasy arsenals (15 weapons each, real sound packs); new worlds: Dusty Canyon, Moon Base, Ruined City, Enchanted Forest (medieval town + a second castle: ask him for a second-castle GLB).
