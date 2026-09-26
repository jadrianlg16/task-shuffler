import Foundation

/// Tells the other processes (app, widgets) that the tasks file changed, so the
/// app can reload after a widget or Live Activity button changed it. A Darwin
/// notification carries no data; listeners re-read the file.
enum ChangeSignal {
    static let name = "dev.adriangaona.done.changed"

    static func post() {
        CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName(name as CFString),
            nil,
            nil,
            true
        )
    }
}

/// Calls `handler` on the main queue whenever `ChangeSignal.post()` runs in any
/// process. Stops when released.
final class ChangeObserver {
    private let handler: () -> Void

    init(handler: @escaping () -> Void) {
        self.handler = handler
        CFNotificationCenterAddObserver(
            CFNotificationCenterGetDarwinNotifyCenter(),
            Unmanaged.passUnretained(self).toOpaque(),
            { _, observer, _, _, _ in
                guard let observer else { return }
                let me = Unmanaged<ChangeObserver>.fromOpaque(observer).takeUnretainedValue()
                DispatchQueue.main.async { me.handler() }
            },
            ChangeSignal.name as CFString,
            nil,
            .deliverImmediately
        )
    }

    deinit {
        CFNotificationCenterRemoveObserver(
            CFNotificationCenterGetDarwinNotifyCenter(),
            Unmanaged.passUnretained(self).toOpaque(),
            CFNotificationName(ChangeSignal.name as CFString),
            nil
        )
    }
}
