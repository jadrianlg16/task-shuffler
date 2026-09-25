import Foundation

/// A task. The web app calls this `Activity` (src/types/index.ts); the Swift
/// name avoids ActivityKit's `Activity` and the Objective-C runtime's
/// `Category`. Fields and JSON keys match the web app's exactly, so backups move
/// between the two apps unchanged.
///
/// Dates stay the ISO 8601 strings the web app writes
/// (`2026-09-22T12:00:00.000Z`) instead of `Date`, so a round trip gives back
/// the same text, to the millisecond. `DoneDate` converts when a date is needed.
public struct TaskItem: Codable, Equatable, Hashable, Identifiable, Sendable {
    public enum Status: String, Codable, Sendable {
        case active
        case archived
    }

    public var id: String
    public var name: String
    /// Estimated minutes; nil = no estimate.
    public var durationMinutes: Int?
    public var categoryId: String
    public var status: Status
    public var createdAt: String
    public var completedAt: String?
    /// Set while this is the task you're doing now ("Start"). Older data lacks it.
    public var startedAt: String?

    public init(
        id: String,
        name: String,
        durationMinutes: Int?,
        categoryId: String,
        status: Status = .active,
        createdAt: String,
        completedAt: String? = nil,
        startedAt: String? = nil
    ) {
        self.id = id
        self.name = name
        self.durationMinutes = durationMinutes
        self.categoryId = categoryId
        self.status = status
        self.createdAt = createdAt
        self.completedAt = completedAt
        self.startedAt = startedAt
    }

    /// The task you're doing now. An empty string counts as not started, as in
    /// the web app (which tests `startedAt` for truthiness).
    public var isStarted: Bool { !(startedAt ?? "").isEmpty }

    private enum CodingKeys: String, CodingKey {
        case id, name, durationMinutes, categoryId, status, createdAt, completedAt, startedAt
    }

    // Written out so `durationMinutes` and `completedAt` are saved as explicit
    // nulls: the web app's import rejects a task without `durationMinutes`.
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(durationMinutes, forKey: .durationMinutes)
        try container.encode(categoryId, forKey: .categoryId)
        try container.encode(status, forKey: .status)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(completedAt, forKey: .completedAt)
        try container.encodeIfPresent(startedAt, forKey: .startedAt)
    }
}

/// A colour-coded group of tasks (the web app's `Category`).
public struct TaskCategory: Codable, Equatable, Hashable, Identifiable, Sendable {
    public var id: String
    public var name: String
    /// "#RRGGBB" (imports accept 3 to 8 hex digits).
    public var color: String
    /// Legacy one-letter icon. Categories are shown by colour now; kept for backups.
    public var icon: String
    public var isDefault: Bool
    public var isHidden: Bool
    public var sortOrder: Int

    public init(
        id: String,
        name: String,
        color: String,
        icon: String = "",
        isDefault: Bool = false,
        isHidden: Bool = false,
        sortOrder: Int
    ) {
        self.id = id
        self.name = name
        self.color = color
        self.icon = icon
        self.isDefault = isDefault
        self.isHidden = isHidden
        self.sortOrder = sortOrder
    }
}

/// "I have N minutes" and friends: which task lengths the shuffle draws from.
public struct TimeFilter: Codable, Equatable, Hashable, Sendable {
    public enum Mode: String, Codable, Sendable {
        /// Any length.
        case any
        /// At most `value` minutes ("I have N minutes").
        case max
        /// At least `value` minutes.
        case min
        /// Between `min` and `max` minutes.
        case range
        /// Exactly `value` minutes.
        case exact
    }

    public var mode: Mode
    public var value: Int?
    public var min: Int?
    public var max: Int?
    /// Whether tasks without an estimate still count.
    public var includeNoDuration: Bool

    public init(mode: Mode, value: Int? = nil, min: Int? = nil, max: Int? = nil, includeNoDuration: Bool = true) {
        self.mode = mode
        self.value = value
        self.min = min
        self.max = max
        self.includeNoDuration = includeNoDuration
    }

    /// The picker's starting point: any length, untimed tasks included.
    public static let anyLength = TimeFilter(mode: .any)
}
