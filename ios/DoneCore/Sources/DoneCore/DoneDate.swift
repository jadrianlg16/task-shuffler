import Foundation

/// Dates the way the web app handles them: ISO 8601 strings, compared as whole
/// milliseconds since 1970 (JavaScript's `getTime()`). Both apps then do the
/// same arithmetic and get the same answers, which ParityTests checks.
///
/// Pure integer maths, no `DateFormatter`: its output depends on the device's
/// calendar settings, and its fractional seconds can be off by a millisecond.
public enum DoneDate {
    /// Milliseconds since 1970 for the ISO forms the app writes or accepts:
    /// `2026-09-22`, `2026-09-22T12:00Z`, `…T12:00:00Z`, `…T12:00:00.123Z`, and
    /// `±hh:mm` offsets in place of `Z`. As in JavaScript, a date alone is UTC
    /// and fraction digits past the milliseconds are dropped. nil if invalid.
    ///
    /// Unlike JavaScript, a date-time without a zone (read there as local time)
    /// and the non-ISO forms `Date.parse` guesses at are refused. The web app
    /// never writes either.
    public static func milliseconds(from string: String) -> Int64? {
        let bytes = Array(string.utf8)
        var i = 0

        func number(_ width: Int) -> Int? {
            guard i + width <= bytes.count else { return nil }
            var value = 0
            for byte in bytes[i..<(i + width)] {
                guard let digit = digitValue(byte) else { return nil }
                value = value * 10 + digit
            }
            i += width
            return value
        }
        func skip(_ character: Unicode.Scalar) -> Bool {
            guard i < bytes.count, bytes[i] == UInt8(ascii: character) else { return false }
            i += 1
            return true
        }

        guard let year = number(4), skip("-"), let month = number(2), skip("-"), let day = number(2),
              (1...12).contains(month), day >= 1, day <= daysIn(month: month, year: year)
        else { return nil }

        var hour = 0, minute = 0, second = 0, millisecond = 0, offsetMinutes = 0
        if i < bytes.count {
            guard skip("T"), let h = number(2), skip(":"), let m = number(2) else { return nil }
            hour = h
            minute = m
            if skip(":") {
                guard let s = number(2) else { return nil }
                second = s
                if skip(".") {
                    var digits = 0
                    while i < bytes.count, let digit = digitValue(bytes[i]) {
                        if digits < 3 { millisecond = millisecond * 10 + digit }
                        digits += 1
                        i += 1
                    }
                    guard digits > 0 else { return nil }
                    for _ in Swift.min(digits, 3)..<3 { millisecond *= 10 }
                }
            }
            guard hour <= 23, minute <= 59, second <= 59 else { return nil }

            if skip("Z") {
                // UTC
            } else if i < bytes.count, bytes[i] == UInt8(ascii: "+") || bytes[i] == UInt8(ascii: "-") {
                let sign = bytes[i] == UInt8(ascii: "-") ? -1 : 1
                i += 1
                guard let oh = number(2), skip(":"), let om = number(2), oh <= 23, om <= 59 else { return nil }
                offsetMinutes = sign * (oh * 60 + om)
            } else {
                return nil
            }
        }
        guard i == bytes.count else { return nil }

        let days = Int64(daysFromCivil(year: year, month: month, day: day))
        let seconds = Int64(hour * 3600 + minute * 60 + second - offsetMinutes * 60)
        return days * 86_400_000 + seconds * 1000 + Int64(millisecond)
    }

    /// JavaScript's `toISOString()`: `2026-09-22T12:00:00.000Z`.
    public static func string(fromMilliseconds ms: Int64) -> String {
        let dayMs: Int64 = 86_400_000
        var days = ms / dayMs
        var rest = ms % dayMs
        if rest < 0 {
            rest += dayMs
            days -= 1
        }
        let (year, month, day) = civilFromDays(Int(days))
        let hour = Int(rest / 3_600_000)
        let minute = Int(rest / 60_000 % 60)
        let second = Int(rest / 1000 % 60)
        let millisecond = Int(rest % 1000)
        return "\(pad(year, 4))-\(pad(month, 2))-\(pad(day, 2))T\(pad(hour, 2)):\(pad(minute, 2)):\(pad(second, 2)).\(pad(millisecond, 3))Z"
    }

    public static func milliseconds(from date: Date) -> Int64 {
        Int64((date.timeIntervalSince1970 * 1000).rounded())
    }

    public static func date(fromMilliseconds ms: Int64) -> Date {
        Date(timeIntervalSince1970: Double(ms) / 1000)
    }

    public static func date(from string: String) -> Date? {
        milliseconds(from: string).map { date(fromMilliseconds: $0) }
    }

    public static func string(from date: Date) -> String {
        string(fromMilliseconds: milliseconds(from: date))
    }

    // MARK: - Calendar maths (proleptic Gregorian, from Howard Hinnant's date algorithms)

    private static func digitValue(_ byte: UInt8) -> Int? {
        byte >= UInt8(ascii: "0") && byte <= UInt8(ascii: "9") ? Int(byte - UInt8(ascii: "0")) : nil
    }

    private static func pad(_ value: Int, _ width: Int) -> String {
        let text = String(value)
        return String(repeating: "0", count: Swift.max(0, width - text.count)) + text
    }

    private static func daysIn(month: Int, year: Int) -> Int {
        switch month {
        case 2:
            let leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
            return leap ? 29 : 28
        case 4, 6, 9, 11:
            return 30
        default:
            return 31
        }
    }

    /// Days since 1970-01-01 for a calendar date.
    private static func daysFromCivil(year: Int, month: Int, day: Int) -> Int {
        let y = month <= 2 ? year - 1 : year
        let era = (y >= 0 ? y : y - 399) / 400
        let yearOfEra = y - era * 400
        let monthFromMarch = (month + 9) % 12
        let dayOfYear = (153 * monthFromMarch + 2) / 5 + day - 1
        let dayOfEra = yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear
        return era * 146_097 + dayOfEra - 719_468
    }

    /// Calendar date for a count of days since 1970-01-01.
    private static func civilFromDays(_ days: Int) -> (year: Int, month: Int, day: Int) {
        let z = days + 719_468
        let era = (z >= 0 ? z : z - 146_096) / 146_097
        let dayOfEra = z - era * 146_097
        let yearOfEra = (dayOfEra - dayOfEra / 1460 + dayOfEra / 36524 - dayOfEra / 146_096) / 365
        let dayOfYear = dayOfEra - (365 * yearOfEra + yearOfEra / 4 - yearOfEra / 100)
        let monthFromMarch = (5 * dayOfYear + 2) / 153
        let day = dayOfYear - (153 * monthFromMarch + 2) / 5 + 1
        let month = monthFromMarch < 10 ? monthFromMarch + 3 : monthFromMarch - 9
        let year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0)
        return (year, month, day)
    }
}
