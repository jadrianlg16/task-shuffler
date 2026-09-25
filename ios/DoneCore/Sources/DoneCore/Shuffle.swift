import Foundation

/// What to suggest when nothing fits the picker.
public enum Loosening: Equatable, Sendable {
    /// Nothing at all in the picked categories; changing the time won't help.
    case noneInCategories
    /// Switch to `filter` ("Try 30 min"); `count` tasks would fit.
    case time(filter: TimeFilter, label: String, count: Int)
}

/// Picking a task. Port of the web app's src/utils/shuffle.ts.
public enum Shuffle {
    /// "I have N minutes" presets, shared by the picker and the fallback hint.
    public static let timePresets = [15, 30, 60, 90]

    /// Age at which a task reaches the maximum weight.
    static let maxAgeDays = 30.0
    /// A task that has waited `maxAgeDays` is this many times likelier than a new one.
    static let maxWeight = 3.0
    static let dayMilliseconds = 86_400_000.0

    /// Tasks the shuffle can draw from: active, in a visible category, not the
    /// one you're already doing, in the picked categories (none picked = all),
    /// and inside the time filter.
    public static func candidates(
        _ tasks: [TaskItem],
        categoryIds: [String],
        timeFilter: TimeFilter,
        categories: [TaskCategory]
    ) -> [TaskItem] {
        Filters.byTime(categoryPool(tasks, categoryIds: categoryIds, categories: categories), timeFilter)
    }

    static func categoryPool(_ tasks: [TaskItem], categoryIds: [String], categories: [TaskCategory]) -> [TaskItem] {
        let hidden = Set(categories.filter(\.isHidden).map(\.id))
        let pool = tasks.filter { $0.status == .active && !$0.isStarted && !hidden.contains($0.categoryId) }
        return Filters.byCategories(pool, categoryIds)
    }

    /// Older tasks come up a little more often, so nothing sits forever:
    /// 1 when new, rising evenly to 3 at 30 days, then flat.
    public static func weight(of task: TaskItem, now: Date = Date()) -> Double {
        weight(of: task, nowMilliseconds: DoneDate.milliseconds(from: now))
    }

    static func weight(of task: TaskItem, nowMilliseconds now: Int64) -> Double {
        // An unreadable date counts as new (the web app would get NaN here).
        guard let created = DoneDate.milliseconds(from: task.createdAt) else { return 1 }
        let ageDays = max(0, Double(now - created) / dayMilliseconds)
        let t = min(ageDays, maxAgeDays) / maxAgeDays
        return 1 + t * (maxWeight - 1)
    }

    /// One task, chosen at random by weight. `random` returns a number in 0..<1.
    public static func select(
        _ tasks: [TaskItem],
        random: () -> Double = { Double.random(in: 0..<1) },
        now: Date = Date()
    ) -> TaskItem? {
        guard !tasks.isEmpty else { return nil }
        let nowMs = DoneDate.milliseconds(from: now)
        let weights = tasks.map { weight(of: $0, nowMilliseconds: nowMs) }
        var r = random() * weights.reduce(0, +)
        for (index, weight) in weights.enumerated() {
            r -= weight
            if r < 0 { return tasks[index] }
        }
        return tasks.last
    }

    /// When nothing fits, the smallest step that gives at least one task: the
    /// next "I have N" preset up, or dropping the time limit.
    public static func suggestLoosening(
        _ tasks: [TaskItem],
        categoryIds: [String],
        timeFilter: TimeFilter,
        categories: [TaskCategory]
    ) -> Loosening? {
        let pool = categoryPool(tasks, categoryIds: categoryIds, categories: categories)
        if pool.isEmpty { return .noneInCategories }
        if timeFilter.mode == .any { return nil }

        if timeFilter.mode == .max {
            let current = timeFilter.value ?? 0
            for preset in timePresets where preset > current {
                var filter = timeFilter
                filter.value = preset
                let count = Filters.byTime(pool, filter).count
                if count > 0 { return .time(filter: filter, label: "\(preset) min", count: count) }
            }
        }
        var anyLength = timeFilter
        anyLength.mode = .any
        return .time(filter: anyLength, label: "any length", count: pool.count)
    }
}
