import XCTest
@testable import DoneCore

/// The same inputs through the Swift port as through the web app's own code
/// (answers recorded in Fixtures/parity.json by `npm run parity:fixtures`).
/// A failure here means the two apps disagree; the message names the input.
final class ParityTests: XCTestCase {
    private static var cached: ParityFixtures?

    private func fixtures() throws -> ParityFixtures {
        if let cached = Self.cached { return cached }
        let url = try XCTUnwrap(
            Bundle.module.url(forResource: "parity", withExtension: "json", subdirectory: "Fixtures"),
            "Fixtures/parity.json is missing from the test bundle"
        )
        let loaded = try JSONDecoder().decode(ParityFixtures.self, from: Data(contentsOf: url))
        Self.cached = loaded
        return loaded
    }

    private func ids(_ tasks: [TaskItem]) -> [String] { tasks.map(\.id) }

    func testDates() throws {
        let f = try fixtures()
        for c in f.dates.parse {
            XCTAssertEqual(DoneDate.milliseconds(from: c.input), c.ms, "parse \"\(c.input)\"")
        }
        for c in f.dates.format {
            XCTAssertEqual(DoneDate.string(fromMilliseconds: c.ms), c.expected, "format \(c.ms)")
        }
    }

    func testStarterData() throws {
        let f = try fixtures()
        XCTAssertEqual(TaskCategory.defaults, f.defaultCategories)
        XCTAssertEqual(Shuffle.timePresets, f.timePresets)
        let now = try date(f.now)
        XCTAssertEqual(ExampleTasks.make(now: now), f.examples)
    }

    func testFilters() throws {
        let f = try fixtures()
        for c in f.filters.time {
            XCTAssertEqual(ids(Filters.byTime(f.activities, c.filter)), c.expected, "time \(c.filter)")
        }
        for c in f.filters.categories {
            XCTAssertEqual(ids(Filters.byCategories(f.activities, c.categoryIds)), c.expected, "categories \(c.categoryIds)")
        }
        for c in f.filters.search {
            XCTAssertEqual(ids(Filters.bySearch(f.activities, c.query)), c.expected, "search \"\(c.query)\"")
        }
        // Pinned so the result doesn't depend on the test machine's language.
        let english = Locale(identifier: "en_US")
        for c in f.filters.sort {
            let result = Filters.sorted(f.activities, by: c.sortBy, categories: c.categories ?? f.categories, locale: english)
            XCTAssertEqual(ids(result), c.expected, "sort by \(c.sortBy)")
        }
    }

    func testCandidates() throws {
        let f = try fixtures()
        for c in f.candidates {
            let result = Shuffle.candidates(f.activities, categoryIds: c.categoryIds, timeFilter: c.filter, categories: f.categories)
            XCTAssertEqual(ids(result), c.expected, "\(c.categoryIds) \(c.filter)")
        }
    }

    func testWeights() throws {
        let f = try fixtures()
        let now = try date(f.now)
        for c in f.weights {
            let task = TaskItem(id: "w", name: "w", durationMinutes: nil, categoryId: "school", createdAt: c.createdAt)
            XCTAssertEqual(Shuffle.weight(of: task, now: now), c.expected, accuracy: 1e-12, c.createdAt)
        }
    }

    func testSelect() throws {
        let f = try fixtures()
        let now = try date(f.now)
        XCTAssertEqual(f.select.randoms.count, f.select.expected.count)
        for (r, expected) in zip(f.select.randoms, f.select.expected) {
            XCTAssertEqual(Shuffle.select(f.select.pool, random: { r }, now: now)?.id, expected, "random \(r)")
        }
        XCTAssertNil(Shuffle.select([], random: { 0.5 }, now: now))
    }

    func testLoosening() throws {
        let f = try fixtures()
        for c in f.loosening {
            let result = Shuffle.suggestLoosening(f.activities, categoryIds: c.categoryIds, timeFilter: c.filter, categories: f.categories)
            let expected = try c.expected?.loosening()
            XCTAssertEqual(result, expected, "\(c.categoryIds) \(c.filter)")
        }
    }

    func testQuickAdd() throws {
        let f = try fixtures()
        for c in f.quickAdd {
            XCTAssertEqual(QuickAdd.parse(c.input, categories: f.categories), c.expected, "\"\(c.input)\"")
        }
        for c in f.matchCategory {
            XCTAssertEqual(QuickAdd.matchCategory(c.tag, categories: f.categories)?.id, c.expected, "#\(c.tag)")
        }
    }

    func testImport() throws {
        let f = try fixtures()
        for c in f.importCases {
            if let message = c.error {
                XCTAssertThrowsError(try Backup.parse(c.json), c.label) { error in
                    XCTAssertEqual((error as? BackupError)?.message, message, c.label)
                }
            } else {
                do {
                    let backup = try Backup.parse(c.json)
                    XCTAssertEqual(backup, c.expected, c.label)
                    // And what this app writes reads back the same.
                    XCTAssertEqual(try Backup.parse(backup.jsonData()), backup, "\(c.label), exported again")
                } catch {
                    XCTFail("\(c.label): \(error)")
                }
            }
        }
    }

