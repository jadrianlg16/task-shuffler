import XCTest
@testable import DoneCore

/// Port of src/utils/quickAdd.test.ts.
final class QuickAddTests: XCTestCase {
    let categories = TaskCategory.defaults + [
        TaskCategory(id: "x1", name: "Side Hustle", color: "#000000", sortOrder: 6),
    ]

    private func parse(_ line: String) -> QuickAddParse { QuickAdd.parse(line, categories: categories) }

    func testLeavesPlainNamesAlone() {
        XCTAssertEqual(parse("Water the plants"), QuickAddParse(name: "Water the plants", durationMinutes: nil, categoryId: nil))
    }

    func testReadsMinutesAndHoursInCommonForms() {
        XCTAssertEqual(parse("Read 30m").durationMinutes, 30)
        XCTAssertEqual(parse("Read 45 min").durationMinutes, 45)
        XCTAssertEqual(parse("Read 1h").durationMinutes, 60)
        XCTAssertEqual(parse("Read 1.5h").durationMinutes, 90)
        XCTAssertEqual(parse("Read 1h30").durationMinutes, 90)
        XCTAssertEqual(parse("Read 2 hrs").durationMinutes, 120)
    }

    func testReadsACategoryByNameIgnoringCaseAndPunctuation() {
        let call = parse("Call mom #personal")
        XCTAssertEqual(call.name, "Call mom")
        XCTAssertEqual(call.categoryId, "personal")
        XCTAssertEqual(parse("Invoice #SideHustle").categoryId, "x1")
        XCTAssertEqual(parse("Invoice #side-hustle").categoryId, "x1")
    }

    func testCombinesBothAnywhereInTheLine() {
        XCTAssertEqual(parse("15m Call mom #personal"), QuickAddParse(name: "Call mom", durationMinutes: 15, categoryId: "personal"))
    }

    func testKeepsNumbersThatArentDurations() {
        let chapter = parse("Read chapter 5")
        XCTAssertEqual(chapter.name, "Read chapter 5")
        XCTAssertNil(chapter.durationMinutes)
        XCTAssertEqual(parse("Buy 2m cable").durationMinutes, 2) // documented trade-off
        let glued = parse("Email team2m")
        XCTAssertEqual(glued.name, "Email team2m")
        XCTAssertNil(glued.durationMinutes)
    }

    func testLeavesUnknownOrAmbiguousTagsInTheName() {
        let result = parse("Fix bug #urgent")
        XCTAssertEqual(result.name, "Fix bug #urgent")
        XCTAssertNil(result.categoryId)
    }

    func testTreatsALineThatIsOnlyShorthandAsTheName() {
        XCTAssertEqual(parse("30m"), QuickAddParse(name: "30m", durationMinutes: nil, categoryId: nil))
    }

    func testMatchesAUniquePrefixButNotAnAmbiguousOne() {
        XCTAssertEqual(QuickAdd.matchCategory("sch", categories: categories)?.id, "school")
        XCTAssertNil(QuickAdd.matchCategory("s", categories: categories)) // School and Side Hustle
    }
}
