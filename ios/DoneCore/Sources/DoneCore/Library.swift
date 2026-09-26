import Foundation

/// Everything the app stores: tasks and categories. Saved in the backup format
/// (`{ "activities": [...], "categories": [...] }`), so the app's own file is a
/// valid backup too. The changes below are the web app's store actions
/// (src/store/activityStore.ts and categoryStore.ts), in one place so the app,
/// its widgets and Siri all change data the same way.
public struct Library: Codable, Equatable, Sendable {
    public var tasks: [TaskItem]
    public var categories: [TaskCategory]

    private enum CodingKeys: String, CodingKey {
        case tasks = "activities"
        case categories
    }

    public init(tasks: [TaskItem] = [], categories: [TaskCategory] = TaskCategory.defaults) {
        self.tasks = tasks
        self.categories = categories
    }

    public init(_ backup: Backup) {
        self.init(tasks: backup.activities, categories: backup.categories)
    }

    public var backup: Backup { Backup(activities: tasks, categories: categories) }

    // MARK: - Reading

    /// The task you're doing now, if any.
    public var current: TaskItem? {
        tasks.first { $0.status == .active && $0.isStarted }
    }

    public var activeTasks: [TaskItem] { tasks.filter { $0.status == .active } }

    public var archivedTasks: [TaskItem] { tasks.filter { $0.status == .archived } }

    /// All categories in the user's order.
    public var sortedCategories: [TaskCategory] {
        categories.enumerated()
            .sorted { $0.element.sortOrder != $1.element.sortOrder ? $0.element.sortOrder < $1.element.sortOrder : $0.offset < $1.offset }
            .map(\.element)
    }

    /// Categories that aren't hidden, in the user's order.
    public var visibleCategories: [TaskCategory] { sortedCategories.filter { !$0.isHidden } }

    public func category(id: String) -> TaskCategory? { categories.first { $0.id == id } }

    public func task(id: String) -> TaskItem? { tasks.first { $0.id == id } }

    /// Tasks you added yourself (not the examples).
    public var ownTaskCount: Int { tasks.filter { !ExampleTasks.isExample($0) }.count }

    public var exampleCount: Int { tasks.filter { ExampleTasks.isExample($0) }.count }

    /// Tasks finished on `now`'s calendar day.
    public func doneToday(now: Date = Date(), calendar: Calendar = .current) -> Int {
        archivedTasks.filter { task in
            guard let completed = task.completedAt.flatMap({ DoneDate.date(from: $0) }) else { return false }
            return calendar.isDate(completed, inSameDayAs: now)
        }.count
    }

    /// The list view: active tasks in visible categories, searched and sorted.
    public func listTasks(search: String = "", sortBy: SortBy = .date, locale: Locale = .current) -> [TaskItem] {
        let hidden = Set(categories.filter(\.isHidden).map(\.id))
        let visible = activeTasks.filter { !hidden.contains($0.categoryId) }
        return Filters.sorted(Filters.bySearch(visible, search), by: sortBy, categories: categories, locale: locale)
    }

    // MARK: - Tasks

    /// Adds a task at the top of the list. An unknown category becomes Unassigned.
    @discardableResult
    public mutating func addTask(
        name: String,
        durationMinutes: Int?,
        categoryId: String,
        id: String = UUID().uuidString.lowercased(),
        now: Date = Date()
    ) -> TaskItem {
        let task = TaskItem(
            id: id,
            name: name,
            durationMinutes: durationMinutes.flatMap { $0 > 0 ? $0 : nil },
            categoryId: category(id: categoryId) == nil ? TaskCategory.unassignedId : categoryId,
            createdAt: DoneDate.string(from: now)
        )
        tasks.insert(task, at: 0)
        return task
    }

    /// Changes a task's name, estimate and category. A blank name is ignored.
    public mutating func updateTask(id: String, name: String, durationMinutes: Int?, categoryId: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let index = tasks.firstIndex(where: { $0.id == id }), !trimmed.isEmpty else { return }
        tasks[index].name = trimmed
        tasks[index].durationMinutes = durationMinutes.flatMap { $0 > 0 ? $0 : nil }
        if category(id: categoryId) != nil { tasks[index].categoryId = categoryId }
    }

    /// Puts a task back exactly as it was (for Undo).
    public mutating func replace(_ task: TaskItem) {
        if let index = tasks.firstIndex(where: { $0.id == task.id }) {
            tasks[index] = task
        } else {
            tasks.insert(task, at: 0)
        }
    }

    /// Archives a task. Returns it as it was before, for Undo.
    @discardableResult
    public mutating func complete(id: String, now: Date = Date()) -> TaskItem? {
        guard let index = tasks.firstIndex(where: { $0.id == id }) else { return nil }
        let before = tasks[index]
        tasks[index].status = .archived
        tasks[index].completedAt = DoneDate.string(from: now)
        return before
    }

    /// Back to the active list, not in progress.
    public mutating func restore(id: String) {
        guard let index = tasks.firstIndex(where: { $0.id == id }) else { return }
        tasks[index].status = .active
        tasks[index].completedAt = nil
        tasks[index].startedAt = nil
    }

