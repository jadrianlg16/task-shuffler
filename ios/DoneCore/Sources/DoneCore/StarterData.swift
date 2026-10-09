import Foundation

extension TaskCategory {
    /// The category that can't be deleted; tasks from deleted categories move here.
    public static let unassignedId = "unassigned"

    /// The categories a new install starts with (src/data/defaultCategories.ts).
    public static let defaults: [TaskCategory] = [
        TaskCategory(id: "school", name: "School", color: "#3B82F6", isDefault: true, sortOrder: 0),
        TaskCategory(id: "personal", name: "Personal", color: "#8B5CF6", isDefault: true, sortOrder: 1),
        TaskCategory(id: "business", name: "Business", color: "#F59E0B", isDefault: true, sortOrder: 2),
        TaskCategory(id: "hobby", name: "Hobby", color: "#10B981", isDefault: true, sortOrder: 3),
        TaskCategory(id: "field", name: "Field", color: "#EF4444", isDefault: true, sortOrder: 4),
        TaskCategory(id: unassignedId, name: "Unassigned", color: "#6B7280", isDefault: true, sortOrder: 5),
    ]
}

/// Example tasks for trying the app (src/data/exampleTasks.ts). Their ids share
/// a prefix so they can be found and cleared without touching real tasks.
public enum ExampleTasks {
    /// "demo-" matches what the web app stores, so its examples are recognised too.
    public static let idPrefix = "demo-"

    public static func isExample(_ task: TaskItem) -> Bool {
        isExample(id: task.id)
    }

    public static func isExample(id: String) -> Bool {
        id.hasPrefix(idPrefix)
    }

    private static let examples: [(name: String, minutes: Int?, categoryId: String)] = [
        ("Study for calculus exam", 90, "school"),
        ("Morning run", 45, "personal"),
        ("Prepare client proposal", 40, "business"),
        ("Practice guitar", 25, "hobby"),
        ("Read 20 pages", 30, "personal"),
        ("Refactor side project", 120, "hobby"),
        ("Plan next week", 30, "business"),
        ("Water the plants", 10, "personal"),
        ("Sketch app wireframes", nil, "hobby"),
        ("Review lecture notes", 60, "school"),
    ]

    /// Fresh copies, created an hour apart so the list has a natural order.
    public static func make(now: Date = Date()) -> [TaskItem] {
        let nowMs = DoneDate.milliseconds(from: now)
        return examples.enumerated().map { index, example in
            let number = index + 1
            return TaskItem(
                id: idPrefix + (number < 10 ? "0\(number)" : "\(number)"),
                name: example.name,
                durationMinutes: example.minutes,
                categoryId: example.categoryId,
                createdAt: DoneDate.string(fromMilliseconds: nowMs - Int64(number) * 3_600_000)
            )
        }
    }
}

/// When to remind someone to save a backup (src/lib/safety.ts). An iPhone's own
/// backups include the app's data, so this matters less than on the web, but a
/// file you can keep or move still does.
public enum BackupReminder {
    /// Below this many of your own tasks there's nothing worth backing up yet.
    public static let minimumTasks = 5
    /// First reminder once the app has been in use this long without a backup.
    static let firstReminderAfter: Int64 = 7 * 86_400_000
    /// Later reminders once the last backup is this old.
    static let remindEvery: Int64 = 30 * 86_400_000
    /// How long "Later" puts it off.
    public static let snooze: TimeInterval = 7 * 86_400

    /// First after a week of use, then monthly; a snooze wins until it runs out.
    public static func shouldRemind(
        ownTaskCount: Int,
        firstUseAt: Date,
        lastBackupAt: Date?,
        snoozedUntil: Date?,
        now: Date = Date()
    ) -> Bool {
        if ownTaskCount < minimumTasks { return false }
        let nowMs = DoneDate.milliseconds(from: now)
        if let snoozedUntil, nowMs < DoneDate.milliseconds(from: snoozedUntil) { return false }
        if let lastBackupAt {
            return nowMs - DoneDate.milliseconds(from: lastBackupAt) >= remindEvery
        }
        return nowMs - DoneDate.milliseconds(from: firstUseAt) >= firstReminderAfter
    }
}
