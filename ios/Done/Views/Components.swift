import DoneCore
import SwiftUI

/// A category's colour dot.
struct CategoryDot: View {
    let color: String
    var size: CGFloat = 8

    var body: some View {
        Circle()
            .fill(Color(hex: color))
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}

/// Dot and name, for task details.
struct CategoryBadge: View {
    let category: TaskCategory

    var body: some View {
        HStack(spacing: 5) {
            CategoryDot(color: category.color, size: 7)
            Text(category.name)
        }
    }
}

/// The small uppercase label above a section ("PICK FOR ME", "NOW").
struct SectionLabel: View {
    let text: String
    var color: Color = Palette.inkMuted

    init(_ text: String, color: Color = Palette.inkMuted) {
        self.text = text
        self.color = color
    }

    var body: some View {
        Text(text.uppercased())
            .font(.caption2.weight(.semibold))
            .tracking(0.8)
            .foregroundStyle(color)
            .accessibilityAddTraits(.isHeader)
    }
}

/// A toggle-style pill, like the web app's chips.
struct Chip<Content: View>: View {
    let isOn: Bool
    let action: () -> Void
    @ViewBuilder let label: () -> Content

    var body: some View {
        Button(action: action) {
            label()
                .font(.subheadline)
                .padding(.horizontal, 12)
                .frame(minHeight: 32)
                .foregroundStyle(isOn ? Palette.onAccent : Palette.ink)
                .background(
                    Capsule().fill(isOn ? Palette.accent : Palette.surface)
                )
                .overlay(
                    Capsule().strokeBorder(isOn ? Color.clear : Palette.inkFaint, lineWidth: 1)
                )
                .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }
}

/// A thin bar that fills from 0 to 1.
struct ProgressBar: View {
    let value: Double
    var fill: Color = Palette.accent

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(Palette.inkFaint.opacity(0.6))
                Capsule()
                    .fill(fill)
                    .frame(width: proxy.size.width * min(1, max(0, value)))
            }
        }
        .frame(height: 4)
        .animation(.easeOut(duration: 0.4), value: value)
        .accessibilityElement()
        .accessibilityValue("\(Int((min(1, max(0, value)) * 100).rounded())) percent")
    }
}

/// The white card the web app calls a panel.
struct CardStyle: ViewModifier {
    var accentEdge = false

    func body(content: Content) -> some View {
        content
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Palette.surface)
            )
            .overlay {
                // A 3 pt stripe down the left edge, clipped to the card's corners.
                // It's a whole-card fill masked to 3 pt, and a mask doesn't shrink
                // where taps land: without allowsHitTesting(false) it swallowed
                // every tap on the Now card's buttons.
                if accentEdge {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Palette.accent)
                        .mask(alignment: .leading) { Rectangle().frame(width: 3) }
                        .allowsHitTesting(false)
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(Palette.inkFaint.opacity(0.7), lineWidth: 1)
                    .allowsHitTesting(false)
            )
    }
}

extension View {
    func card(accentEdge: Bool = false) -> some View {
        modifier(CardStyle(accentEdge: accentEdge))
    }

    /// Full-width filled button in the accent colour.
    func primaryButtonStyle() -> some View {
        font(.body.weight(.semibold))
            .frame(maxWidth: .infinity, minHeight: 46)
            .foregroundStyle(Palette.onAccent)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Palette.accent))
            .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    /// Outlined button.
    func secondaryButtonStyle() -> some View {
        font(.subheadline.weight(.medium))
            .frame(maxWidth: .infinity, minHeight: 42)
            .foregroundStyle(Palette.ink)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Palette.surface))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Palette.inkFaint, lineWidth: 1))
            .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

/// The message at the bottom of the screen, with Undo when it has one.
struct ToastView: View {
    let toast: Toast
    let dismiss: () -> Void

    var body: some View {
        HStack(spacing: 14) {
            Text(toast.message)
                .font(.subheadline)
                .foregroundStyle(Palette.background)
                .frame(maxWidth: .infinity, alignment: .leading)
            if let undo = toast.undo {
                Button("Undo") {
                    undo()
                    dismiss()
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Palette.background)
                .accessibilityIdentifier("toastUndo")
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Palette.ink))
        .shadow(color: .black.opacity(0.15), radius: 12, y: 4)
        .padding(.horizontal, 16)
        .accessibilityElement(children: .contain)
    }
}

/// Shows the store's toast at the bottom of whatever it's attached to, and
/// clears it after a few seconds. On the main screen and on every sheet, so a
/// message raised inside a sheet is seen there.
struct ToastHost: ViewModifier {
    @Environment(LibraryStore.self) private var store
    var bottomPadding: CGFloat = 96
    var isActive = true

    func body(content: Content) -> some View {
        content
            .overlay(alignment: .bottom) {
                if isActive, let toast = store.toast {
                    ToastView(toast: toast) { store.toast = nil }
                        .padding(.bottom, bottomPadding)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                        .task(id: toast.id) {
                            try? await Task.sleep(nanoseconds: 4_000_000_000)
                            if store.toast?.id == toast.id { store.toast = nil }
                        }
                }
            }
            .animation(.snappy, value: store.toast)
    }
}

/// A calm empty screen.
struct EmptyStateView: View {
    let systemImage: String
    let title: String
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: systemImage)
                .font(.title2)
                .foregroundStyle(Palette.inkMuted)
            Text(title)
                .font(.title3)
                .fontDesign(.serif)
                .foregroundStyle(Palette.ink)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(Palette.inkMuted)
                .multilineTextAlignment(.center)
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Palette.accent)
                    .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 36)
    }
}
