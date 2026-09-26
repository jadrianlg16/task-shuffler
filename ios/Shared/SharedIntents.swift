import AppIntents
import DoneCore
import WidgetKit

// Intents used by widget, Live Activity and Control Center buttons. These files
// are compiled into both the app and the widget extension (WIDGET_EXTENSION is
// set there). Done and Drop are Live Activity intents, so the system runs them
// in the app's process, where they go through the app's store; the widget copy
// falls back to changing the file directly.

/// Marks the task you're doing now as done.
struct CompleteNowIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Finish Current Task"
    static var description = IntentDescription("Marks the task you're doing now as done.")

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let name = try TaskActions.completeCurrent() else {
            return .result(dialog: "You're not doing a task right now.")
        }
        return .result(dialog: "Done: \(name).")
    }
}

/// Stops the task you're doing now without finishing it.
struct DropNowIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Drop Current Task"
    static var description = IntentDescription("Stops the task you're doing now and puts it back in the pool.")

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let name = try TaskActions.dropCurrent() else {
            return .result(dialog: "You're not doing a task right now.")
        }
        return .result(dialog: "Put back: \(name).")
    }
}

/// Opens the app and shuffles. Used by the widgets and the Control Center button.
struct OpenShuffleIntent: AppIntent {
    static let title: LocalizedStringResource = "Pick for Me"
    static var description = IntentDescription("Opens done. and picks a task for you.")
    static let openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        TaskActions.requestShuffle()
        return .result()
    }
}

/// The data changes behind the shared intents.
enum TaskActions {
    /// Finishes the current task. Returns its name, or nil when nothing was in progress.
    @MainActor
    static func completeCurrent() throws -> String? {
        #if WIDGET_EXTENSION
        var name: String?
        try LibraryFile.shared.update { library in
            guard let current = library.current else { return }
            name = current.name
            library.complete(id: current.id)
        }
        afterFileChange()
        return name
        #else
        return LibraryStore.shared.completeCurrent(showUndo: false)
        #endif
    }

    /// Drops the current task. Returns its name, or nil when nothing was in progress.
    @MainActor
    static func dropCurrent() throws -> String? {
        #if WIDGET_EXTENSION
        var name: String?
        try LibraryFile.shared.update { library in
            guard let current = library.current else { return }
            name = current.name
            library.drop(id: current.id)
        }
        afterFileChange()
        return name
        #else
        return LibraryStore.shared.dropCurrent()
        #endif
    }

    /// Asks the app to open the picker (now if it's running, else when it opens).
    @MainActor
    static func requestShuffle() {
        #if WIDGET_EXTENSION
        PreferencesStore.shared.update { $0.pendingAction = .shuffle }
        #else
        Router.shared.perform(.shuffle)
        #endif
    }

    private static func afterFileChange() {
        ChangeSignal.post()
        WidgetCenter.shared.reloadAllTimelines()
    }
}
