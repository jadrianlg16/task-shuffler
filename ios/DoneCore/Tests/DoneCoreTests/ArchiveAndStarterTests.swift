import XCTest
@testable import DoneCore

/// Port of src/utils/archive.test.ts. The web test uses the machine's local
/// time; here the calendar is pinned so the result doesn't depend on the Mac.
final class ArchiveTests: XCTestCase {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Mexico_City")!
        return calendar
    }

    /// Tue 22 Sep 2026 15:00, local time.
    private var now: Date {
        calendar.date(from: DateComponents(year: 2026, month: 9, day: 22, hour: 15))!
    }

    private func at(_ daysBack: Int, hour: Int = 10) -> String {
        let day = calendar.date(from: DateComponents(year: 2026, month: 9, day: 22, hour: hour))!
        return DoneDate.string(from: calendar.date(byAdding: .day, value: -daysBack, to: day)!)
    }

    private func done(_ id: String, _ completedAt: String?) -> TaskItem {
        Make.task(id, status: .archived, createdAt: at(30), completedAt: completedAt)
    }

    func testSortsNewestFirstAndBucketsByCalendarDay() {
        let groups = Archive.group(
            [
                done("lastMonth", at(20)),
                done("thisMorning", at(0, hour: 8)),
                done("yesterday", at(1)),
                done("justNow", at(0, hour: 14)),
                done("sixDaysAgo", at(6)),
                done("sevenDaysAgo", at(7)),
            ],
            now: now,
            calendar: calendar
        )
        XCTAssertEqual(groups.map(\.label), ["Today", "This week", "Earlier"])
        XCTAssertEqual(groups.map { $0.items.map(\.id) }, [
            ["justNow", "thisMorning"],
            ["yesterday", "sixDaysAgo"],
            ["sevenDaysAgo", "lastMonth"],
        ])
    }

    func testIgnoresActiveTasksDropsEmptyBucketsAndFilesUndatedOnesUnderEarlier() {
        var active = done("a", nil)
        active.status = .active
        let undated = done("undated", nil)
        XCTAssertEqual(
            Archive.group([active, undated], now: now, calendar: calendar),
            [ArchiveGroup(label: "Earlier", items: [undated])]
        )
    }
}

/// Port of src/lib/safety.test.ts (the backup reminder; the web-only install
/// hint has no iPhone equivalent).
final class BackupReminderTests: XCTestCase {
    let now = Make.date("2026-09-23T12:00:00Z")
    let enough = BackupReminder.minimumTasks

    private func ago(_ days: Double) -> Date { now.addingTimeInterval(-days * 86_400) }

    private func remind(
        tasks: Int? = nil,
        firstUse: Date? = nil,
        lastBackup: Date? = nil,
        snoozedUntil: Date? = nil
    ) -> Bool {
        BackupReminder.shouldRemind(
            ownTaskCount: tasks ?? enough,
            firstUseAt: firstUse ?? ago(10),
            lastBackupAt: lastBackup,
            snoozedUntil: snoozedUntil,
            now: now
        )
    }

    func testRemindsAfterAWeekOfUseWithoutAnyBackup() {
        XCTAssertTrue(remind())
        XCTAssertFalse(remind(firstUse: ago(6)))
    }

    func testThenOnlyWhenTheLastBackupIsAMonthOld() {
        XCTAssertFalse(remind(lastBackup: ago(29)))
        XCTAssertTrue(remind(lastBackup: ago(31)))
    }

    func testRespectsLaterAndSmallLists() {
        XCTAssertFalse(remind(snoozedUntil: now.addingTimeInterval(86_400)))
        XCTAssertFalse(remind(tasks: enough - 1))
    }
}

/// Port of src/data/exampleTasks.test.ts.
final class ExampleTasksTests: XCTestCase {
    let now = Make.date("2026-09-23T12:00:00Z")
    private var tasks: [TaskItem] { ExampleTasks.make(now: now) }

    func testAreAllRecognisableAsExamplesAndRealIdsAreNot() {
        XCTAssertTrue(tasks.allSatisfy { ExampleTasks.isExample($0) })
        XCTAssertFalse(ExampleTasks.isExample(id: "3f0c9a1e-real-uuid"))
    }

    func testHaveUniqueIdsValidCategoriesAndPassBackupValidation() throws {
        XCTAssertEqual(Set(tasks.map(\.id)).count, tasks.count)
        let categoryIds = Set(TaskCategory.defaults.map(\.id))
        XCTAssertTrue(tasks.allSatisfy { categoryIds.contains($0.categoryId) })
        XCTAssertNoThrow(try Backup.parse(Backup(activities: tasks, categories: TaskCategory.defaults).jsonData()))
    }

    func testAreDatedInThePastNewestFirst() {
        let times = tasks.map { DoneDate.milliseconds(from: $0.createdAt)! }
        XCTAssertTrue(times.allSatisfy { $0 < DoneDate.milliseconds(from: now) })
        XCTAssertEqual(times.sorted(by: >), times)
    }
}
