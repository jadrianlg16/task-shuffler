import ActivityKit
import DoneCore
import Foundation

/// Keeps one Live Activity in step with the task in progress: started with
/// it, updated if it changes, ended when it's done or dropped.
@MainActor
enum LiveActivities {
    static func sync(library: Library, enabled: Bool) {
        let running = Activity<NowActivityAttributes>.activities
        guard enabled,
              ActivityAuthorizationInfo().areActivitiesEnabled,
              let task = library.current,
              let startedAt = task.startedAt.flatMap({ DoneDate.date(from: $0) })
        else {
            end(running)
            return
        }

        let category = library.category(id: task.categoryId)
        let state = NowActivityAttributes.ContentState(
            taskName: task.name,
            startedAt: startedAt,
            durationMinutes: task.durationMinutes,
            categoryName: category?.name ?? "",
            categoryColor: category?.color ?? "#6B7280"
        )
        let content = ActivityContent(state: state, staleDate: nil)

        var kept = false
        for activity in running {
            if activity.attributes.taskId == task.id && !kept {
                kept = true
                if activity.content.state != state {
                    Task { await activity.update(content) }
                }
            } else {
                end([activity])
            }
        }
        if !kept {
            _ = try? Activity<NowActivityAttributes>.request(
                attributes: NowActivityAttributes(taskId: task.id),
                content: content,
                pushType: nil
            )
        }
    }

    private static func end(_ activities: [Activity<NowActivityAttributes>]) {
        for activity in activities {
            Task { await activity.end(nil, dismissalPolicy: .immediate) }
        }
    }
}
