import Foundation

/// The App Group the app, its widgets and its Siri intents share, so they all
/// read and write the same tasks. Must match the entitlements in project.yml.
public enum AppGroup {
    public static let id = "group.dev.adriangaona.done"

    /// The shared folder, or the app's own Application Support folder when the
    /// App Group isn't available (unsigned simulator builds, `swift test`).
    public static var folder: URL {
        if let shared = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: id) {
            return shared
        }
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return support.appendingPathComponent("done", isDirectory: true)
    }
}

/// The tasks file, in the backup format. Reads and writes are coordinated, so
/// the app and a widget button changing it at the same moment can't lose either
/// change.
public struct LibraryFile: Sendable {
    public let url: URL

    public init(url: URL) {
        self.url = url
    }

    /// `tasks.json` in the shared App Group folder.
    public static var shared: LibraryFile {
        LibraryFile(url: AppGroup.folder.appendingPathComponent("tasks.json"))
    }

    /// The saved library, or nil when nothing has been saved yet. Throws when
    /// the file exists but can't be read.
    public func load() throws -> Library? {
        var result: Result<Library?, Error> = .success(nil)
        var coordinationError: NSError?
        NSFileCoordinator(filePresenter: nil).coordinate(readingItemAt: url, options: [], error: &coordinationError) { readURL in
            result = Result { try Self.read(readURL) }
        }
        if let coordinationError { throw coordinationError }
        return try result.get()
    }

    public func save(_ library: Library) throws {
        var result: Result<Void, Error> = .success(())
        var coordinationError: NSError?
        NSFileCoordinator(filePresenter: nil).coordinate(writingItemAt: url, options: .forReplacing, error: &coordinationError) { writeURL in
            result = Result { try Self.write(library, to: writeURL) }
        }
        if let coordinationError { throw coordinationError }
        try result.get()
    }

    /// Read, change and write back as one step. Returns the saved library.
    @discardableResult
    public func update(_ change: (inout Library) -> Void) throws -> Library {
        var result: Result<Library, Error> = .success(Library())
        var coordinationError: NSError?
        NSFileCoordinator(filePresenter: nil).coordinate(writingItemAt: url, options: .forMerging, error: &coordinationError) { fileURL in
            result = Result {
                var library = try Self.read(fileURL) ?? Library()
                change(&library)
                try Self.write(library, to: fileURL)
                return library
            }
        }
        if let coordinationError { throw coordinationError }
        return try result.get()
    }

    /// Keeps a copy of a file that couldn't be read, so starting fresh never
    /// destroys it. Returns where the copy went.
    @discardableResult
    public func keepUnreadableCopy(now: Date = Date()) -> URL? {
        let stamp = DoneDate.string(from: now).replacingOccurrences(of: ":", with: "-")
        let copy = url.deletingLastPathComponent().appendingPathComponent("tasks-unreadable-\(stamp).json")
        do {
            try FileManager.default.copyItem(at: url, to: copy)
            return copy
        } catch {
            return nil
        }
    }

    private static func read(_ url: URL) throws -> Library? {
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        return try JSONDecoder().decode(Library.self, from: Data(contentsOf: url))
    }

    private static func write(_ library: Library, to url: URL) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .withoutEscapingSlashes]
        try encoder.encode(library).write(to: url, options: .atomic)
    }
}

/// Light, dark or follow the system.
public enum Appearance: String, Codable, CaseIterable, Sendable {
    case system
    case light
    case dark
}

/// Settings and small bits of state, shared with the widgets and intents.
/// Every field has a default, so older saved preferences always load.
public struct Preferences: Codable, Equatable, Sendable {
    /// Picker: categories to draw from (none = all).
    public var shuffleCategoryIds: [String] = []
    /// Picker: "I have N minutes" and friends.
    public var shuffleTimeFilter: TimeFilter = .anyLength
    /// List: grouped by category, or one flat list.
    public var listGrouped = true
    public var sortBy: SortBy = .date
    public var appearance: Appearance = .system

    public var soundsOn = true
    public var hapticsOn = true
    /// A notification when a started task reaches its estimate.
    public var timesUpAlerts = true
    /// The Now timer on the Lock Screen and in the Dynamic Island.
    public var liveActivities = true
    /// A daily "got a few minutes?" notification.
    public var dailyNudge = false
    /// When the nudge comes, in minutes after midnight.
    public var dailyNudgeMinutes = 9 * 60
    /// Active tasks appear in Spotlight search.
    public var spotlight = true

    /// Backup reminder bookkeeping.
    public var firstUseAt: Date?
    public var lastBackupAt: Date?
    public var backupSnoozedUntil: Date?

