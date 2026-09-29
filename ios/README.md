# done. for iPhone and iPad

The native SwiftUI version of done. Same features as the web app, plus what
only an Apple app can do: sounds and haptics, notifications, widgets, a Live
Activity, Siri and Shortcuts, Focus filters, Spotlight and Control Center.

**Status: written, never compiled.** Everything here was written on Windows,
which can't build Swift for iOS. The first run on a Mac is the first real
check; expect a round of compile fixes.

## What's in it

**The app** (`Done/`)
- The main screen: today at a glance (active, done today, a bar that fills),
  the Now card for the task in progress, the "Pick for me" picker (I have
  any/15/30/60/90 min or more…, from which categories, "Try 30 min" when nothing
  fits), the task list (grouped by category or one list, four sorts, search),
  and quick add at the bottom with the same shorthand as the web
  (`Call mom 15m #personal`).
- The shuffle: a reel that slows onto the pick (the web's timing and easing),
  then Start / Shuffle again / Not feeling it. Reduce Motion skips the reel.
- Swipe a task: right to start, left to finish or delete (with Undo). Tap to
  edit, tap ▶ to pick it by hand. Long-press for a menu.
- Archive (Today / This week / Earlier; restore or delete for good) and
  Settings (categories: add, rename, recolour, reorder, hide, delete; backup
  export and import with the web's checks and messages; example tasks;
  appearance).
- iPad: two columns when there's room, all orientations, Split View and Stage
  Manager, keyboard shortcuts (⌘N, ⌘R, ⌘F, ⌘⇧A, ⌘,, ↩, Esc) listed when you
  hold ⌘. On Apple silicon Macs it runs as an iPad app with a menu bar.

**Apple features**
| Feature | Where | Notes |
|---|---|---|
| Sounds | `Services/Feedback.swift`, `Resources/Sounds` | A tick per row as the reel spins, a chime when it lands, a whoosh and a note on Start, an arpeggio on Done, a pop on Add, two falling notes on Drop. Ambient session: follows the silent switch. The same six sounds as the web app, synthesized by the repo's `scripts/make_sounds.py` (`python ios/scripts/make_sounds.py` writes the WAVs here), so nothing to license. |
| Haptics | `Services/Feedback.swift` | Selection ticks during the reel, success on landing and Done, soft impact on Start, light taps on Add and Drop. |
| Notifications | `Services/Notifications.swift`, `AppDelegate.swift` | "Time's up" when a started task reaches its estimate, with **Done** and **5 more minutes** buttons; an optional daily nudge with **Pick for me**. Local only. Permission is asked the first time it's needed. |
| Live Activity | `Services/LiveActivities.swift`, `DoneWidgets/NowLiveActivity.swift` | The task in progress on the Lock Screen and in the Dynamic Island: elapsed timer, estimate bar, **Done** and **Drop** buttons that work without opening the app. |
| Widgets | `DoneWidgets/NowWidget.swift` | Home Screen small and medium (now + timer, or done today + **Pick for me**; **Done** / **Drop** buttons), Lock Screen circular (done-today gauge), rectangular and inline. |
| Control Center | `DoneWidgets/PickControl.swift` | iOS 18: a "Pick for Me" control for Control Center, the Lock Screen and the Action button. |
| Siri and Shortcuts | `Intents/AppIntents.swift`, `Shared/SharedIntents.swift` | "Pick a task in done." (with minutes and category), "Add a task to done." (shorthand works), "I'm done in done.", "Drop my task in done.". "Start a Task" (pick which) is in the Shortcuts app. All of them work in Shortcuts and Spotlight too. |
| Focus filters | `Intents/AppIntents.swift` (`DoneFocusFilter`) | Settings → Focus → a Focus → Add Filter → done.: pick categories; while that Focus is on, the list and the shuffle only use them. |
| Spotlight | `Services/Spotlight.swift` | Active tasks are searchable on the device; a result opens the task. Can be turned off. |
| Deep links | `Model/Router.swift` | `done://shuffle`, `done://add`, `done://task/<id>`, `done://archive`, `done://settings`. |
| Privacy | `Privacy/PrivacyInfo.xcprivacy` | No tracking, no data collected. UserDefaults reasons CA92.1 and 1C8F.1 (App Group). |

**How the pieces share data.** The app, widgets and intents share an App Group
(`group.dev.adriangaona.done`). Tasks live in `tasks.json` there, in the backup
format, read and written through `NSFileCoordinator`. Settings live in the
group's UserDefaults. When a widget or Live Activity button changes something,
it posts a Darwin notification and the app reloads. Done and Drop are Live
Activity intents, so iOS runs them inside the app, where they go through the
same store as the screen.

| Folder | What it is |
|---|---|
| `DoneCore/` | Swift package: models, shuffle, filters, quick-add, backup, archive, reminder, the shared `Library` actions, storage, preferences, the reel's strip and easing. No UI. |
| `Done/` | The app: `Model/` (store, router), `Services/` (feedback, notifications, Live Activity, Spotlight), `Intents/`, `Views/`. |
| `DoneWidgets/` | Widget extension: widgets, Live Activity UI, Control Center control. |
| `Shared/` | Compiled into both the app and the extension: colours, Live Activity attributes, the Done / Drop / Pick intents, the change signal. |
| `DoneUITests/` | Drives the real app: add, shuffle, start, finish, relaunch, check the archive; examples on and off. |
| `project.yml` | XcodeGen spec. The `.xcodeproj`, Info.plists and entitlements are generated. |

iOS 17+, iPhone and iPad, Swift 5 language mode, bundle ids
`dev.adriangaona.done` (+ `.widgets`, `.uitests`).

## First run on a Mac

1. **Xcode 16.1 or newer** (16.0's widget-bundle builder crashes on iOS 17 with
   the iOS 18 control), and XcodeGen: `brew install xcodegen`.
2. Core tests first; they need nothing else:

   ```bash
   cd ios/DoneCore && swift test
   ```

3. Generate and open the project:

   ```bash
   cd ios && xcodegen && open Done.xcodeproj
   ```

4. **Simulator:** pick an iPhone and run. A build without signing has no App
   Group, so the app falls back to its own folder and the widgets (which can't
   see that folder) show 0 tasks. Sign with your team (step 5) to see real data
   in the widgets, on the simulator too.
5. **Real iPhone:** create `ios/Config/Local.xcconfig` with your team id, run
   `xcodegen` again, and in the Apple Developer portal register the App Group
   `group.dev.adriangaona.done` (Xcode's automatic signing usually does this
   for you):

   ```
   DEVELOPMENT_TEAM = ABCDE12345
   ```

6. UI tests: ⌘U in Xcode, or
   `xcodebuild test -project Done.xcodeproj -scheme Done -destination 'platform=iOS Simulator,name=iPhone 16'`.

## Keeping it in step with the web app

`DoneCore` is a line-for-line port of the web logic, and its tests prove it:

- **Ported tests.** The web app's Vitest cases in XCTest (32 of 34; the other 2
  cover the browser-only install hint), plus tests for the shared actions,
  storage, preferences, the Now card text and the reel.
