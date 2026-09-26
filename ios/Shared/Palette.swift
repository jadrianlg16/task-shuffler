import DoneCore
import SwiftUI
import UIKit

/// The web app's colour tokens (src/index.css), light and dark. Shared by the
/// app and the widgets.
enum Palette {
    static let background = Color(light: 0xF7F5F2, dark: 0x0F0F0F)
    static let surface = Color(light: 0xFFFFFF, dark: 0x1A1A1A)
    static let ink = Color(light: 0x1A1A18, dark: 0xE8E6E3)
    static let inkMuted = Color(light: 0x6A6862, dark: 0x9A9A97)
    static let inkFaint = Color(light: 0xD4D2CE, dark: 0x3A3A38)
    static let accent = Color(light: 0x2C5F2E, dark: 0x5FB563)
    /// Text and icons on an accent-coloured fill.
    static let onAccent = Color(light: 0xF7F5F2, dark: 0x0F0F0F)
    static let accentSoft = Color(light: 0xE6EEE6, dark: 0x1C2A1D)
    static let danger = Color(light: 0xC0392B, dark: 0xE74C3C)
}

extension Color {
    /// A colour that follows light and dark mode, from 0xRRGGBB values.
    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { traits in
            UIColor(rgb: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }

    /// A category colour ("#RGB", "#RRGGBB" or "#RRGGBBAA"); grey when unreadable.
    init(hex: String) {
        self.init(uiColor: UIColor(hex: hex) ?? UIColor(rgb: 0x6B7280))
    }
}

extension UIColor {
    convenience init(rgb: UInt32, alpha: CGFloat = 1) {
        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: alpha
        )
    }

    convenience init?(hex: String) {
        var digits = hex.trimmingCharacters(in: .whitespaces)
        if digits.hasPrefix("#") { digits.removeFirst() }
        if digits.count == 3 || digits.count == 4 {
            digits = digits.map { "\($0)\($0)" }.joined()
        }
        guard digits.count == 6 || digits.count == 8, let value = UInt64(digits, radix: 16) else { return nil }
        if digits.count == 8 {
            self.init(rgb: UInt32(value >> 8), alpha: CGFloat(value & 0xFF) / 255)
        } else {
            self.init(rgb: UInt32(value))
        }
    }
}

extension TaskCategory {
    var swiftUIColor: Color { Color(hex: color) }
}

/// "25 min", as the web app writes it.
func minutesText(_ minutes: Int) -> String { "\(minutes) min" }
