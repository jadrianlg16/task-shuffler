import UIKit
import UserNotifications

/// Notification plumbing: shows alerts while the app is open, and handles
/// taps on them and their buttons (Done, 5 more minutes, Pick for me).
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        Notifications.registerCategories()
        LibraryStore.shared.refreshAll()
        return true
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .list, .sound]
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let action = response.actionIdentifier
        let content = response.notification.request.content
        let category = content.categoryIdentifier
        let taskId = content.userInfo["taskId"] as? String
        await Notifications.handle(action: action, category: category, taskId: taskId)
    }
}
