import Foundation

public struct ArchiveGroup: Equatable, Sendable {
    public var label: String
    public var items: [TaskItem]

    public init(label: String, items: [TaskItem]) {
        self.label = label
        self.items = items
    }
}

/// The archive view's grouping. Port of src/utils/archive.ts.
public enum Archive {
    /// Completed tasks, newest first, bucketed into Today / This week / Earlier
    /// by calendar day in `calendar`'s time zone. Empty buckets are left out.
    public static func group(_ tasks: [TaskItem], now: Date = Date(), calendar: Calendar = .current) -> [ArchiveGroup] {
        // Newest first; ties keep their order, and undated ones go last.
        let done = tasks
            .filter { $0.status == .archived }
            .enumerated()
            .sorted { left, right in
                let l = left.element.completedAt ?? ""
                let r = right.element.completedAt ?? ""
                return l != r ? l > r : left.offset < right.offset
            }
            .map(\.element)

        let today = calendar.startOfDay(for: now)
        var buckets: [(label: String, items: [TaskItem])] = [("Today", []), ("This week", []), ("Earlier", [])]
        for task in done {
            guard let completed = task.completedAt.flatMap({ DoneDate.date(from: $0) }) else {
                buckets[2].items.append(task)
                continue
            }
            let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: completed), to: today).day ?? 0
            buckets[days <= 0 ? 0 : days < 7 ? 1 : 2].items.append(task)
        }
        return buckets
            .filter { !$0.items.isEmpty }
            .map { ArchiveGroup(label: $0.label, items: $0.items) }
    }
}
