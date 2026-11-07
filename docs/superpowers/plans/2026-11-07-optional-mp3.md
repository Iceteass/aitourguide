# Optional MP3 implementation and verification

Goal: schema 1.0.0 packs with zero, some, or all MP3 assets work without changing public catalog or existing content.
Architecture: retain whole-pack `files[]`, caches and completion markers. Preserve one audio slot per POI; use null for an explicitly ungenerated MP3. No dependencies, UI redesign, map overlay, Publisher or content generation.

## Baseline

- main: `9bf40fe337f2860d1f492946b6c5ac451a0bea50`, App v1.2.6.
- Branch: `feat/optional-pack-mp3`.
- All seven existing Node scripts passed before changes; existing pack Validator passed 7 spots / 31 assets.
- No actual Kinkakuji pack or Creator v0.4.7 output found. Synthetic temporary copies are tests, not new published packs.
- Open PR lookup: GitHub GraphQL Forbidden; open PR state unverified.

## Implementation checklist

- [x] Reproduce rejection of zero-MP3 pack and crash on null audio slot before implementation.
- [x] Extend existing Validator: `audio.status="not_generated"` requires `bytes=null`, `sha256=null`, safe planned `audio.path`, no matching `files[]` entry and no actual MP3. Generated/legacy audio requires real file, matching positive bytes and SHA-256 in POI and file manifest. Existing schema version unchanged.
- [x] Map POIs to ordered tracks/null slots; never filter the playback array. Empty packs clear previous player state. No-MP3 selector hidden, missing spot selector disabled, TTS retained. Counters use actual MP3 totals and completed pack cache.
- [x] Separate asynchronous POI selection and pack-generation tokens; pending count/download results cannot overwrite another pack. Add counter-race regression (RED then GREEN).
- [x] CI discovers all on-disk pack.json files and calls the existing Validator; any failure fails CI. Tests include multiple discovered packs and an invalid-pack failure.
- [x] Bump runtime/shell version to 1.2.7; retain cache namespaces, markers, photo DB and preferences. No content version bump.
- [x] Run existing Node suite, syntax, pack Validator, Chromium functional and upgrade regressions; review before PR.

## Contract for Creator

`audio.path` remains a safe POI-relative planned MP3 path even before generation. Set `status: "not_generated"`, `bytes: null`, `sha256: null`, and omit its MP3 from `pack.files`. Keep metadata, narration, image and route files in the normal manifest. When MP3 is created, remove/change the ungenerated status, set actual positive byte size and SHA-256 in both POI audio and `pack.files`, and update the modified POI metadata's manifest byte size/hash. Existing packs without audio.status remain supported as generated packs. Do not omit POIs or renumber IDs when MP3 is missing.

Actual Creator output compatibility is NOT_RUN until that output is supplied. No actual Kinkakuji assets were modified or registered.

## Verification results

All commands below passed locally (Node v24.19.0, Python 3.12, Chromium):

```sh
for file in tests/*.mjs; do node "$file" || exit; done
node authoring/validators/validate_all_packs.mjs
for file in app/*.js audio-player.js sw.js authoring/validators/*.mjs; do node --check "$file" || exit; done
python3 tests/browser_optional_audio.py
python3 tests/browser_assets.py
python3 tests/browser_pack_independence.py
python3 tests/browser_guide_cards.py
python3 tests/browser_app_version.py --baseline-ref 9bf40fe337f2860d1f492946b6c5ac451a0bea50
git diff --check
```

- Eight Node test scripts, including a synthetic eight-spot zero-audio fixture and zero/partial/full audio and intentionally invalid fixtures (expected rejection).
- Existing Fushimi Inari: 7 spots, 31 assets; unchanged content and public catalog.
- Browser synthetic variants: seven POIs with zero/two MP3; index 1 plays Romon audio, empty slots choose TTS, downloaded narrative/images/map work offline; deleting zero-audio pack preserves partial pack.
- Existing browser regression: playback/pause/±5s/speed, cancellation/retry/deletion, 7 map spots, image fallbacks, 12 width/text-size combinations, no root-asset dependency.
- Actual 1.2.6→1.2.7 worker update preserves cached pack bodies, legacy cache, old/new photo keys and preferences; fresh offline shell remains usable.
- JSON/manifest parsing and unchanged `data/catalog.json` / Fushimi Inari pack tree checked separately.

NOT_RUN: actual Kinkakuji eight-spot pack, actual Creator v0.4.7 output, iPhone/Android audio/TTS/lock-screen output, native device voice availability, remote GitHub Actions/Node22 and Pages deployment. Browser TTS checks verify routing/UI; they do not prove audible device speech. Map overlay is a separate PR2, not implemented here.