    /// Makes this the task you're doing now; any other one in progress is dropped.
    public mutating func start(id: String, now: Date = Date()) {
        guard tasks.contains(where: { $0.id == id }) else { return }
        for index in tasks.indices where tasks[index].id != id && tasks[index].status == .active && tasks[index].isStarted {
            tasks[index].startedAt = nil
        }
        if let index = tasks.firstIndex(where: { $0.id == id }) {
            tasks[index].startedAt = DoneDate.string(from: now)
        }
    }

    /// Stops doing it without finishing; it goes back to the pool.
    public mutating func drop(id: String) {
        guard let index = tasks.firstIndex(where: { $0.id == id }) else { return }
        tasks[index].startedAt = nil
    }

    /// Removes a task for good. Returns it and where it was, for Undo.
    @discardableResult
    public mutating func delete(id: String) -> (task: TaskItem, index: Int)? {
        guard let index = tasks.firstIndex(where: { $0.id == id }) else { return nil }
        return (tasks.remove(at: index), index)
    }

    public mutating func insert(_ task: TaskItem, at index: Int) {
        tasks.insert(task, at: min(max(0, index), tasks.count))
    }

    /// Adds the example tasks, skipping any already there.
    public mutating func addExamples(now: Date = Date()) {
        let existing = Set(tasks.map(\.id))
        tasks.append(contentsOf: ExampleTasks.make(now: now).filter { !existing.contains($0.id) })
    }

    /// Removes every example task, leaving the user's own alone.
    public mutating func clearExamples() {
        tasks.removeAll { ExampleTasks.isExample($0) }
    }

    // MARK: - Categories

    @discardableResult
    public mutating func addCategory(name: String, color: String, id: String = UUID().uuidString.lowercased()) -> TaskCategory {
        let category = TaskCategory(
            id: id,
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            color: color,
            sortOrder: categories.count
        )
        categories.append(category)
        return category
    }

    public mutating func updateCategory(id: String, name: String, color: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let index = categories.firstIndex(where: { $0.id == id }), !trimmed.isEmpty else { return }
        categories[index].name = trimmed
        categories[index].color = color
    }

    public mutating func setHidden(_ hidden: Bool, categoryId: String) {
        guard let index = categories.firstIndex(where: { $0.id == categoryId }) else { return }
        categories[index].isHidden = hidden
    }

    /// Deletes a category you added (the starting ones stay). Its tasks move to Unassigned.
    public mutating func deleteCategory(id: String) {
        guard let target = categories.first(where: { $0.id == id }), !target.isDefault, id != TaskCategory.unassignedId else { return }
        for index in tasks.indices where tasks[index].categoryId == id {
            tasks[index].categoryId = TaskCategory.unassignedId
        }
        categories.removeAll { $0.id == id }
    }

    /// Sets the order to `ids` (sortOrder = position). Ids not listed keep their place after them.
    public mutating func reorderCategories(_ ids: [String]) {
        let listed = ids.filter { id in categories.contains { $0.id == id } }
        let rest = sortedCategories.map(\.id).filter { !listed.contains($0) }
        for (position, id) in (listed + rest).enumerated() {
            if let index = categories.firstIndex(where: { $0.id == id }) {
                categories[index].sortOrder = position
            }
        }
    }
}

/// The colours offered for categories (the web app's ColorPicker).
public enum CategoryColors {
    public static let presets = [
        "#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#6B7280",
        "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16", "#06B6D4",
        "#D946EF", "#A855F7", "#0EA5E9", "#F43F5E",
    ]
}

/// The Now card's progress line (src/components/shuffle/NowCard.tsx).
public enum NowStatus {
    /// Whole minutes since `startedAt`, never negative.
    public static func elapsedMinutes(since startedAt: String, now: Date = Date()) -> Int {
        guard let start = DoneDate.milliseconds(from: startedAt) else { return 0 }
        return max(0, Int((DoneDate.milliseconds(from: now) - start) / 60_000))
    }

    /// "Just started", "12 of 25 min", "5 min over" or "12 min in".
    public static func text(for task: TaskItem, now: Date = Date()) -> String {
        guard let startedAt = task.startedAt else { return "" }
        let elapsed = elapsedMinutes(since: startedAt, now: now)
        if elapsed == 0 { return "Just started" }
        guard let planned = task.durationMinutes else { return "\(elapsed) min in" }
        let over = elapsed - planned
        return over > 0 ? "\(over) min over" : "\(elapsed) of \(planned) min"
    }

    /// Share of the estimate used, 0...1 (nil without an estimate).
    public static func progress(for task: TaskItem, now: Date = Date()) -> Double? {
        guard let startedAt = task.startedAt, let planned = task.durationMinutes, planned > 0 else { return nil }
        return min(1, Double(elapsedMinutes(since: startedAt, now: now)) / Double(planned))
    }

    /// When the estimate runs out (nil without one).
    public static func endDate(for task: TaskItem) -> Date? {
        guard let start = task.startedAt.flatMap({ DoneDate.date(from: $0) }), let planned = task.durationMinutes else { return nil }
        return start.addingTimeInterval(Double(planned) * 60)
    }
}
