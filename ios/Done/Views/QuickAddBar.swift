import DoneCore
import SwiftUI

/// "Add a task…" at the bottom of the screen. Minutes and a category appear
/// while you're typing; or type them inline: `Call mom 15m #personal`.
struct QuickAddBar: View {
    @Environment(LibraryStore.self) private var store
    @Environment(Router.self) private var router
    @FocusState private var focused: Bool
    @State private var text = ""
    @State private var minutes: Int?
    @State private var categoryId = TaskCategory.unassignedId

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

    private var options: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                ForEach(Self.minutePresets, id: \.self) { preset in
                    Chip(isOn: minutes == preset, action: { minutes = minutes == preset ? nil : preset }) {
                        Text("\(preset)m")
                    }
                }
                TextField("min", text: typedMinutes)
                    .keyboardType(.numberPad)
                    .font(.subheadline)
                    .multilineTextAlignment(.center)
                    .frame(width: 48, height: 32)
                    .background(Capsule().fill(Palette.surface))
                    .overlay(Capsule().strokeBorder(Palette.inkFaint, lineWidth: 1))
                    .accessibilityLabel("Minutes")
                Spacer(minLength: 4)
                Menu {
                    Picker("Category", selection: $categoryId) {
                        ForEach(store.library.sortedCategories.filter { !$0.isHidden || $0.id == categoryId }) { category in
                            Text(category.name).tag(category.id)
                        }
                    }
                } label: {
                    HStack(spacing: 5) {
                        CategoryDot(color: store.library.category(id: categoryId)?.color ?? "#6B7280", size: 7)
                        Text(store.library.category(id: categoryId)?.name ?? "Unassigned")
                        Image(systemName: "chevron.up.chevron.down").font(.caption2)
                    }
                    .font(.subheadline)
                    .foregroundStyle(Palette.ink)
                }
                .accessibilityLabel("Category")
            }
            if text.isEmpty, let example = store.library.visibleCategories.first(where: { $0.id != TaskCategory.unassignedId }) {
                Text("Tip: type 30m or #\(example.name.lowercased()) right in the name.")
                    .font(.caption2)
                    .foregroundStyle(Palette.inkMuted)
            }
        }
    }

    /// Any number of minutes, typed.
    private var typedMinutes: Binding<String> {
        Binding(
            get: { minutes.map { String($0) } ?? "" },
            set: { typed in minutes = Int(typed.filter(\.isNumber)).flatMap { $0 > 0 ? $0 : nil } }
        )
    }

    private func add() {
        guard store.quickAdd(text, minutes: minutes, categoryId: categoryId) != nil else { return }
        text = ""
        minutes = nil
        categoryId = TaskCategory.unassignedId
        // Ready for the next one. Return ends editing first, so ask again after it.
        DispatchQueue.main.async { focused = true }
    }
}
