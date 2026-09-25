import Foundation

/// How the task list can be ordered.
public enum SortBy: String, Codable, CaseIterable, Sendable {
    case name
    case duration
    case category
    case date
}

/// List and picker filters. Port of the web app's src/utils/filters.ts.
public enum Filters {
    public static func byTime(_ tasks: [TaskItem], _ filter: TimeFilter) -> [TaskItem] {
        if filter.mode == .any { return tasks }

        return tasks.filter { task in
            guard let minutes = task.durationMinutes else { return filter.includeNoDuration }

            switch filter.mode {
            case .max:
                return filter.value.map { minutes <= $0 } ?? true
            case .min:
                return minutes >= (filter.value ?? 0)
            case .range:
                return minutes >= (filter.min ?? 0) && (filter.max.map { minutes <= $0 } ?? true)
            case .exact:
                return minutes == filter.value
            case .any:
                return true
            }
        }
    }

    /// Tasks in the given categories; none given = all.
    public static func byCategories(_ tasks: [TaskItem], _ categoryIds: [String]) -> [TaskItem] {
        if categoryIds.isEmpty { return tasks }
        let wanted = Set(categoryIds)
        return tasks.filter { wanted.contains($0.categoryId) }
    }

    public static func bySearch(_ tasks: [TaskItem], _ query: String) -> [TaskItem] {
        if query.trimmingCharacters(in: QuickAdd.whitespace).isEmpty { return tasks }
        let lower = query.lowercased()
        return tasks.filter { $0.name.lowercased().contains(lower) }
    }

    /// Stable, like JavaScript's sort: tasks that tie keep their order. Names
    /// sort the way `locale`'s language does (JavaScript's `localeCompare`).
    public static func sorted(
        _ tasks: [TaskItem],
        by sortBy: SortBy,
        categories: [TaskCategory],
        locale: Locale = .current
    ) -> [TaskItem] {
        let compare: (TaskItem, TaskItem) -> Int
        switch sortBy {
        case .name:
            compare = { $0.name.compare($1.name, locale: locale).rawValue }
        case .duration:
            compare = { ($0.durationMinutes ?? 999) - ($1.durationMinutes ?? 999) }
        case .category:
            // A repeated id keeps its last entry, as a JavaScript Map does.
            let order = Dictionary(categories.map { ($0.id, $0.sortOrder) }, uniquingKeysWith: { _, last in last })
            compare = { (order[$0.categoryId] ?? 999) - (order[$1.categoryId] ?? 999) }
        case .date:
            // Newest first. An unreadable date ties with everything, as the NaN
            // it gives in JavaScript does.
            compare = { a, b in
                guard let aTime = DoneDate.milliseconds(from: a.createdAt),
                      let bTime = DoneDate.milliseconds(from: b.createdAt)
                else { return 0 }
                return bTime < aTime ? -1 : (bTime > aTime ? 1 : 0)
            }
        }
        return tasks.enumerated()
            .sorted { left, right in
                let result = compare(left.element, right.element)
                return result != 0 ? result < 0 : left.offset < right.offset
            }
            .map(\.element)
    }
}
