import DoneCore
import Foundation
import Observation
import SwiftUI
import WidgetKit

/// A short message at the bottom of the screen, sometimes with Undo.
struct Toast: Identifiable, Equatable {
    let id = UUID()
    var message: String
    var undo: (() -> Void)?

    static func == (lhs: Toast, rhs: Toast) -> Bool { lhs.id == rhs.id }
}

/// The app's copy of the tasks and settings. Every change is saved straight
/// away; if saving fails, the change is undone on screen and you're told (the
/// web app's "safe saves"). After a change the widgets, Live Activity,
/// notifications and Spotlight are brought up to date.
@MainActor
@Observable
final class LibraryStore {
    static let shared = AppEnvironment.makeStore()

    private(set) var library = Library()
    private(set) var preferences = Preferences()
    var toast: Toast?
    /// Set when the saved tasks couldn't be read (a copy was kept).
    var loadProblem: String?

    @ObservationIgnored private let file: LibraryFile
    @ObservationIgnored private let preferencesStore: PreferencesStore
    @ObservationIgnored private var observer: ChangeObserver?

    init(file: LibraryFile, preferencesStore: PreferencesStore) {
        self.file = file
        self.preferencesStore = preferencesStore
        load()
        observer = ChangeObserver { [weak self] in
            self?.reloadFromDisk()
        }
    }

    // MARK: - Loading

    private func load() {
        do {
            library = try file.load() ?? Library()
        } catch {
            file.keepUnreadableCopy()
            library = Library()
            loadProblem = "Your saved tasks couldn't be read, so done. started fresh. A copy of the old file was kept in the app's folder."
        }
        preferences = preferencesStore.load()
        if preferences.firstUseAt == nil {
            updatePreferences { $0.firstUseAt = Date() }
        }
        Feedback.shared.configure(soundsOn: preferences.soundsOn, hapticsOn: preferences.hapticsOn)
    }

    /// Picks up changes made elsewhere (a widget button, Siri, a Focus filter).
    func reloadFromDisk() {
        let fresh = preferencesStore.load()
        if fresh != preferences { preferences = fresh }
        guard let saved = try? file.load(), saved != library else { return }
        library = saved
        refreshSystemViews(announce: false)
    }

    // MARK: - Saving

    /// Applies a change, saves it, and puts it back if saving fails.
    @discardableResult
    private func change(_ edit: (inout Library) -> Void) -> Bool {
        let before = library
        var next = library
        edit(&next)
        guard next != before else { return true }
        library = next
        do {
            try file.save(next)
        } catch {
            library = before
            toast = Toast(message: "Couldn't save that change. Try again.")
            return false
        }
        refreshSystemViews(announce: true)
        return true
    }

    /// Brings everything outside the app up to date, at launch.
    func refreshAll() {
        refreshSystemViews(announce: false)
        Notifications.syncDailyNudge(enabled: preferences.dailyNudge, minutesAfterMidnight: preferences.dailyNudgeMinutes)
    }

    /// Widgets, Live Activity, the time's-up notification and Spotlight follow the tasks.
    private func refreshSystemViews(announce: Bool) {
        WidgetCenter.shared.reloadAllTimelines()
        LiveActivities.sync(library: library, enabled: preferences.liveActivities)
        Notifications.syncTimesUp(current: library.current, enabled: preferences.timesUpAlerts)
        Spotlight.sync(library: library, enabled: preferences.spotlight)
        if announce { ChangeSignal.post() }
    }

    // MARK: - Tasks

    /// Adds a task from the quick-add line. Typed shorthand ("30m", "#school")
    /// wins over the minutes and category picked with the buttons.
    @discardableResult
    func quickAdd(_ line: String, minutes: Int?, categoryId: String) -> TaskItem? {
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let parsed = QuickAdd.parse(trimmed, categories: library.visibleCategories)
        return addTask(
            name: parsed.name,
            durationMinutes: parsed.durationMinutes ?? minutes,
            categoryId: parsed.categoryId ?? categoryId
        )
    }

    @discardableResult
    func addTask(name: String, durationMinutes: Int?, categoryId: String) -> TaskItem? {
        var added: TaskItem?
        change { added = $0.addTask(name: name, durationMinutes: durationMinutes, categoryId: categoryId) }
        if added != nil { Feedback.shared.play(.tap) }
        return added
    }

