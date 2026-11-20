# UI changes and regression verification — 20 November 2026

- Replaced the farmer illustration with an uppercase AGRITWIN wordmark, a gentle opacity pulse and the app's cream/sage palette. Reduced-motion preferences stop decorative animation. The bar uses completed authentication/preparation stages when known and remains indeterminate otherwise; it does not invent elapsed-time percentages or downloaded-byte progress.
- Crop rows now size to the containing card, with shrinkable/wrapping text. Browser measurements at 320, 768 and 1280 CSS pixels confirm that every displayed row stays within its card. See [geometry evidence](crop-layout.json) and [screenshot](field-crops.jpg).
- Product headers and unavailable-product actions return explicitly to the market. Android hardware-back handling uses the same destination. Search, displayed products and loaded pages are retained in session-only query state, cleared with the account cache. Web scroll capture reads the current element offset. The browser confirmed the same search and visible product group on return; a 41 CSS-pixel adjustment was observed, so exact pixel equivalence is not claimed. See [navigation evidence](market-navigation.json).

## Validation

1,173 frontend tests passed across 130 suites, including new progress semantics, reduced-motion behavior and market search restoration regressions. The first PR frontend-quality run identified a formatting omission in `scripts/test-security-dependencies.cjs`. The script was formatted without changing its logic; the exact CI command `npm run format:check` then passed across the whole frontend ([output](format-check.txt)). The consumer compatibility checks were rerun and passed. TypeScript passed. ESLint reported zero errors and 41 existing warnings. Android export passed. Browser verification used dummy local accounts and catalogue fixtures; no payment was initiated. No native-device run is claimed.

- [Test summary](test-summary.json)
- [TypeScript output](typecheck.txt)
- [Lint output](lint.txt)
- [Android export output](android-export.txt)
- [Loading screen](loading.jpg)
- [Responsive field crops](field-crops.jpg)
- [Market return](market-return.jpg)

The loading screenshot was captured at the beginning of the animation; the bar fills as preparation stages complete. The local preview no longer has simulated login delay. The UI changes are distinct from the [security work summary](../../SECURITY-WORK-SUMMARY.md); original security scanner totals remain dated evidence.
