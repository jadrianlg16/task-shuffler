import XCTest
@testable import DoneCore

/// The store actions the app, widgets and Siri share.
final class LibraryTests: XCTestCase {
    let now = Make.date("2026-09-22T12:00:00Z")

    private func library(_ tasks: [TaskItem]) -> Library { Library(tasks: tasks, categories: TaskCategory.defaults) }

    func testAddPutsTheTaskOnTopAndFallsBackToUnassigned() {
        var lib = library([Make.task("old")])
        let added = lib.addTask(name: "New", durationMinutes: 0, categoryId: "gone", id: "new", now: now)
        XCTAssertEqual(lib.tasks.map(\.id), ["new", "old"])
        XCTAssertEqual(added.categoryId, TaskCategory.unassignedId)
        XCTAssertNil(added.durationMinutes, "0 minutes means no estimate")
        XCTAssertEqual(added.createdAt, "2026-09-22T12:00:00.000Z")
    }

    func testStartingATaskDropsAnyOtherInProgress() {
        var lib = library([Make.task("a", startedAt: "2026-09-22T10:00:00.000Z"), Make.task("b")])
        lib.start(id: "b", now: now)
        XCTAssertEqual(lib.current?.id, "b")
        XCTAssertNil(lib.task(id: "a")?.startedAt)
        lib.drop(id: "b")
        XCTAssertNil(lib.current)
    }

    func testCompleteReturnsTheTaskAsItWasForUndo() {
        var lib = library([Make.task("a", startedAt: "2026-09-22T10:00:00.000Z")])
        let before = lib.complete(id: "a", now: now)
        XCTAssertEqual(lib.task(id: "a")?.status, .archived)
        XCTAssertEqual(lib.task(id: "a")?.completedAt, "2026-09-22T12:00:00.000Z")
        XCTAssertNil(lib.current)
        lib.replace(before!)
        XCTAssertEqual(lib.current?.id, "a", "Undo from the Now card puts it back in progress")
    }

    func testRestoreBringsATaskBackNotInProgress() {
        var lib = library([Make.task("a", status: .archived, completedAt: "2026-09-22T10:00:00.000Z", startedAt: "2026-09-22T09:00:00.000Z")])
        lib.restore(id: "a")
        XCTAssertEqual(lib.task(id: "a")?.status, .active)
        XCTAssertNil(lib.task(id: "a")?.completedAt)
        XCTAssertNil(lib.task(id: "a")?.startedAt)
    }

    func testDeleteReturnsThePositionForUndo() {
        var lib = library([Make.task("a"), Make.task("b"), Make.task("c")])
        let removed = lib.delete(id: "b")
        XCTAssertEqual(removed?.index, 1)
        lib.insert(removed!.task, at: removed!.index)
        XCTAssertEqual(lib.tasks.map(\.id), ["a", "b", "c"])
    }

    func testDeletingACategoryMovesItsTasksAndKeepsTheStartingOnes() {
        var lib = library([Make.task("a", category: "school")])
        let custom = lib.addCategory(name: " Side ", color: "#EC4899", id: "side")
        XCTAssertEqual(custom.name, "Side")
        XCTAssertEqual(custom.sortOrder, 6)
        lib.updateTask(id: "a", name: "a", durationMinutes: nil, categoryId: "side")
        lib.deleteCategory(id: "side")
        XCTAssertNil(lib.category(id: "side"))
        XCTAssertEqual(lib.task(id: "a")?.categoryId, TaskCategory.unassignedId)
        lib.deleteCategory(id: "school")
        XCTAssertNotNil(lib.category(id: "school"), "starting categories can't be deleted")
    }

    func testReorderingSetsSortOrderToPosition() {
        var lib = library([])
        lib.reorderCategories(["field", "school"])
        XCTAssertEqual(lib.sortedCategories.map(\.id), ["field", "school", "personal", "business", "hobby", "unassigned"])
        XCTAssertEqual(lib.sortedCategories.map(\.sortOrder), [0, 1, 2, 3, 4, 5])
    }

    func testExamplesAreAddedOnceAndClearedWithoutTouchingOwnTasks() {
        var lib = library([Make.task("mine")])
        lib.addExamples(now: now)
        lib.addExamples(now: now)
        XCTAssertEqual(lib.exampleCount, 10)
        XCTAssertEqual(lib.ownTaskCount, 1)
        lib.clearExamples()
        XCTAssertEqual(lib.tasks.map(\.id), ["mine"])
    }