    func testArchive() throws {
        let f = try fixtures()
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: f.timeZone))
        for c in f.archive {
            let now = try date(c.now)
            let groups = Archive.group(c.activities, now: now, calendar: calendar)
            XCTAssertEqual(groups.map(\.label), c.expected.map(\.label), "now \(c.now)")
            XCTAssertEqual(groups.map { ids($0.items) }, c.expected.map(\.ids), "now \(c.now)")
        }
    }

    func testBackupReminder() throws {
        let f = try fixtures()
        let now = try date(f.now)
        for c in f.backupReminder {
            let firstUseAt = try date(c.firstUseAt)
            let lastBackupAt = try c.lastBackupAt.map { try date($0) }
            let snoozedUntil = try c.snoozedUntil.map { try date($0) }
            let result = BackupReminder.shouldRemind(
                ownTaskCount: c.ownTaskCount,
                firstUseAt: firstUseAt,
                lastBackupAt: lastBackupAt,
                snoozedUntil: snoozedUntil,
                now: now
            )
            XCTAssertEqual(result, c.expected, c.label)
        }
    }

    private func date(_ iso: String) throws -> Date {
        try XCTUnwrap(DoneDate.date(from: iso), "unreadable date \(iso)")
    }
}

/// The shape of Fixtures/parity.json (see scripts/parity-fixtures.ts).
struct ParityFixtures: Decodable {
    struct TimeCase: Decodable { let filter: TimeFilter; let expected: [String] }
    struct CategoryCase: Decodable { let categoryIds: [String]; let expected: [String] }
    struct SearchCase: Decodable { let query: String; let expected: [String] }
    struct SortCase: Decodable { let sortBy: SortBy; let categories: [TaskCategory]?; let expected: [String] }
    struct FilterCases: Decodable {
        let time: [TimeCase]
        let categories: [CategoryCase]
        let search: [SearchCase]
        let sort: [SortCase]
    }
    struct CandidateCase: Decodable { let categoryIds: [String]; let filter: TimeFilter; let expected: [String] }
    struct WeightCase: Decodable { let createdAt: String; let expected: Double }
    struct SelectCase: Decodable { let pool: [TaskItem]; let randoms: [Double]; let expected: [String?] }
    struct LooseningAnswer: Decodable {
        let kind: String
        let filter: TimeFilter?
        let label: String?
        let count: Int?

        func loosening() throws -> Loosening {
            if kind == "none-in-categories" { return .noneInCategories }
            let filter = try XCTUnwrap(self.filter, "time suggestion without a filter")
            let label = try XCTUnwrap(self.label, "time suggestion without a label")
            let count = try XCTUnwrap(self.count, "time suggestion without a count")
            return .time(filter: filter, label: label, count: count)
        }
    }
    struct LooseningCase: Decodable { let categoryIds: [String]; let filter: TimeFilter; let expected: LooseningAnswer? }
    struct QuickAddCase: Decodable { let input: String; let expected: QuickAddParse }
    struct MatchCase: Decodable { let tag: String; let expected: String? }
    struct ImportCase: Decodable { let label: String; let json: String; let error: String?; let expected: Backup? }
    struct ArchiveAnswer: Decodable { let label: String; let ids: [String] }
    struct ArchiveCase: Decodable { let now: String; let activities: [TaskItem]; let expected: [ArchiveAnswer] }
    struct ReminderCase: Decodable {
        let label: String
        let ownTaskCount: Int
        let firstUseAt: String
        let lastBackupAt: String?
        let snoozedUntil: String?
        let expected: Bool
    }
    struct DateParseCase: Decodable { let input: String; let ms: Int64? }
    struct DateFormatCase: Decodable { let ms: Int64; let expected: String }
    struct DateCases: Decodable { let parse: [DateParseCase]; let format: [DateFormatCase] }

    let timeZone: String
    let now: String
    let timePresets: [Int]
    let categories: [TaskCategory]
    let activities: [TaskItem]
    let defaultCategories: [TaskCategory]
    let filters: FilterCases
    let candidates: [CandidateCase]
    let weights: [WeightCase]
    let select: SelectCase
    let loosening: [LooseningCase]
    let quickAdd: [QuickAddCase]
    let matchCategory: [MatchCase]
    let importCases: [ImportCase]
    let archive: [ArchiveCase]
    let examples: [TaskItem]
    let backupReminder: [ReminderCase]
    let dates: DateCases

    enum CodingKeys: String, CodingKey {
        case timeZone, now, timePresets, categories, activities, defaultCategories, filters, candidates
        case weights, select, loosening, quickAdd, matchCategory, archive, examples, backupReminder, dates
        case importCases = "import"
    }
}
