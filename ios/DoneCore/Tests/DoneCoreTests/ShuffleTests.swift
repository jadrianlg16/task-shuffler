import XCTest
@testable import DoneCore

/// Port of src/utils/shuffle.test.ts.
final class ShuffleTests: XCTestCase {
    let now = Make.date("2026-09-22T12:00:00Z")
    let categories = [Make.category("school"), Make.category("hobby", hidden: true), Make.category("unassigned")]

    private func daysAgo(_ days: Double) -> String { Make.daysAgo(days, from: now) }

    private func ids(_ tasks: [TaskItem]) -> [String] { tasks.map(\.id).sorted() }

    // MARK: weight

    func testWeightGrowsLinearlyFromOneToThreeThenCaps() {
        XCTAssertEqual(Shuffle.weight(of: Make.task("a", createdAt: daysAgo(0)), now: now), 1)
        XCTAssertEqual(Shuffle.weight(of: Make.task("a", createdAt: daysAgo(15)), now: now), 2, accuracy: 1e-9)
        XCTAssertEqual(Shuffle.weight(of: Make.task("a", createdAt: daysAgo(30)), now: now), 3, accuracy: 1e-9)
        XCTAssertEqual(Shuffle.weight(of: Make.task("a", createdAt: daysAgo(90)), now: now), 3)
    }

    func testFutureCreatedAtCountsAsNew() {
        XCTAssertEqual(Shuffle.weight(of: Make.task("a", createdAt: daysAgo(-2)), now: now), 1)
    }

    // MARK: select

    func testSelectReturnsNilForAnEmptyPool() {
        XCTAssertNil(Shuffle.select([], now: now))
    }

    func testThirtyDayOldTaskComesUpAboutThreeTimesAsOftenAsANewOne() {
        let pool = [Make.task("new", createdAt: daysAgo(0)), Make.task("old", createdAt: daysAgo(30))]
        let random = Make.lcg(42)
        let draws = 100_000
        var old = 0
        for _ in 0..<draws where Shuffle.select(pool, random: random, now: now)?.id == "old" {
            old += 1
        }
        let share = Double(old) / Double(draws)
        XCTAssertGreaterThan(share, 0.74)
        XCTAssertLessThan(share, 0.76)
    }

    // MARK: candidates

    private var pickerTasks: [TaskItem] {
        [
            Make.task("t1", duration: 10, createdAt: daysAgo(0)),
            Make.task("t2", duration: 45, createdAt: daysAgo(0)),
            Make.task("started", duration: 10, createdAt: daysAgo(0), startedAt: daysAgo(0)),
            Make.task("hiddenCat", duration: 10, category: "hobby", createdAt: daysAgo(0)),
            Make.task("archived", duration: 10, status: .archived, createdAt: daysAgo(0)),
            Make.task("un", category: "unassigned", createdAt: daysAgo(0)),
        ]
    }

    func testCandidatesExcludeTheTaskInProgressHiddenCategoriesAndArchivedTasks() {
        let result = Shuffle.candidates(pickerTasks, categoryIds: [], timeFilter: .anyLength, categories: categories)
        XCTAssertEqual(ids(result), ["t1", "t2", "un"])
    }

    func testCandidatesNarrowToPickedCategories() {
        let result = Shuffle.candidates(pickerTasks, categoryIds: ["unassigned"], timeFilter: .anyLength, categories: categories)
        XCTAssertEqual(ids(result), ["un"])
    }

    func testCandidatesApplyIHaveNMinutesOptionallyKeepingUntimedTasks() {
        var fifteen = TimeFilter(mode: .max, value: 15, includeNoDuration: true)
        XCTAssertEqual(ids(Shuffle.candidates(pickerTasks, categoryIds: [], timeFilter: fifteen, categories: categories)), ["t1", "un"])
        fifteen.includeNoDuration = false
        XCTAssertEqual(ids(Shuffle.candidates(pickerTasks, categoryIds: [], timeFilter: fifteen, categories: categories)), ["t1"])
    }

    // MARK: suggestLoosening

    private var looseningTasks: [TaskItem] {
        [Make.task("short", duration: 10), Make.task("long", duration: 45)]
    }

    func testLooseningOffersTheNextPresetThatFits() {
        let atMostFive = TimeFilter(mode: .max, value: 5, includeNoDuration: false)
        let suggestion = Shuffle.suggestLoosening(looseningTasks, categoryIds: [], timeFilter: atMostFive, categories: categories)
        guard case .time(_, let label, let count)? = suggestion else { return XCTFail("Expected a time suggestion, got \(String(describing: suggestion))") }
        XCTAssertEqual(label, "15 min")
        XCTAssertEqual(count, 1)
    }

    func testLooseningFallsBackToAnyLengthForAdvancedFilters() {
        let atLeast100 = TimeFilter(mode: .min, value: 100, includeNoDuration: false)
        let suggestion = Shuffle.suggestLoosening(looseningTasks, categoryIds: [], timeFilter: atLeast100, categories: categories)
        guard case .time(_, let label, let count)? = suggestion else { return XCTFail("Expected a time suggestion, got \(String(describing: suggestion))") }
        XCTAssertEqual(label, "any length")
        XCTAssertEqual(count, 2)
    }

    func testLooseningSaysSoWhenThePickedCategoriesAreEmpty() {
        XCTAssertEqual(
            Shuffle.suggestLoosening([], categoryIds: [], timeFilter: .anyLength, categories: categories),
            .noneInCategories
        )
    }
}