    func updateTask(id: String, name: String, durationMinutes: Int?, categoryId: String) {
        change { $0.updateTask(id: id, name: name, durationMinutes: durationMinutes, categoryId: categoryId) }
    }

    /// Archives a task, with Undo.
    func complete(_ id: String, showUndo: Bool = true) {
        var previous: TaskItem?
        guard change({ previous = $0.complete(id: id) }), let before = previous else { return }
        Feedback.shared.play(.done)
        if showUndo {
            toast = Toast(message: "Task done.") { [weak self] in
                self?.change { $0.replace(before) }
            }
        }
    }

    /// For Siri, widgets and notifications. Returns the finished task's name.
    @discardableResult
    func completeCurrent(showUndo: Bool = true) -> String? {
        guard let current = library.current else { return nil }
        complete(current.id, showUndo: showUndo)
        return current.name
    }

    func start(_ id: String) {
        guard change({ $0.start(id: id) }) else { return }
        Feedback.shared.play(.start)
    }

    func drop(_ id: String) {
        guard change({ $0.drop(id: id) }) else { return }
        Feedback.shared.play(.drop)
    }

    @discardableResult
    func dropCurrent() -> String? {
        guard let current = library.current else { return nil }
        drop(current.id)
        return current.name
    }

    func restore(_ id: String) {
        guard let task = library.task(id: id), change({ $0.restore(id: id) }) else { return }
        toast = Toast(message: "Restored “\(task.name)”.")
    }

    /// Removes a task for good, with Undo (the archive asks first instead).
    func delete(_ id: String, showUndo: Bool = true) {
        var deleted: (task: TaskItem, index: Int)?
        guard change({ deleted = $0.delete(id: id) }), let removed = deleted else { return }
        if showUndo {
            toast = Toast(message: "Deleted “\(removed.task.name)”.") { [weak self] in
                self?.change { $0.insert(removed.task, at: removed.index) }
            }
        }
    }

    func addExamples() {
        change { $0.addExamples() }
    }

    func clearExamples() {
        change { $0.clearExamples() }
        toast = Toast(message: "Examples cleared. Your own tasks are untouched.")
    }

    // MARK: - Categories

    func addCategory(name: String, color: String) {
        change { $0.addCategory(name: name, color: color) }
    }

    func updateCategory(id: String, name: String, color: String) {
        change { $0.updateCategory(id: id, name: name, color: color) }
    }

    func setHidden(_ hidden: Bool, categoryId: String) {
        change { $0.setHidden(hidden, categoryId: categoryId) }
    }

    func deleteCategory(id: String) {
        guard change({ $0.deleteCategory(id: id) }) else { return }
        toast = Toast(message: "Category deleted. Its tasks moved to Unassigned.")
    }

    /// Reorders from a List's move gesture (positions in the sorted list).
    func moveCategories(from source: IndexSet, to destination: Int) {
        var ids = library.sortedCategories.map(\.id)
        ids.move(fromOffsets: source, toOffset: destination)
        change { $0.reorderCategories(ids) }
    }

    // MARK: - Backup

    func backupData() throws -> Data {
        try library.backup.jsonData()
    }

    func recordBackup() {
        updatePreferences {
            $0.lastBackupAt = Date()
            $0.backupSnoozedUntil = nil
        }
    }

    func snoozeBackupReminder() {
        updatePreferences { $0.backupSnoozedUntil = Date().addingTimeInterval(BackupReminder.snooze) }
    }

    var shouldRemindBackup: Bool {
        BackupReminder.shouldRemind(
            ownTaskCount: library.ownTaskCount,
            firstUseAt: preferences.firstUseAt ?? Date(),
            lastBackupAt: preferences.lastBackupAt,
            snoozedUntil: preferences.backupSnoozedUntil
        )
    }

    /// Replaces everything with an imported backup.
    @discardableResult
    func replaceAll(with backup: Backup) -> Bool {
        let ok = change { $0 = Library(backup) }
        if ok { toast = Toast(message: "Imported \(backup.activities.count) task\(backup.activities.count == 1 ? "" : "s").") }
        return ok
    }

