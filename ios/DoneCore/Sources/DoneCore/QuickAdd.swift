import Foundation

/// What a quick-add line means: the task name plus any shorthand found in it.
public struct QuickAddParse: Codable, Equatable, Sendable {
    public var name: String
    public var durationMinutes: Int?
    public var categoryId: String?

    public init(name: String, durationMinutes: Int?, categoryId: String?) {
        self.name = name
        self.durationMinutes = durationMinutes
        self.categoryId = categoryId
    }
}

/// Quick-add shorthand: `Call mom 15m #personal`. Port of src/utils/quickAdd.ts.
///
/// Uses NSRegularExpression (ICU), whose matching is close to JavaScript's.
/// Two classes are spelled out where ICU's differ: `[0-9]` for `\d` (ICU's
/// also matches non-ASCII digits) and `space` for `\s`. `\z` stands in for
/// `$`, which in ICU also matches before a final line break.
public enum QuickAdd {
    /// JavaScript's `\s` (and `trim()`) as an ICU class body. ICU's own `\s`
    /// lacks U+000B and U+FEFF and adds U+0085.
    private static let space = #"\t\n\x{0B}\f\r \x{A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}"#

    /// The same characters, for trimming.
    static let whitespace: CharacterSet = {
        var set = CharacterSet(charactersIn: "\t\n\u{0B}\u{0C}\r \u{A0}\u{1680}\u{2028}\u{2029}\u{202F}\u{205F}\u{3000}\u{FEFF}")
        set.insert(charactersIn: "\u{2000}"..."\u{200A}")
        return set
    }()

    // 30m, 30 min, 45mins, 1h, 1.5h, 2 hrs, 1h30, 1h30m
    private static let duration = try! NSRegularExpression(
        pattern: #"(?:^|[\#(space)])(?:([0-9]+(?:\.[0-9]+)?)[\#(space)]*(?:h|hr|hrs|hour|hours)(?:[\#(space)]*([0-9]+)[\#(space)]*(?:m|min|mins)?)?|([0-9]+)[\#(space)]*(?:m|min|mins|minute|minutes))(?=[\#(space)]|\z)"#,
        options: [.caseInsensitive]
    )
    private static let tag = try! NSRegularExpression(pattern: #"(?:^|[\#(space)])#([^\#(space)#]+)(?=[\#(space)]|\z)"#)
    private static let runOfSpace = try! NSRegularExpression(pattern: #"[\#(space)]+"#)

    /// Match a #tag to a category by name, ignoring case and punctuation. A
    /// prefix counts only when it fits exactly one category.
    public static func matchCategory(_ tag: String, categories: [TaskCategory]) -> TaskCategory? {
        let wanted = normalized(tag)
        if wanted.isEmpty { return nil }
        let lowerTag = tag.lowercased()
        if let exact = categories.first(where: { normalized($0.name) == wanted || $0.id == lowerTag }) {
            return exact
        }
        let prefixed = categories.filter { normalized($0.name).hasPrefix(wanted) }
        return prefixed.count == 1 ? prefixed[0] : nil // ambiguous prefixes don't guess
    }

    /// Pull "30m" / "1h30" and "#category" out of a quick-add line. The last
    /// duration and the last recognised tag win; unknown tags stay in the name.
    public static func parse(_ input: String, categories: [TaskCategory]) -> QuickAddParse {
        var durationMinutes: Int?
        var categoryId: String?

        var name = replaceMatches(of: duration, in: input) { match, text in
            let parsed: Int?
            if let hours = group(1, of: match, in: text) {
                parsed = totalMinutes(hours: hours, extra: group(2, of: match, in: text))
            } else {
                parsed = group(3, of: match, in: text).flatMap { Int($0) }
            }
            // Numbers too big to be minutes stay in the name.
            guard let minutes = parsed, minutes != 0 else { return nil }
            durationMinutes = minutes
            return " "
        }

        name = replaceMatches(of: tag, in: name) { match, text in
            guard let tagText = group(1, of: match, in: text),
                  let category = matchCategory(tagText, categories: categories)
            else { return nil }
            categoryId = category.id
            return " "
        }

        name = replaceMatches(of: runOfSpace, in: name) { _, _ in " " }
            .trimmingCharacters(in: whitespace)

        // A line that is only shorthand ("30m") is a name, not an empty task.
        if name.isEmpty {
            return QuickAddParse(name: input.trimmingCharacters(in: whitespace), durationMinutes: nil, categoryId: nil)
        }
        return QuickAddParse(name: name, durationMinutes: durationMinutes, categoryId: categoryId)
    }

    /// "1.5" hours plus optional extra minutes ("1h30"). nil when a number is
    /// too big for an Int, so the text stays in the name.
    private static func totalMinutes(hours: String, extra: String?) -> Int? {
        var extraMinutes = 0
        if let extra {
            guard let value = Int(extra) else { return nil }
            extraMinutes = value
        }
        guard let hourValue = Double(hours),
              let whole = Int(exactly: (hourValue * 60).rounded(.toNearestOrAwayFromZero))
        else { return nil }
        let (sum, overflow) = whole.addingReportingOverflow(extraMinutes)
        return overflow ? nil : sum
    }

    /// Lowercase, then keep only a–z and 0–9, as the web app does.
    static func normalized(_ text: String) -> String {
        var scalars = String.UnicodeScalarView()
        for scalar in text.lowercased().unicodeScalars
        where (97...122).contains(scalar.value) || (48...57).contains(scalar.value) {
            scalars.append(scalar)
        }
        return String(scalars)
    }

    /// JavaScript's `text.replace(/…/g, fn)`: each match, left to right, becomes
    /// what `transform` returns, or stays as it was when it returns nil.
    private static func replaceMatches(
        of regex: NSRegularExpression,
        in text: String,
        _ transform: (NSTextCheckingResult, NSString) -> String?
    ) -> String {
        let source = text as NSString
        var result = ""
        var position = 0
        for match in regex.matches(in: text, range: NSRange(location: 0, length: source.length)) {
            result += source.substring(with: NSRange(location: position, length: match.range.location - position))
            result += transform(match, source) ?? source.substring(with: match.range)
            position = match.range.location + match.range.length
        }
        result += source.substring(from: position)
        return result
    }

    private static func group(_ index: Int, of match: NSTextCheckingResult, in text: NSString) -> String? {
        let range = match.range(at: index)
        return range.location == NSNotFound ? nil : text.substring(with: range)
    }
}
