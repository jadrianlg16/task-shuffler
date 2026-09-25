import XCTest
@testable import DoneCore

/// Port of src/utils/exportImport.test.ts, plus the export details the web app
/// relies on when it reads a file made here.
final class BackupTests: XCTestCase {
    private func task(_ fields: [String: Any] = [:]) -> [String: Any] {
        var task: [String: Any] = [
            "id": "t1",
            "name": "Read",
            "durationMinutes": 30,
            "categoryId": "school",
            "status": "active",
            "createdAt": "2026-09-01T00:00:00.000Z",
            "completedAt": NSNull(),
        ]
        task.merge(fields) { _, new in new }
        return task
    }

    /// A backup file with hand-made (possibly broken) tasks.
    private func file(_ tasks: [[String: Any]], categories: [TaskCategory] = TaskCategory.defaults) throws -> Data {
        let categoryList = try JSONSerialization.jsonObject(with: JSONEncoder().encode(categories))
        let body: [String: Any] = ["activities": tasks, "categories": categoryList]
        return try JSONSerialization.data(withJSONObject: body)
    }

    private func assertRefused(_ data: Data, containing text: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertThrowsError(try Backup.parse(data), file: file, line: line) { error in
            let message = (error as? BackupError)?.message ?? "\(error)"
            XCTAssertTrue(message.contains(text), "\"\(message)\" doesn't mention \"\(text)\"", file: file, line: line)
        }
    }

    private let read = TaskItem(
        id: "t1", name: "Read", durationMinutes: 30, categoryId: "school", createdAt: "2026-09-01T00:00:00.000Z"
    )

    func testRoundTripsAnExport() throws {
        let backup = Backup(activities: [read], categories: TaskCategory.defaults)
        XCTAssertEqual(try Backup.parse(backup.jsonData()), backup)
    }

    func testRejectsNonJSONAndNonBackupsWithAReadableMessage() {
        assertRefused(Data("not json".utf8), containing: "valid JSON")
        assertRefused(Data(#"{"tasks": []}"#.utf8), containing: "backup")
    }

    func testRejectsMalformedTasksInsteadOfImportingHalfAFile() throws {
        let secondIsBroken = try file([task(), task(["id": "t2", "status": "done"])])
        assertRefused(secondIsBroken, containing: "Task #2")
    }

    func testRejectsDuplicateIdsAndAMissingUnassignedCategory() throws {
        let twice = try file([task(), task()])
        assertRefused(twice, containing: "duplicate")
        let noUnassigned = try file([], categories: TaskCategory.defaults.filter { $0.id != TaskCategory.unassignedId })
        assertRefused(noUnassigned, containing: "Unassigned")
    }

    func testMovesTasksWithAnUnknownCategoryToUnassigned() throws {
        let backup = try Backup.parse(file([task(["categoryId": "gone"])]))
        XCTAssertEqual(backup.activities.first?.categoryId, TaskCategory.unassignedId)
    }

    func testAcceptsOldBackupsWithoutStartedAt() throws {
        XCTAssertEqual(try Backup.parse(file([task()])).activities.count, 1)
    }

    // MARK: Files the web app can read back

    func testExportWritesEmptyEstimatesAndCompletionAsNull() throws {
        let untimed = TaskItem(id: "t9", name: "Sketch", durationMinutes: nil, categoryId: "hobby", createdAt: "2026-09-01T00:00:00.000Z")
        let data = try Backup(activities: [untimed], categories: TaskCategory.defaults).jsonData()
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let first = try XCTUnwrap((json["activities"] as? [[String: Any]])?.first)
        // The web app's import refuses a task whose durationMinutes key is missing.
        XCTAssertTrue(first["durationMinutes"] is NSNull)
        XCTAssertTrue(first["completedAt"] is NSNull)
        XCTAssertNil(first["startedAt"])
    }
}
