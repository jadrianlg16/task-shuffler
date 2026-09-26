import DoneCore
import Foundation
import Observation

/// One round of the shuffle: what it draws from, and what it landed on.
struct ShuffleRequest: Identifiable, Equatable {
    let id = UUID()
    var candidates: [TaskItem]
    var winner: TaskItem
    /// Picked by hand from the list: no reel, no "shuffle again".
    var isManual = false
}

/// Which sheet is open, and requests from outside the view tree (deep links,
/// widgets, notifications, keyboard shortcuts).
@MainActor
@Observable
final class Router {
    static let shared = Router()

    enum Sheet: Identifiable, Equatable {
        case shuffle(ShuffleRequest)
        case edit(taskId: String)
        case archive
        case settings

        var id: String {
            switch self {
            case .shuffle(let request): "shuffle-\(request.id.uuidString)"
            case .edit(let taskId): "edit-\(taskId)"
            case .archive: "archive"
            case .settings: "settings"
            }
        }
    }

    var sheet: Sheet?
    /// Bumped to put the cursor in "Add a task".
    var focusQuickAdd = 0
    /// Bumped to open search (⌘F).
    var focusSearch = 0

    /// Shuffle now: opens the picker's result with a weighted pick, or says why
    /// there's nothing to pick from.
    func shuffle(store: LibraryStore = .shared) {
        let pool = store.candidates
        guard let winner = Shuffle.select(pool) else {
            store.toast = Toast(message: store.library.activeTasks.isEmpty
                ? "No tasks yet. Add one first."
                : "Nothing fits the picker right now.")
            return
        }
        Feedback.shared.prepare()
        sheet = .shuffle(ShuffleRequest(candidates: pool, winner: winner))
    }

    /// "Start this one": the result card for a task chosen by hand.
    func pick(_ task: TaskItem) {
        sheet = .shuffle(ShuffleRequest(candidates: [task], winner: task, isManual: true))
    }

    func perform(_ action: PendingAction) {
        switch action {
        case .shuffle:
            sheet = nil
            shuffle()
        case .addTask:
            sheet = nil
            focusQuickAdd += 1
        }
    }

    /// done://shuffle, done://add, done://task/<id>, done://archive, done://settings
    func open(_ url: URL) {
        guard url.scheme == "done" else { return }
        switch url.host {
        case "shuffle": perform(.shuffle)
        case "add": perform(.addTask)
        case "archive": sheet = .archive
        case "settings": sheet = .settings
        case "task":
            openTask(url.pathComponents.dropFirst().first ?? "")
        default: break
        }
    }

    /// Opens a task's editor, if it still exists (a Spotlight result or widget
    /// link can outlive the task).
    func openTask(_ id: String) {
        guard LibraryStore.shared.library.task(id: id) != nil else { return }
        sheet = .edit(taskId: id)
    }
}
