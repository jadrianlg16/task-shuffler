import DoneCore
import SwiftUI

/// "Add a task…" at the bottom of the screen. Minutes and a category appear
/// while you're typing; or type them inline: `Call mom 15m #personal`.
struct QuickAddBar: View {
    @Environment(LibraryStore.self) private var store
    @Environment(Router.self) private var router
    @Environment(\.dynamicTypeSize) private var typeSize
    @FocusState private var focused: Bool
    @State private var text = ""
    @State private var minutes: Int?
    /// What's typed in the "min" box. Its own text, so tapping a chip leaves
    /// the box empty instead of echoing the chip.
    @State private var otherMinutes = ""
    @State private var categoryId = TaskCategory.unassignedId
    /// The "min" box grows with the text size, like the chips beside it.
    @ScaledMetric(relativeTo: .subheadline) private var minutesFieldWidth: CGFloat = 52

    private static let minutePresets = [5, 15, 30, 60]

    var body: some View {
        let parsed = QuickAdd.parse(text, categories: store.library.visibleCategories)
        let hasShorthand = parsed.durationMinutes != nil || parsed.categoryId != nil
        let canAdd = !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty

        // Open while typing, and while a minutes or category choice is waiting,
        // so a hidden choice never lands on the next task by surprise.
        let hasChoice = minutes != nil || categoryId != TaskCategory.unassignedId

        VStack(alignment: .leading, spacing: 10) {
            if focused || canAdd || hasChoice {
                if hasShorthand {
                    preview(parsed)
                } else {
                    options
                }
            }

            HStack(spacing: 10) {
                TextField("Add a task…", text: $text)
                    .focused($focused)
                    .submitLabel(.done)
                    .onSubmit(add)
                    .padding(.horizontal, 14)
                    .frame(minHeight: 44)
                    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Palette.surface))
                    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Palette.inkFaint, lineWidth: 1))
                    .accessibilityLabel("New task")
                    .accessibilityIdentifier("quickAddField")

                Button(action: add) {
                    Image(systemName: "plus")
                        .font(.body.weight(.semibold))
                        .frame(width: 44, height: 44)
                        .foregroundStyle(Palette.onAccent)
                        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Palette.accent))
                        .opacity(canAdd ? 1 : 0.4)
                }
                .buttonStyle(.plain)
                .disabled(!canAdd)
                .accessibilityLabel("Add task")
                .accessibilityIdentifier("quickAddButton")
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
        .padding(.bottom, 8)
        .background(.bar)
        .animation(.snappy(duration: 0.2), value: focused)
        .onChange(of: router.focusQuickAdd) {
            focused = true
        }
    }

    private func preview(_ parsed: QuickAddParse) -> some View {
        let category = parsed.categoryId.flatMap { store.library.category(id: $0) }
        return HStack(spacing: 6) {
            Text("Adds “\(parsed.name)”")
            if let minutes = parsed.durationMinutes { Text("· \(minutesText(minutes))") }
            if let category {
                Text("·")
                CategoryDot(color: category.color, size: 7)
                Text(category.name)
            }
        }
        .font(.caption)
        .foregroundStyle(Palette.inkMuted)
        .lineLimit(1)
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var options: some View {
        if typeSize.isAccessibilitySize {
            // Wrapped, the choices and the tip filled the whole screen above the
            // keyboard (on an iPhone SE at the largest size the text field went
            // under it), leaving no room to see the task just added. One
            // scrolling row instead, fading out at the screen's edges, and no tip.
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    minuteChoices
                    categoryMenu
                }
            }
            .contentMargins(.horizontal, 16, for: .scrollContent)
            .mask {
                HStack(spacing: 0) {
                    LinearGradient(colors: [.clear, .black], startPoint: .leading, endPoint: .trailing).frame(width: 16)
                    Rectangle()
                    LinearGradient(colors: [.black, .clear], startPoint: .leading, endPoint: .trailing).frame(width: 16)
                }
            }
            .padding(.horizontal, -16)
        } else {
            VStack(alignment: .leading, spacing: 6) {
                // Minutes and category on one line where they fit. On a narrower
                // phone or with larger text the category moves under the minutes,
                // and where even the minutes don't fit on a line everything wraps,
                // instead of the category's name being squeezed onto several lines.
                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 6) {
                        minuteChoices
                        Spacer(minLength: 8)
                        categoryMenu
                    }
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 6) { minuteChoices }
                        categoryMenu
                    }
                    FlowLayout(spacing: 6) {
                        minuteChoices
                        categoryMenu
                    }
                }
                tip
            }
        }
    }

    @ViewBuilder
    private var tip: some View {
        if text.isEmpty, let example = store.library.visibleCategories.first(where: { $0.id != TaskCategory.unassignedId }) {
            Text("Tip: type 30m or #\(example.name.lowercased()) right in the name.")
                .font(.caption2)
                .foregroundStyle(Palette.inkMuted)
        }
    }

    @ViewBuilder
    private var minuteChoices: some View {
        ForEach(Self.minutePresets, id: \.self) { preset in
            Chip(isOn: minutes == preset, action: {
                minutes = minutes == preset ? nil : preset
                otherMinutes = ""
            }) {
                Text("\(preset)m")
            }
        }
        TextField("min", text: typedMinutes)
            .keyboardType(.numberPad)
            .font(.subheadline)
            .multilineTextAlignment(.center)
            .frame(width: minutesFieldWidth)
            .frame(minHeight: 32)
            .background(Capsule().fill(Palette.surface))
            .overlay(Capsule().strokeBorder(otherMinutes.isEmpty ? Palette.inkFaint : Palette.accent, lineWidth: 1))
            .accessibilityLabel("Other minutes")
    }

    /// The category as a pill like the chips: dot, name on one line, chevron.
    private var categoryMenu: some View {
        let category = store.library.category(id: categoryId)

        return Menu {
            Picker("Category", selection: $categoryId) {
                ForEach(store.library.sortedCategories.filter { !$0.isHidden || $0.id == categoryId }) { category in
                    Text(category.name).tag(category.id)
                }
            }
        } label: {
            HStack(spacing: 6) {
                CategoryDot(color: category?.color ?? "#6B7280", size: 7)
                Text(category?.name ?? "Unassigned")
                    .lineLimit(1)
                Image(systemName: "chevron.up.chevron.down")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Palette.inkMuted)
            }
            .font(.subheadline)
            .foregroundStyle(Palette.ink)
            .padding(.horizontal, 12)
            .frame(minHeight: 32)
            .background(Capsule().fill(Palette.surface))
            .overlay(Capsule().strokeBorder(Palette.inkFaint, lineWidth: 1))
            .contentShape(Capsule())
        }
        .accessibilityLabel("Category")
        .accessibilityValue(category?.name ?? "Unassigned")
    }

    /// Any number of minutes, typed. Only typing goes through here, so a chip
    /// clearing the box doesn't also clear the chip's minutes.
    private var typedMinutes: Binding<String> {
        Binding(
            get: { otherMinutes },
            set: { typed in
                let digits = typed.filter(\.isNumber)
                otherMinutes = digits
                minutes = Int(digits).flatMap { $0 > 0 ? $0 : nil }
            }
        )
    }

    private func add() {
        guard store.quickAdd(text, minutes: minutes, categoryId: categoryId) != nil else { return }
        text = ""
        minutes = nil
        otherMinutes = ""
        categoryId = TaskCategory.unassignedId
        // Ready for the next one. Return ends editing first, so ask again after it.
        DispatchQueue.main.async { focused = true }
    }
}
