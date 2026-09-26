import XCTest

/// Drives the real app: add a task, shuffle, start it, finish it, relaunch,
/// and check it's still in the archive. Runs with `-ui-testing`, which keeps
/// data in a scratch folder, skips the reel, and leaves notifications and
/// Live Activities off so no permission prompt gets in the way.
final class DoneUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    @MainActor
    private func launch(reset: Bool) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing"]
        app.launchEnvironment["DONE_RESET"] = reset ? "1" : "0"
        app.launch()
        return app
    }

    @MainActor
    private func element(_ id: String, in app: XCUIApplication) -> XCUIElement {
        app.descendants(matching: .any)[id].firstMatch
    }

    /// Adding keeps the keyboard up for the next task; an empty Return puts it away.
    @MainActor
    private func closeKeyboard(_ field: XCUIElement, in app: XCUIApplication) {
        if app.keyboards.count > 0 {
            field.typeText("\n")
        }
    }

    /// Off-screen List rows don't exist for UI tests, so scroll until it does.
    @MainActor
    private func scrollTo(_ target: XCUIElement, in app: XCUIApplication) {
        var tries = 0
        while !target.exists && tries < 8 {
            app.swipeUp()
            tries += 1
        }
    }

    @MainActor
    func testAddShuffleStartFinishAndItStaysArchived() {
        var app = launch(reset: true)

        let field = app.textFields["quickAddField"]
        XCTAssertTrue(field.waitForExistence(timeout: 5))
        field.tap()
        field.typeText("Write report 15m\n")
        closeKeyboard(field, in: app)
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
        XCTAssertTrue(nowTitle.waitForNonExistence(timeout: 3), "the Now card goes away when it's done")

        // Saved, not just on screen: a fresh launch still has it in the archive.
        app.terminate()
        app = launch(reset: false)
        let archive = app.buttons["archiveButton"]
        XCTAssertTrue(archive.waitForExistence(timeout: 5))
        archive.tap()
        XCTAssertTrue(element("archived-Write report", in: app).waitForExistence(timeout: 3))
    }

    @MainActor
    func testExamplesCanBeTriedAndCleared() {
        let app = launch(reset: true)

        let tryExamples = app.buttons["tryExamples"]
        XCTAssertTrue(tryExamples.waitForExistence(timeout: 5))
        tryExamples.tap()

        let guitar = element("task-Practice guitar", in: app)
        scrollTo(guitar, in: app)
        XCTAssertTrue(guitar.exists, "an example task is in the list")

        // Back to the top, where the examples banner is.
        for _ in 0..<8 where !app.buttons["clearExamples"].exists {
            app.swipeDown()
        }
        let clear = app.buttons["clearExamples"]
        XCTAssertTrue(clear.waitForExistence(timeout: 3))
        clear.tap()

        // Empty again, so the picker offers the examples again.
        XCTAssertTrue(app.buttons["tryExamples"].waitForExistence(timeout: 3))
        XCTAssertTrue(clear.waitForNonExistence(timeout: 3))
    }
}
