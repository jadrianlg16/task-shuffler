import DoneCore
import Foundation
import UserNotifications

/// Local notifications: "time's up" when a started task reaches its estimate
/// (with Done and 5-more-minutes buttons), and an optional daily nudge. Nothing
/// leaves the phone; there is no push server.
@MainActor
enum Notifications {
    static let timesUpId = "times-up"
    static let nudgeId = "daily-nudge"

    enum Category: String {
        case timesUp = "TIMES_UP"
        case nudge = "NUDGE"
    }

    enum Action: String {
        case done = "DONE"
        case extend = "EXTEND"
        case pick = "PICK"
    }

    static func registerCategories() {
        let done = UNNotificationAction(identifier: Action.done.rawValue, title: "Done", options: [])
        let extend = UNNotificationAction(identifier: Action.extend.rawValue, title: "5 more minutes", options: [])
        let pick = UNNotificationAction(identifier: Action.pick.rawValue, title: "Pick for me", options: [.foreground])
        UNUserNotificationCenter.current().setNotificationCategories([
            UNNotificationCategory(identifier: Category.timesUp.rawValue, actions: [done, extend], intentIdentifiers: [], options: []),
            UNNotificationCategory(identifier: Category.nudge.rawValue, actions: [pick], intentIdentifiers: [], options: []),
        ])
    }

    /// Asks once (the system remembers the answer). True when notifications may show.
    static func requestPermission() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return true
        case .notDetermined:
            return (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        default:
            return false
        }
    }

    /// Keeps the one "time's up" notification in step with the task in progress.
    static func syncTimesUp(current: TaskItem?, enabled: Bool) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [timesUpId])
        guard enabled, let task = current, let end = NowStatus.endDate(for: task), end > Date() else { return }
        Task {
            guard await requestPermission() else { return }
            await scheduleTimesUp(for: task, at: end, again: false)
        }
    }

    static func scheduleTimesUp(for task: TaskItem, at date: Date, again: Bool) async {
        let content = UNMutableNotificationContent()
        content.title = again ? "Still going?" : "Time's up"
        content.body = task.durationMinutes.map { "\(task.name) · \(minutesText($0))" } ?? task.name
        content.sound = UNNotificationSound(named: UNNotificationSoundName("done.wav"))
        content.categoryIdentifier = Category.timesUp.rawValue
        content.userInfo = ["taskId": task.id]
        content.interruptionLevel = .active
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, date.timeIntervalSinceNow), repeats: false)
        let request = UNNotificationRequest(identifier: timesUpId, content: content, trigger: trigger)
        try? await UNUserNotificationCenter.current().add(request)
    }

    /// The daily "got a few minutes?" nudge, at a time you choose.
    static func syncDailyNudge(enabled: Bool, minutesAfterMidnight: Int) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [nudgeId])
        guard enabled else { return }
        Task {
            guard await requestPermission() else { return }
            let content = UNMutableNotificationContent()
            content.title = "Got a few minutes?"
            content.body = "Let done. pick something for you."
            content.sound = .default
            content.categoryIdentifier = Category.nudge.rawValue
            var time = DateComponents()
            time.hour = minutesAfterMidnight / 60
            time.minute = minutesAfterMidnight % 60
            let trigger = UNCalendarNotificationTrigger(dateMatching: time, repeats: true)
            try? await UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: nudgeId, content: content, trigger: trigger))
        }
    }

    /// A tap on a notification or one of its buttons.
    static func handle(action: String, category: String, taskId: String?) async {
        let store = LibraryStore.shared
        if category == Category.timesUp.rawValue {
            if action == Action.done.rawValue, let taskId {
                store.complete(taskId, showUndo: false)
            } else if action == Action.extend.rawValue, let taskId, let task = store.library.task(id: taskId), task.isStarted {
                await scheduleTimesUp(for: task, at: Date().addingTimeInterval(5 * 60), again: true)
            }
        } else if category == Category.nudge.rawValue {
            if action == Action.pick.rawValue || action == UNNotificationDefaultActionIdentifier {
                Router.shared.perform(.shuffle)
            }
        }
    }
}