    // MARK: - Picker

    /// The picker's categories, remembered, cleaned up and narrowed by Focus.
    var pickerCategoryIds: [String] { preferences.effectiveCategoryIds(in: library) }

    var candidates: [TaskItem] {
        Shuffle.candidates(
            library.tasks,
            categoryIds: pickerCategoryIds,
            timeFilter: preferences.shuffleTimeFilter,
            categories: library.categories
        )
    }

    var loosening: Loosening? {
        candidates.isEmpty
            ? Shuffle.suggestLoosening(library.tasks, categoryIds: pickerCategoryIds, timeFilter: preferences.shuffleTimeFilter, categories: library.categories)
            : nil
    }

    func toggleShuffleCategory(_ id: String) {
        var ids = pickerCategoryIds
        if let index = ids.firstIndex(of: id) { ids.remove(at: index) } else { ids.append(id) }
        updatePreferences { $0.shuffleCategoryIds = ids }
    }

    // MARK: - Preferences

    func updatePreferences(_ edit: (inout Preferences) -> Void) {
        let before = preferences
        var next = preferences
        edit(&next)
        guard next != before else { return }
        preferences = next
        preferencesStore.save(next)
        Feedback.shared.configure(soundsOn: next.soundsOn, hapticsOn: next.hapticsOn)
        if next.liveActivities != before.liveActivities {
            LiveActivities.sync(library: library, enabled: next.liveActivities)
        }
        if next.timesUpAlerts != before.timesUpAlerts {
            Notifications.syncTimesUp(current: library.current, enabled: next.timesUpAlerts)
        }
        if next.dailyNudge != before.dailyNudge || next.dailyNudgeMinutes != before.dailyNudgeMinutes {
            Notifications.syncDailyNudge(enabled: next.dailyNudge, minutesAfterMidnight: next.dailyNudgeMinutes)
        }
        if next.spotlight != before.spotlight {
            Spotlight.sync(library: library, enabled: next.spotlight)
        }
        if next.focusCategoryIds != before.focusCategoryIds || next.shuffleCategoryIds != before.shuffleCategoryIds {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    /// A two-way binding to one preference, for toggles and pickers.
    func binding<Value>(_ keyPath: WritableKeyPath<Preferences, Value>) -> Binding<Value> {
        Binding(
            get: { self.preferences[keyPath: keyPath] },
            set: { newValue in self.updatePreferences { $0[keyPath: keyPath] = newValue } }
        )
    }

    /// What a widget or control asked for while the app was closed.
    func takePendingAction() -> PendingAction? {
        guard let action = preferencesStore.load().pendingAction else { return nil }
        preferencesStore.update { $0.pendingAction = nil }
        preferences.pendingAction = nil
        return action
    }

    func applyFocus(categoryIds: [String]?) {
        updatePreferences { $0.focusCategoryIds = categoryIds.flatMap { $0.isEmpty ? nil : $0 } }
    }
}

/// Where the store keeps its data: the shared App Group normally, a scratch
/// folder under UI tests (`-ui-testing`; `DONE_RESET=1` starts it empty).
enum AppEnvironment {
    static var isUITesting: Bool { ProcessInfo.processInfo.arguments.contains("-ui-testing") }

    @MainActor
    static func makeStore() -> LibraryStore {
        guard isUITesting else { return LibraryStore(file: .shared, preferencesStore: .shared) }
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("ui-testing", isDirectory: true)
        let suite = "done-ui-testing"
        let defaults = UserDefaults(suiteName: suite) ?? .standard
        let preferences = PreferencesStore(defaults: defaults)
        if ProcessInfo.processInfo.environment["DONE_RESET"] == "1" {
            try? FileManager.default.removeItem(at: folder)
            defaults.removePersistentDomain(forName: suite)
            // No permission prompts in the middle of a test.
            preferences.update {
                $0.timesUpAlerts = false
                $0.liveActivities = false
                $0.spotlight = false
            }
        }
        return LibraryStore(
            file: LibraryFile(url: folder.appendingPathComponent("tasks.json")),
            preferencesStore: preferences
        )
    }
}