    func testDoneTodayCountsOnlyTodaysCalendarDay() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Mexico_City")!
        let lib = library([
            Make.task("today", status: .archived, completedAt: "2026-09-22T07:00:00.000Z"), // 01:00 local
            Make.task("yesterday", status: .archived, completedAt: "2026-09-22T05:00:00.000Z"), // 23:00 local, the 21st
            Make.task("active"),
        ])
        XCTAssertEqual(lib.doneToday(now: now, calendar: calendar), 1)
    }

    func testTheListHidesArchivedTasksAndHiddenCategories() {
        var lib = library([
            Make.task("shown", category: "school"),
            Make.task("hidden", category: "hobby"),
            Make.task("finished", status: .archived),
        ])
        lib.setHidden(true, categoryId: "hobby")
        XCTAssertEqual(lib.listTasks().map(\.id), ["shown"])
        XCTAssertEqual(lib.visibleCategories.count, 5)
    }

    // MARK: Files and preferences

    private func temporaryFile() throws -> LibraryFile {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        addTeardownBlock { try? FileManager.default.removeItem(at: folder) }
        return LibraryFile(url: folder.appendingPathComponent("tasks.json"))
    }

    func testTheFileRoundTripsAndIsAValidBackup() throws {
        let file = try temporaryFile()
        XCTAssertNil(try file.load(), "nothing saved yet")
        var lib = library([])
        lib.addTask(name: "Sketch", durationMinutes: nil, categoryId: "hobby", id: "t1", now: now)
        try file.save(lib)
        XCTAssertEqual(try file.load(), lib)
        let data = try Data(contentsOf: file.url)
        XCTAssertEqual(try Backup.parse(data), lib.backup)
    }

    func testUpdateReadsChangesAndWritesInOneStep() throws {
        let file = try temporaryFile()
        try file.update { $0.addTask(name: "One", durationMinutes: 5, categoryId: "school", id: "1", now: now) }
        let saved = try file.update { $0.start(id: "1", now: now) }
        XCTAssertEqual(saved.current?.id, "1")
        XCTAssertEqual(try file.load()?.current?.id, "1")
    }

    func testAnUnreadableFileThrowsAndCanBeKept() throws {
        let file = try temporaryFile()
        try FileManager.default.createDirectory(at: file.url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data("not json".utf8).write(to: file.url)
        XCTAssertThrowsError(try file.load())
        let copy = try XCTUnwrap(file.keepUnreadableCopy(now: now))
        XCTAssertEqual(try Data(contentsOf: copy), Data("not json".utf8))
    }

    func testPreferencesFillInMissingFields() throws {
        let partial = Data(#"{"soundsOn": false, "sortBy": "name"}"#.utf8)
        let preferences = try JSONDecoder().decode(Preferences.self, from: partial)
        XCTAssertFalse(preferences.soundsOn)
        XCTAssertEqual(preferences.sortBy, .name)
        XCTAssertTrue(preferences.hapticsOn)
        XCTAssertEqual(preferences.shuffleTimeFilter, .anyLength)
    }

    func testPreferencesStoreSavesAndUpdates() throws {
        let suite = "done-tests-\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        addTeardownBlock { defaults.removePersistentDomain(forName: suite) }
        let store = PreferencesStore(defaults: defaults)
        XCTAssertEqual(store.load(), Preferences())
        store.update { $0.dailyNudge = true }
        XCTAssertTrue(store.load().dailyNudge)
    }

    func testAFocusFilterNarrowsThePickersCategories() {
        let lib = library([])
        var preferences = Preferences()
        preferences.shuffleCategoryIds = ["school", "personal", "gone"]
        XCTAssertEqual(preferences.effectiveCategoryIds(in: lib), ["school", "personal"])
        preferences.focusCategoryIds = ["business"]
        XCTAssertEqual(preferences.effectiveCategoryIds(in: lib), ["business"], "no overlap: the Focus categories")
        preferences.focusCategoryIds = ["personal", "business"]
        XCTAssertEqual(preferences.effectiveCategoryIds(in: lib), ["personal"])
    }

    // MARK: Now card and reel

    func testNowStatusText() {
        var task = Make.task("a", duration: 25, startedAt: "2026-09-22T11:50:00.000Z")
        XCTAssertEqual(NowStatus.text(for: task, now: now), "10 of 25 min")
        XCTAssertEqual(NowStatus.text(for: task, now: now.addingTimeInterval(20 * 60)), "5 min over")
        XCTAssertEqual(NowStatus.text(for: task, now: Make.date("2026-09-22T11:50:30Z")), "Just started")
        XCTAssertEqual(NowStatus.progress(for: task, now: now) ?? -1, 0.4, accuracy: 1e-9)
        task.durationMinutes = nil
        XCTAssertEqual(NowStatus.text(for: task, now: now), "10 min in")
        XCTAssertNil(NowStatus.progress(for: task, now: now))
    }

    func testTheReelLandsOnTheWinnerWithoutADoubleAboveIt() {
        let candidates = (1...6).map { Make.task("t\($0)") }
        var generator = SeededGenerator(seed: 7)
        for round in 0..<50 {
            let winner = candidates[round % candidates.count]
            let strip = Reel.strip(candidates: candidates, winner: winner, using: &generator)
            let index = Reel.winnerIndex(stripCount: strip.count)
            XCTAssertEqual(strip[index].id, winner.id)
            XCTAssertEqual(strip.count, candidates.count * Reel.passes + 1 + Reel.centerRow)
            for above in (index - Reel.centerRow)..<index {
                XCTAssertNotEqual(strip[above].id, winner.id, "round \(round)")
            }
        }
    }

    func testTheReelEasingStartsFastAndSettles() {
        XCTAssertEqual(Reel.eased(0), 0)
        XCTAssertEqual(Reel.eased(1), 1)
        XCTAssertGreaterThan(Reel.eased(0.2), 0.6, "most of the distance goes by early")
        var previous = 0.0
        for step in 1...100 {
            let value = Reel.eased(Double(step) / 100)
            XCTAssertGreaterThanOrEqual(value, previous - 1e-9)
            previous = value
        }
    }
}

/// A repeatable random source for tests (SplitMix64).
struct SeededGenerator: RandomNumberGenerator {
    private var state: UInt64

    init(seed: UInt64) {
        state = seed
    }

    mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }
}
