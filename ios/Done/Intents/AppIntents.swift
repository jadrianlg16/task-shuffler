import AppIntents
import DoneCore

// Siri, Shortcuts and Spotlight actions. These run in the app's process and go
// through the app's store, so the screen, widgets and Live Activity update too.
// (Finish / Drop / Pick for Me live in Shared/SharedIntents.swift, because the
// widgets use them as well.)

/// A task, as Siri and Shortcuts see it.
struct TaskEntity: AppEntity {
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Task"
    static let defaultQuery = TaskQuery()

    let id: String
    let name: String
    let minutes: Int?

    init(_ task: TaskItem) {
        id = task.id
        name = task.name
        minutes = task.durationMinutes
    }

    var displayRepresentation: DisplayRepresentation {
        if let minutes {
            return DisplayRepresentation(title: "\(name)", subtitle: "\(minutes) min")
        }
        return DisplayRepresentation(title: "\(name)")
    }
}

struct TaskQuery: EntityStringQuery {
    func entities(for identifiers: [String]) async throws -> [TaskEntity] {
        let library = await currentLibrary()
        return identifiers.compactMap { library.task(id: $0) }.map { TaskEntity($0) }
    }

    func entities(matching string: String) async throws -> [TaskEntity] {
        await currentLibrary().listTasks(search: string).map { TaskEntity($0) }
    }

    func suggestedEntities() async throws -> [TaskEntity] {
        await currentLibrary().listTasks().map { TaskEntity($0) }
    }
}

/// A category, as Siri and Shortcuts see it.
struct CategoryEntity: AppEntity {
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Category"
    static let defaultQuery = CategoryQuery()

    let id: String
    let name: String

    init(_ category: TaskCategory) {
        id = category.id
        name = category.name
    }

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

struct CategoryQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [CategoryEntity] {
        let library = await currentLibrary()
        return identifiers.compactMap { library.category(id: $0) }.map { CategoryEntity($0) }
    }

    func suggestedEntities() async throws -> [CategoryEntity] {
        await currentLibrary().visibleCategories.map { CategoryEntity($0) }
    }
}

/// The tasks as saved, including anything a widget changed while the app slept.
@MainActor
private func currentLibrary() -> Library {
    LibraryStore.shared.reloadFromDisk()
    return LibraryStore.shared.library
}

enum DoneIntentError: Error, CustomLocalizedStringResourceConvertible {
    case nothingToPick
    case emptyName
    case taskNotFound

    var localizedStringResource: LocalizedStringResource {
        switch self {
        case .nothingToPick: "Nothing fits right now. Add a task, or allow more time."
        case .emptyName: "The task needs a name."
        case .taskNotFound: "That task isn't in your list any more."
        }
    }
}

/// "Pick a task": a weighted pick from the tasks that fit.
struct PickTaskIntent: AppIntent {
    static let title: LocalizedStringResource = "Pick a Task"
    static var description = IntentDescription("Picks a task that fits the time you have. Older tasks come up a little more often.")

    @Parameter(title: "Minutes available")
    var minutes: Int?

    @Parameter(title: "Category")
    var category: CategoryEntity?

    @MainActor
    func perform() async throws -> some IntentResult & ReturnsValue<TaskEntity> & ProvidesDialog {
        let store = LibraryStore.shared
        var filter = TimeFilter.anyLength
        if let minutes, minutes > 0 {
            filter = TimeFilter(mode: .max, value: minutes, includeNoDuration: true)
        }
        let categoryIds = category.map { [$0.id] } ?? store.pickerCategoryIds
        let pool = Shuffle.candidates(store.library.tasks, categoryIds: categoryIds, timeFilter: filter, categories: store.library.categories)
        guard let task = Shuffle.select(pool) else { throw DoneIntentError.nothingToPick }
        let detail = task.durationMinutes.map { " (\($0) min)" } ?? ""
        return .result(value: TaskEntity(task), dialog: "How about “\(task.name)”\(detail)?")
    }
}

/// "Add a task", with the same shorthand as the quick-add field.
struct AddTaskIntent: AppIntent {
    static let title: LocalizedStringResource = "Add a Task"
    static var description = IntentDescription("Adds a task. The name can carry the time and category too, like “Call mom 15m #personal”.")

    @Parameter(title: "Task", requestValueDialog: "What's the task?")
    var name: String

    @Parameter(title: "Minutes")
    var minutes: Int?

    @Parameter(title: "Category")
    var category: CategoryEntity?

    @MainActor
    func perform() async throws -> some IntentResult & ReturnsValue<TaskEntity> & ProvidesDialog {
        let categoryId = category?.id ?? TaskCategory.unassignedId
        guard let task = LibraryStore.shared.quickAdd(name, minutes: minutes, categoryId: categoryId) else {
            throw DoneIntentError.emptyName
        }
        return .result(value: TaskEntity(task), dialog: "Added “\(task.name)”.")
    }
}

/// "Start a task": makes it the one you're doing now (and starts its Live Activity).
struct StartTaskIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Start a Task"
    static var description = IntentDescription("Starts a task: it shows on the Lock Screen with a timer until you finish or drop it.")

    @Parameter(title: "Task")
    var task: TaskEntity

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let store = LibraryStore.shared
        guard store.library.task(id: task.id)?.status == .active else { throw DoneIntentError.taskNotFound }
        store.start(task.id)
        return .result(dialog: "Started “\(task.name)”.")
    }
}

/// The phrases Siri knows without any setup.
struct DoneShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: PickTaskIntent(),
            phrases: [
                "Pick a task in \(.applicationName)",
                "What should I do in \(.applicationName)",
                "Shuffle my tasks in \(.applicationName)",
            ],
            shortTitle: "Pick a Task",
            systemImageName: "shuffle"
        )
        AppShortcut(
            intent: AddTaskIntent(),
            phrases: [
                "Add a task to \(.applicationName)",
                "Add a task in \(.applicationName)",
            ],
            shortTitle: "Add a Task",
            systemImageName: "plus.circle"
        )
        AppShortcut(
            intent: CompleteNowIntent(),
            phrases: [
                "I'm done in \(.applicationName)",
                "Finish my task in \(.applicationName)",
            ],
            shortTitle: "Finish Current Task",
            systemImageName: "checkmark.circle"
        )
        AppShortcut(
            intent: DropNowIntent(),
            phrases: ["Drop my task in \(.applicationName)"],
            shortTitle: "Drop Current Task",
            systemImageName: "arrow.uturn.backward.circle"
        )
    }
}

/// Focus filter: while a Focus is on (Work, say), the picker and list only use
/// the categories you chose for it.
struct DoneFocusFilter: SetFocusFilterIntent {
    static let title: LocalizedStringResource = "Set Task Categories"
    static var description = IntentDescription("While this Focus is on, done. only shows and picks tasks from these categories.")

    @Parameter(title: "Categories")
    var categories: [CategoryEntity]?

    var displayRepresentation: DisplayRepresentation {
        let names = (categories ?? []).map(\.name)
        let title = names.isEmpty ? "All categories" : names.joined(separator: ", ")
        return DisplayRepresentation(title: "\(title)")
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        LibraryStore.shared.applyFocus(categoryIds: categories?.map(\.id))
        return .result()
    }
}