- **Parity tests.** `npm run parity:fixtures` (repo root) runs fixed inputs
  through the web code and saves its answers to
  `DoneCore/Tests/DoneCoreTests/Fixtures/parity.json`; `ParityTests.swift` must
  get the same answers (shuffle weights and picks, filters, sorting, quick-add
  parsing, every backup error message, archive grouping, reminder timing,
  dates). CI checks the file is current (`npm run parity:fixtures -- --check`).

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
- **Small UI choices:** active tasks can be deleted (swipe, with Undo; the web
  only deletes from the archive); deleting a category asks first; an emptied
  list says "All clear"; one toast at a time (a new one replaces the last,
  with its Undo); category groups start open on every launch.

Where ICU's regex rules differ from JavaScript's, the port spells out
JavaScript's: `[0-9]` for `\d`, JavaScript's whitespace set for `\s` and
`trim()`, and `\z` for `$`. The parity cases cover each one.

## Not included

- **Apple Watch, Vision Pro, a native Mac app.** The iPad app runs on Apple
  silicon Macs as is; a watch app would need its own target and phone-to-watch
  syncing.
- **iCloud sync** between devices (left out of v1 on purpose). Backups move
  data by hand, and the device's own iCloud backup covers the app's data.
- **App Store listing** (screenshots, description, review notes): phase 7.

## CI

`.github/workflows/ios.yml` runs the web tests, the fixture check, `swift test`,
and the app build with its UI tests on GitHub's macOS runners. It only runs
once the branch is pushed.
