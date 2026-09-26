import XCTest

/// Drives the real app: add a task, shuffle, start it, finish it, relaunch,
/// and check it's still in the archive. Runs with `-ui-testing`, which keeps
/// data in a scratch folder, skips the reel, and leaves notifications and
/// Live Activities off so no permission prompt gets in the way.
final class DoneUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    private func launch(reset: Bool) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing"]
        app.launchEnvironment["DONE_RESET"] = reset ? "1" : "0"
        app.launch()
        return app
    }

    private func element(_ id: String, in app: XCUIApplication) -> XCUIElement {
        app.descendants(matching: .any)[id]
    }

    func testAddShuffleStartFinishAndItStaysArchived() {
        var app = launch(reset: true)

        let field = app.textFields["quickAddField"]
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        field.tap()
        field.typeText("Write report 15m\n")
        XCTAssertTrue(element("task-Write report", in: app).waitForExistence(timeout: 3), "the task is in the list")

        let shuffle = app.buttons["shuffleButton"]
        XCTAssertTrue(shuffle.waitForExistence(timeout: 3))
        shuffle.tap()

        let picked = app.staticTexts["pickedTask"]
        XCTAssertTrue(picked.waitForExistence(timeout: 3))
        XCTAssertEqual(picked.label, "Write report")
        app.buttons["startButton"].tap()

        let nowTitle = app.staticTexts["nowTitle"]
        XCTAssertTrue(nowTitle.waitForExistence(timeout: 3), "the Now card shows the started task")
        XCTAssertEqual(nowTitle.label, "Write report")

        app.buttons["nowDone"].tap()
        XCTAssertFalse(nowTitle.waitForExistence(timeout: 2), "the Now card goes away when it's done")

        // Saved, not just on screen: a fresh launch still has it in the archive.
        app.terminate()
        app = launch(reset: false)
        let archive = app.buttons["archiveButton"]
        XCTAssertTrue(archive.waitForExistence(timeout: 5))
        archive.tap()
        XCTAssertTrue(element("archived-Write report", in: app).waitForExistence(timeout: 3))
    }

    func testExamplesCanBeTriedAndCleared() {
        let app = launch(reset: true)

        let tryExamples = app.buttons["tryExamples"]
        XCTAssertTrue(tryExamples.waitForExistence(timeout: 5))
        tryExamples.tap()
        XCTAssertTrue(element("task-Practice guitar", in: app).waitForExistence(timeout: 3))

        let clear = app.buttons["clearExamples"]
        XCTAssertTrue(clear.waitForExistence(timeout: 3))
        clear.tap()
        XCTAssertFalse(element("task-Practice guitar", in: app).waitForExistence(timeout: 2))
    }
}