    /// Categories a Focus filter limits the app to (nil = no Focus filter).
    public var focusCategoryIds: [String]?
    /// Something a widget, control or notification asked the app to do when it opens.
    public var pendingAction: PendingAction?

    public init() {}

    private enum CodingKeys: String, CodingKey {
        case shuffleCategoryIds, shuffleTimeFilter, listGrouped, sortBy, appearance
        case soundsOn, hapticsOn, timesUpAlerts, liveActivities, dailyNudge, dailyNudgeMinutes, spotlight
        case firstUseAt, lastBackupAt, backupSnoozedUntil, focusCategoryIds, pendingAction
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let defaults = Preferences()
        shuffleCategoryIds = (try? c.decodeIfPresent([String].self, forKey: .shuffleCategoryIds)) ?? defaults.shuffleCategoryIds
        shuffleTimeFilter = (try? c.decodeIfPresent(TimeFilter.self, forKey: .shuffleTimeFilter)) ?? defaults.shuffleTimeFilter
        listGrouped = (try? c.decodeIfPresent(Bool.self, forKey: .listGrouped)) ?? defaults.listGrouped
        sortBy = (try? c.decodeIfPresent(SortBy.self, forKey: .sortBy)) ?? defaults.sortBy
        appearance = (try? c.decodeIfPresent(Appearance.self, forKey: .appearance)) ?? defaults.appearance
        soundsOn = (try? c.decodeIfPresent(Bool.self, forKey: .soundsOn)) ?? defaults.soundsOn
        hapticsOn = (try? c.decodeIfPresent(Bool.self, forKey: .hapticsOn)) ?? defaults.hapticsOn
        timesUpAlerts = (try? c.decodeIfPresent(Bool.self, forKey: .timesUpAlerts)) ?? defaults.timesUpAlerts
        liveActivities = (try? c.decodeIfPresent(Bool.self, forKey: .liveActivities)) ?? defaults.liveActivities
        dailyNudge = (try? c.decodeIfPresent(Bool.self, forKey: .dailyNudge)) ?? defaults.dailyNudge
        dailyNudgeMinutes = (try? c.decodeIfPresent(Int.self, forKey: .dailyNudgeMinutes)) ?? defaults.dailyNudgeMinutes
        spotlight = (try? c.decodeIfPresent(Bool.self, forKey: .spotlight)) ?? defaults.spotlight
        firstUseAt = try? c.decodeIfPresent(Date.self, forKey: .firstUseAt)
        lastBackupAt = try? c.decodeIfPresent(Date.self, forKey: .lastBackupAt)
        backupSnoozedUntil = try? c.decodeIfPresent(Date.self, forKey: .backupSnoozedUntil)
        focusCategoryIds = try? c.decodeIfPresent([String].self, forKey: .focusCategoryIds)
        pendingAction = try? c.decodeIfPresent(PendingAction.self, forKey: .pendingAction)
    }

    /// The picker's categories, minus any since hidden or deleted, and narrowed
    /// to the Focus filter's when one is on.
    public func effectiveCategoryIds(in library: Library) -> [String] {
        let visible = Set(library.visibleCategories.map(\.id))
        let picked = shuffleCategoryIds.filter { visible.contains($0) }
        guard let focus = focusCategoryIds?.filter({ visible.contains($0) }), !focus.isEmpty else { return picked }
        let narrowed = picked.filter { focus.contains($0) }
        return narrowed.isEmpty ? focus : narrowed
    }
}

/// What a widget, Control Center button or notification asked for.
public enum PendingAction: String, Codable, Sendable {
    /// Open the picker and shuffle.
    case shuffle
    /// Put the cursor in "Add a task".
    case addTask
}

/// Preferences in the App Group's UserDefaults, as one JSON value.
public struct PreferencesStore: @unchecked Sendable {
    private let defaults: UserDefaults
    private let key = "preferences"

    public init(defaults: UserDefaults) {
        self.defaults = defaults
    }

    public static var shared: PreferencesStore {
        PreferencesStore(defaults: UserDefaults(suiteName: AppGroup.id) ?? .standard)
    }

    public func load() -> Preferences {
        guard let data = defaults.data(forKey: key),
              let preferences = try? JSONDecoder().decode(Preferences.self, from: data)
        else { return Preferences() }
        return preferences
    }

    public func save(_ preferences: Preferences) {
        if let data = try? JSONEncoder().encode(preferences) {
            defaults.set(data, forKey: key)
        }
    }

    @discardableResult
    public func update(_ change: (inout Preferences) -> Void) -> Preferences {
        var preferences = load()
        change(&preferences)
        save(preferences)
        return preferences
    }
}
