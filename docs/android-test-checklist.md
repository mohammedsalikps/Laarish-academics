# Android phone test: summit build

A real-device check of the summit journey. It takes about 25 minutes. Fill in the results table and
keep this file with the build it tested.

**Status on 16 Nov 2026: not done.** No Android phone was available in the development session
(no `adb`, and no phone connected over USB). Every performance figure so far comes from a laptop
with Chrome's CPU slowdown (see `docs/summit-readiness.md`); none of it proves how a real phone behaves.

## Before you start

- Use a budget or mid-range Android phone if possible (the wireframe target is a Snapdragon 680 class
  phone with 4 GB RAM), charged above 50 %, not in battery saver.
- Chrome for Android, up to date. Note the version from `chrome://version`.
- Open the build to test. The preview needs a Vercel sign-in (the project uses Vercel
  Authentication for every deployment), or a shareable link made from the Vercel dashboard.
- For timings and frame rate, add `?perf` to the address (for example `/home?perf`). The hub then
  shows its first-frame time and frames per second. Optional: connect the phone to a computer and
  use `chrome://inspect` for the Performance panel.
- Start as a new learner: Chrome menu → Settings → Site settings → All sites → the site → Clear
  data. Then reload.

## Record

| Item | Result |
|---|---|
| Phone model | |
| Android version | |
| Chrome version | |
| RAM (Settings → About phone) | |
| Network (Wi-Fi / 4G) and rough speed | |
| Date and tester | |
| Build tested (preview URL and commit) | |

## Checks

Write the measured value or ✓ / ✗ with a short note for each check.

| # | What to do | Expected | Result |
|---|---|---|---|
| 1 | Cold start: clear site data, open the preview, time from tap to the Welcome screen | Under 3 s on Wi-Fi | |
| 2 | Onboarding → Class 6 → pick a mentor → Home | No sideways scrolling; buttons easy to tap | |
| 3 | Home with `?perf`: note the hub's first frame and fps after 10 s | First frame ≤ 2 s; fps ≥ 30 | |
| 4 | Tap Discovery Valley (Science) | Smooth fly-in, then the world island; pins don't overlap | |
| 5 | Open Magnets → the chapter path | Topic nodes readable; the topic sheet opens from the bottom | |
| 6 | Topic sheet | Shows "Laarish original lesson, mapped to NCERT Curiosity … section 4.1 … pages 62-64 … awaiting teacher review" | |
| 7 | Watch: play the explainer to the end | Labelled "Animated explainer"; captions readable | |
| 8 | Play (3D magnet bench): drag an object to the magnet, then tap one | Both work; the object snaps back; no page scroll while dragging | |
| 9 | Play: Need a hint? → Another hint → Ask Rishi/Ayra | Hint 1 of 2, then 2 of 2, then the mentor opens; the hint never changes the score | |
| 10 | Play: finish all three rounds, including sorting into the trays | Round X of 3 updates; "Play again" appears at the end | |
| 11 | Practice: answer all 6 questions (including picture choice, sort and true/false with a reason) | Feedback after each; nothing cut off at the screen edge | |
| 12 | Complete | Stars and XP shown; back to the chapter path, Topic 2 unlocked once mastery ≥ 60 % | |
| 13 | Rotate to landscape and back on the chapter path and in Play | Layout recovers; nothing stuck off-screen | |
| 14 | No 3D: open `/home?nowebgl` | 2D map instead of the 3D hub; lists work; no blank screen | |
| 15 | Lite mode: Grown-ups (answer the sum) → Lite mode "Always on" → Home | 2D map and chapter lists; journey still works | |
| 16 | Reduced motion: Android Settings → Accessibility → Remove animations → reload | No fly-in or bobbing; still fully usable | |
| 17 | Offline: airplane mode, then move between screens already opened | Calm offline banner; saved progress kept; no false "available offline" claims | |
| 18 | Text size: Settings → Larger text in the app, and Android font size at maximum | No overlapping or clipped text in Play and Practice | |
| 19 | 10 minutes of use | Note heat and battery drop (%) | |
| 20 | Anything else that felt slow, confusing or broken | | |

## After the test

- Add the device, the numbers from checks 1, 3 and 19, and any ✗ to `docs/summit-readiness.md`.
- A failed check that blocks the summit demo gets fixed before the summit. Everything else goes to
  the task ledger.
