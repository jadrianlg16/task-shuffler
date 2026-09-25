# done. for iPhone and iPad

A native SwiftUI version of done. It's being built in phases (plan: the
"Swift rewrite plan" tab of the scoping doc). **Status: phases 0 and 1 are
written but have not been compiled yet.** They were written on Windows, which
can't build Swift for iOS. The first run on a Mac is the first real check.

| Folder | What it is |
|---|---|
| `DoneCore/` | Swift package with the logic: tasks, categories, shuffle, filters, quick-add parsing, backup import/export, archive grouping, backup reminder. No UI, so widgets and Siri can use it later. |
| `Done/` | The app. For now a placeholder screen (example tasks + Shuffle) that proves it builds, runs and uses DoneCore. |
| `project.yml` | XcodeGen spec. The `.xcodeproj` is generated from it and not committed. |
| `Config/` | Build settings. `Local.xcconfig` (git-ignored) holds your signing team. |

Targets iOS 17+, iPhone and iPad, Swift 5 language mode. Bundle id
`dev.adriangaona.done`.

## First run on a Mac

1. Install Xcode 16 or newer, then XcodeGen: `brew install xcodegen`.
2. Run the core tests. They need nothing else:

   ```bash
   cd ios/DoneCore && swift test
   ```

3. Generate and open the project:

   ```bash
   cd ios && xcodegen && open Done.xcodeproj
   ```

4. To run on a real iPhone, create `ios/Config/Local.xcconfig` with your team
   id (Xcode → Settings → Accounts, or developer.apple.com → Membership), then
   run `xcodegen` again:

   ```
   DEVELOPMENT_TEAM = ABCDE12345
   ```

   The simulator works without it.

## Keeping it in step with the web app

`DoneCore` is a line-for-line port of the web logic, and its tests prove it:

- **Ported tests.** The web app's Vitest cases, rewritten in XCTest. 32 of the
  34 cases carry over; the other 2 cover the browser-only install hint.
- **Parity tests.** `npm run parity:fixtures` (in the repo root) runs a fixed
  set of inputs through the web code and saves its answers to
  `DoneCore/Tests/DoneCoreTests/Fixtures/parity.json`. `ParityTests.swift` runs
  the same inputs through Swift and must get the same answers: shuffle weights
  and picks, filters, sorting, quick-add parsing, every backup error message,
  archive grouping, reminder timing, date parsing.

If you change the web logic, rerun `npm run parity:fixtures` and commit the new
file. `ParityTests` then shows what the Swift side still needs. CI checks that
the file is current (`npm run parity:fixtures -- --check`).

### Deliberate differences

Only hand-edited backups or odd typing reach these; the web app never writes
them.

- **Dates.** Only the ISO forms the web app writes are read: `2026-09-22`,
  `…T12:00Z`, `…T12:00:00Z`, `…T12:00:00.123Z` and `±hh:mm` offsets, years
  0000–9999. JavaScript also accepts impossible days (`2026-02-30`, rolled
  over), `T24:00`, a time without a zone (read as local time), lowercase `t`/`z`,
  a space for `T`, offsets without a colon, year-only and month-only dates,
  six-digit years, and free text. Here those don't parse.
- **An unreadable `createdAt`** counts as a brand-new task when shuffling (the web
  app gets NaN) and ties with everything when sorting by date.
- **Minutes and sort order are whole numbers.** A fraction in a backup is rounded,
  to at least 1 minute. A number too big for an `Int` (e.g. `1e20`) makes that
  task or category invalid; the web app would accept it.
- **Quick-add numbers too big to be minutes** (`1h99999999999999999999`) stay in
  the name; the web app reads them as that many minutes.
- **Case-insensitive `h`/`m` matching** uses full Unicode case folding in ICU,
  so the long s (`ſ`) counts as `s` (`2 hrſ`); JavaScript's doesn't.

Where ICU's regex rules differ from JavaScript's, the port spells out
JavaScript's: `[0-9]` for `\d`, JavaScript's whitespace set for `\s` and
`trim()`, and `\z` for `$`. The parity cases cover each one.

## CI

`.github/workflows/ios.yml` runs the web tests, the fixture check,
`swift test` and a simulator build on GitHub's macOS runners. It only runs once
the branch is pushed.
