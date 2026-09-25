import Foundation
@testable import DoneCore

/// Builders shared by the tests ported from the web app's Vitest suites.
enum Make {
    static let day: Int64 = 86_400_000

    static func date(_ iso: String) -> Date {
        guard let date = DoneDate.date(from: iso) else { preconditionFailure("Bad test date \(iso)") }
        return date
    }

    /// ISO string for `days` before `now` (fractions allowed; negative = future).
    static func daysAgo(_ days: Double, from now: Date) -> String {
        DoneDate.string(fromMilliseconds: DoneDate.milliseconds(from: now) - Int64(days * Double(day)))
    }

    static func task(
        _ id: String,
        name: String? = nil,
        duration: Int? = nil,
        category: String = "school",
        status: TaskItem.Status = .active,
        createdAt: String = "2026-09-22T12:00:00.000Z",
        completedAt: String? = nil,
        startedAt: String? = nil
    ) -> TaskItem {
        TaskItem(
            id: id,
            name: name ?? id,
            durationMinutes: duration,
            categoryId: category,
            status: status,
            createdAt: createdAt,
            completedAt: completedAt,
            startedAt: startedAt
        )
    }

    static func category(_ id: String, name: String? = nil, hidden: Bool = false, sortOrder: Int = 0) -> TaskCategory {
        TaskCategory(id: id, name: name ?? id, color: "#000000", isDefault: true, isHidden: hidden, sortOrder: sortOrder)
    }

    /// The web tests' deterministic random numbers (a linear congruential
    /// generator), so the same seed gives the same sequence in both apps.
    static func lcg(_ seed: UInt64) -> () -> Double {
        var state = seed
        return {
            state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296
            return Double(state) / 4_294_967_296
        }
    }
}
