import Foundation

/// Why a backup file was refused. The message is shown to the person as is.
public struct BackupError: Error, Equatable, LocalizedError, Sendable {
    public let message: String

    public init(_ message: String) {
        self.message = message
    }

    public var errorDescription: String? { message }
}

/// Everything the app stores, in the web app's backup format:
/// `{ "activities": [...], "categories": [...] }`. The same file works in both
/// apps. Port of src/utils/exportImport.ts.
public struct Backup: Codable, Equatable, Sendable {
    public var activities: [TaskItem]
    public var categories: [TaskCategory]

    public init(activities: [TaskItem], categories: [TaskCategory]) {
        self.activities = activities
        self.categories = categories
    }

    /// The backup file's contents, pretty-printed.
    public func jsonData() throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .withoutEscapingSlashes]
        return try encoder.encode(self)
    }

    public static func parse(_ json: String) throws -> Backup {
        try parse(Data(json.utf8))
    }

    /// Read and check a backup file. Throws a `BackupError` with a readable
    /// message instead of letting a half-valid file replace real data. The
    /// checks and messages match the web app's, in the same order.
    public static func parse(_ data: Data) throws -> Backup {
        let root: JSONValue
        do {
            root = try JSONDecoder().decode(JSONValue.self, from: data)
        } catch {
            throw BackupError("That file isn't valid JSON.")
        }
        guard case .object(let fields) = root,
              case .array(let rawActivities)? = fields["activities"],
              case .array(let rawCategories)? = fields["categories"]
        else {
            throw BackupError("That doesn't look like a done. backup (no tasks/categories lists).")
        }

        let categories = try rawCategories.enumerated().map { try category(from: $0.element, index: $0.offset) }
        if categories.isEmpty { throw BackupError("The backup has no categories.") }
        let activities = try rawActivities.enumerated().map { try task(from: $0.element, index: $0.offset) }

        let categoryIds = Set(categories.map(\.id))
        if !categoryIds.contains(TaskCategory.unassignedId) {
            throw BackupError("The backup is missing the Unassigned category.")
        }
        func hasDuplicates(_ ids: [String]) -> Bool { Set(ids).count != ids.count }
        if hasDuplicates(activities.map(\.id)) || hasDuplicates(categories.map(\.id)) {
            throw BackupError("The backup contains duplicate ids.")
        }

        // Tasks pointing at a category that isn't in the file fall back to Unassigned.
        let placed = activities.map { task -> TaskItem in
            var task = task
            if !categoryIds.contains(task.categoryId) { task.categoryId = TaskCategory.unassignedId }
            return task
        }
        return Backup(activities: placed, categories: categories)
    }

    private static func task(from value: JSONValue, index: Int) throws -> TaskItem {
        let invalid = BackupError("Task #\(index + 1) is missing fields or has the wrong types.")
        guard case .object(let fields) = value else { throw invalid }

        /// Missing, null or any string.
        func optionalString(_ key: String) throws -> String? {
            switch fields[key] {
            case .none, .some(.null): return nil
            case .some(.string(let text)): return text
            default: throw invalid
            }
        }

        // Present and null, or a positive number. The web app only ever writes
        // whole minutes; a fraction from a hand-edited file is rounded, to at least 1.
        let durationMinutes: Int?
        switch fields["durationMinutes"] {
        case .some(.null):
            durationMinutes = nil
        case .some(.number(let minutes)) where minutes > 0:
            guard let whole = Int(exactly: max(1, minutes.rounded())) else { throw invalid }
            durationMinutes = whole
        default:
            throw invalid
        }

        guard let id = fields["id"]?.nonEmptyString,
              case .string(let name)? = fields["name"],
              let categoryId = fields["categoryId"]?.nonEmptyString,
              case .string(let statusText)? = fields["status"],
              let status = TaskItem.Status(rawValue: statusText),
              let createdAt = fields["createdAt"]?.nonEmptyString
        else { throw invalid }
        let completedAt = try optionalString("completedAt")
        let startedAt = try optionalString("startedAt")

        return TaskItem(
            id: id,
            name: name,
            durationMinutes: durationMinutes,
            categoryId: categoryId,
            status: status,
            createdAt: createdAt,
            completedAt: completedAt,
            startedAt: startedAt
        )
    }

    private static func category(from value: JSONValue, index: Int) throws -> TaskCategory {
        let invalid = BackupError("Category #\(index + 1) is missing fields or has the wrong types.")
        guard case .object(let fields) = value,
              let id = fields["id"]?.nonEmptyString,
              let name = fields["name"]?.nonEmptyString,
              case .string(let color)? = fields["color"], isHexColor(color),
              case .number(let sortOrder)? = fields["sortOrder"],
              let order = Int(exactly: sortOrder.rounded())
        else { throw invalid }

        // Keep only the known fields: older backups may lack the optional flags
        // (defaulted here) or carry the retired `icon` field (dropped).
        return TaskCategory(
            id: id,
            name: name,
            color: color,
            isDefault: fields["isDefault"] == .bool(true),
            isHidden: fields["isHidden"] == .bool(true),
            sortOrder: order
        )
    }

    /// `#` then 3 to 8 hex digits (the web app's `/^#[0-9a-f]{3,8}$/i`).
    static func isHexColor(_ text: String) -> Bool {
        let bytes = Array(text.utf8)
        guard (4...9).contains(bytes.count), bytes[0] == UInt8(ascii: "#") else { return false }
        return bytes.dropFirst().allSatisfy { byte in
            (UInt8(ascii: "0")...UInt8(ascii: "9")).contains(byte)
                || (UInt8(ascii: "a")...UInt8(ascii: "f")).contains(byte)
                || (UInt8(ascii: "A")...UInt8(ascii: "F")).contains(byte)
        }
    }
}

/// Any JSON value, so a backup can be checked field by field (and a bad field
/// reported) before anything is decoded into the app's types.
enum JSONValue: Decodable, Equatable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: JSONValue].self))
        }
    }

    /// A string with at least one character (the web app's `isStr`).
    var nonEmptyString: String? {
        if case .string(let text) = self, !text.isEmpty { return text }
        return nil
    }
}
