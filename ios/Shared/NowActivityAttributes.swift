import ActivityKit
import Foundation

/// The Live Activity for the task you're doing now: on the Lock Screen and in
/// the Dynamic Island, with the elapsed time and Done / Drop buttons.
struct NowActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var taskName: String
        var startedAt: Date
        var durationMinutes: Int?
        var categoryName: String
        var categoryColor: String

        /// When the estimate runs out (nil without one).
        var endsAt: Date? {
            durationMinutes.map { startedAt.addingTimeInterval(Double($0) * 60) }
        }
    }

    var taskId: String
}
