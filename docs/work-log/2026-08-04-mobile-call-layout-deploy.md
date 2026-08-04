# 2026-08-04 - Mobile Call Layout And Deploy

## What changed

- Removed the public top-bar admin link so ordinary users do not see an admin entry point.
- Kept `/admin` available as a direct internal route protected by admin controls.
- Replaced the side-by-side public call layout with a primary video plus picture-in-picture secondary video.
- Added click-to-swap between peer/self video placement.
- Added a front/rear camera flip control while the local camera is active.
- Mirrored only the front-facing local self preview and stopped mirroring peer video.
- Improved mobile face tracking resilience by polling ROI more frequently, lowering MediaPipe confidence thresholds, and falling back from GPU to CPU delegate when needed.

## Why it changed

The public dating room needs to feel like a familiar mobile video-chat product. Side-by-side video is awkward on phones, public admin navigation should not be visible to ordinary users, and mobile face tracking needs more forgiving settings than desktop.

## Assumptions and constraints

- Admin remains a direct private route; it is not advertised in public navigation.
- Camera flip depends on browser/device support for `facingMode`.
- Mobile face tracking changes improve robustness but do not guarantee valid rPPG; signal quality gates still decide whether analysis output is valid.
- No direct emotion, attraction, compatibility, honesty, diagnosis, or mental-state claims are introduced.

## User-facing impact

Users get a mobile-friendly call surface with familiar PiP behavior, can swap video placement, and can switch local camera direction. Ordinary users no longer see an admin link from the public header.

## Data and privacy implications

No new server data is stored. Camera switching and face tracking remain on-device; raw video and raw RGB traces are not sent to the backend.

## Commands and checks

- `./node_modules/.bin/tsc --noEmit` - passed
- `node --import tsx --test tests/*.test.ts` - passed, 37 tests
- `./node_modules/.bin/vite build` - passed
- `node scripts/check-repo.mjs` - passed
- Playwright mobile smoke for `/` and `/room` - passed for public navigation, safety gate, call stage render, and swap button. Static preview logged expected API 404s because no backend was attached to the local Vite preview.
- Browser/backend production deploy and smoke - pending

## Deployment status

Pending deploy in this slice.

## Recommended next steps

- Add TURN configuration for stricter mobile networks.
- Run real-device QA on iOS Safari and Android Chrome with camera permissions.
- Add production monitoring for WebRTC connection failures and camera permission failures.
