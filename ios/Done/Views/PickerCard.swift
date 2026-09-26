import DoneCore
import SwiftUI

/// "Pick for me": how much time you have, which categories, and the Shuffle
/// button with how many tasks fit. When nothing fits it offers the smallest
/// change that works ("Try 30 min"). Your choices are remembered.
struct PickerCard: View {
    @Environment(LibraryStore.self) private var store
    @Environment(Router.self) private var router
    @State private var moreOpen = false
    @State private var didSetUp = false

    private var filter: TimeFilter { store.preferences.shuffleTimeFilter }

    var body: some View {
        let count = store.candidates.count

        VStack(alignment: .leading, spacing: 14) {
            SectionLabel("Pick for me")

            row("I have") {
                Chip(isOn: presetOn(nil), action: { choosePreset(nil) }) { Text("Any") }
                ForEach(Shuffle.timePresets, id: \.self) { minutes in
                    Chip(isOn: presetOn(minutes), action: { choosePreset(minutes) }) { Text("\(minutes)m") }
                        .accessibilityLabel("\(minutes) minutes or less")
                }
                Chip(isOn: moreOpen, action: { withAnimation(.snappy) { moreOpen.toggle() } }) { Text("more…") }
            }

            if moreOpen {
                TimeFilterEditor(filter: filterBinding)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            } else if filter.mode != .any {
                Toggle("Include tasks with no time set", isOn: filterBinding.includeNoDuration)
                    .font(.footnote)
                    .foregroundStyle(Palette.inkMuted)
                    .tint(Palette.accent)
            }

            row("From") {
                Chip(isOn: selectedIds.isEmpty, action: { store.updatePreferences { $0.shuffleCategoryIds = [] } }) {
                    Text("All")
                }
                ForEach(chipCategories) { category in
                    Chip(isOn: selectedIds.contains(category.id), action: { store.toggleShuffleCategory(category.id) }) {
                        HStack(spacing: 6) {
                            CategoryDot(color: category.color, size: 7)
                            Text(category.name)
                        }
                    }
                }
            }

            Button {
                router.shuffle()
            } label: {
                Label(count == 0 ? "Shuffle" : "Shuffle \(count) task\(count == 1 ? "" : "s")", systemImage: "shuffle")
                    .primaryButtonStyle()
                    .opacity(count == 0 ? 0.45 : 1)
            }
            .buttonStyle(.plain)
            .disabled(count == 0)
            .accessibilityIdentifier("shuffleButton")

            if let loosening = store.loosening {
                hint(for: loosening)
            }
        }
        .card()
        .onAppear {
            // Only the first time: rows scrolling back into view shouldn't reset it.
            guard !didSetUp else { return }
            didSetUp = true
            moreOpen = !isSimple(filter)
        }
    }

    // MARK: - Categories

    /// Focus filter categories, if one is on.
    private var focus: Set<String>? { store.preferences.focusCategoryIds.map { Set($0) } }

    /// The chips: every visible category, or only the Focus's while one is on.
    private var chipCategories: [TaskCategory] {
        let visible = store.library.visibleCategories
        guard let focus else { return visible }
        return visible.filter { focus.contains($0.id) }
    }

    /// Chips shown as on: your remembered choice (within the Focus, if one is on).
    private var selectedIds: [String] {
        let shown = Set(chipCategories.map(\.id))
        return store.preferences.shuffleCategoryIds.filter { shown.contains($0) }
    }

    // MARK: - Pieces

    private func row<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text(label.uppercased())
                .font(.caption2.weight(.semibold))
                .tracking(0.8)
                .foregroundStyle(Palette.inkMuted)
                .frame(width: 48, alignment: .leading)
            FlowLayout(spacing: 6) {
                content()
            }
        }
    }

    @ViewBuilder
    private func hint(for loosening: Loosening) -> some View {
        switch loosening {
        case .noneInCategories:
            if !store.pickerCategoryIds.isEmpty {
                hintText("No active tasks in \(store.pickerCategoryIds.count == 1 ? "that category" : "those categories").")
            } else if store.library.tasks.isEmpty {
                HStack(spacing: 4) {
                    hintText("No tasks yet. Add one below, or")
                    Button("try the examples") { store.addExamples() }
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Palette.accent)
                        .accessibilityIdentifier("tryExamples")
                }
            } else {
                hintText("No tasks to pick from yet. Add one below.")
            }
        case .time(let suggestion, let label, let count):
            HStack(spacing: 4) {
                hintText("Nothing fits.")
                Button("Try \(label)") {
                    store.updatePreferences { $0.shuffleTimeFilter = suggestion }
                    moreOpen = !isSimple(suggestion)
                }
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Palette.accent)
                hintText("(\(count) task\(count == 1 ? "" : "s"))")
            }
        }
    }

    private func hintText(_ text: String) -> some View {
        Text(text).font(.footnote).foregroundStyle(Palette.inkMuted)
    }

    // MARK: - Time presets

    private var filterBinding: Binding<TimeFilter> { store.binding(\.shuffleTimeFilter) }

    private func isSimple(_ filter: TimeFilter) -> Bool {
        filter.mode == .any || (filter.mode == .max && Shuffle.timePresets.contains(filter.value ?? -1))
    }

    private func presetOn(_ minutes: Int?) -> Bool {
        guard !moreOpen else { return false }
        guard let minutes else { return filter.mode == .any }
        return filter.mode == .max && filter.value == minutes
    }

    private func choosePreset(_ minutes: Int?) {
        moreOpen = false
        var next = filter
        if let minutes {
            next.mode = .max
            next.value = minutes
        } else {
            next.mode = .any
        }
        store.updatePreferences { $0.shuffleTimeFilter = next }
    }
}

/// "more…": at most / at least / between / exactly, in minutes.
struct TimeFilterEditor: View {
    @Binding var filter: TimeFilter

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Picker("Time", selection: $filter.mode) {
                Text("Any length").tag(TimeFilter.Mode.any)
                Text("At most…").tag(TimeFilter.Mode.max)
                Text("At least…").tag(TimeFilter.Mode.min)
                Text("Between…").tag(TimeFilter.Mode.range)
                Text("Exactly…").tag(TimeFilter.Mode.exact)
            }
            .pickerStyle(.menu)
            .tint(Palette.ink)

            switch filter.mode {
            case .max, .min, .exact:
                minutesField("Minutes", value: $filter.value)
            case .range:
                HStack {
                    minutesField("From", value: $filter.min)
                    Text("–").foregroundStyle(Palette.inkMuted)
                    minutesField("To", value: $filter.max)
                }
            case .any:
                EmptyView()
            }

            if filter.mode != .any {
                Toggle("Include tasks with no time set", isOn: $filter.includeNoDuration)
                    .font(.footnote)
                    .foregroundStyle(Palette.inkMuted)
                    .tint(Palette.accent)
            }
        }
        .padding(.leading, 58)
    }

    private func minutesField(_ label: String, value: Binding<Int?>) -> some View {
        let text = Binding<String>(
            get: { value.wrappedValue.map { String($0) } ?? "" },
            set: { typed in value.wrappedValue = Int(typed.filter(\.isNumber)).flatMap { $0 > 0 ? $0 : nil } }
        )
        return TextField(label, text: text)
            .keyboardType(.numberPad)
            .textFieldStyle(.roundedBorder)
            .frame(width: 88)
            .accessibilityLabel("\(label), minutes")
    }
}

/// Lays chips out left to right, wrapping onto new lines.
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = arrange(subviews, width: proposal.width ?? .infinity)
        let height = rows.map(\.height).reduce(0, +) + spacing * CGFloat(max(0, rows.count - 1))
        let width = rows.map(\.width).max() ?? 0
        return CGSize(width: proposal.width ?? width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var y = bounds.minY
        for row in arrange(subviews, width: bounds.width) {
            var x = bounds.minX
            for index in row.indices {
                // A chip wider than the row (a long category name) is squeezed to fit.
                let natural = subviews[index].sizeThatFits(.unspecified)
                let size = CGSize(width: min(natural.width, bounds.width), height: natural.height)
                subviews[index].place(at: CGPoint(x: x, y: y + (row.height - size.height) / 2), proposal: ProposedViewSize(size))
                x += size.width + spacing
            }
            y += row.height + spacing
        }
    }

    private struct Row {
        var indices: [Int] = []
        var width: CGFloat = 0
        var height: CGFloat = 0
    }

    private func arrange(_ subviews: Subviews, width: CGFloat) -> [Row] {
        var rows: [Row] = []
        var current = Row()
        for index in subviews.indices {
            let natural = subviews[index].sizeThatFits(.unspecified)
            let size = CGSize(width: min(natural.width, width), height: natural.height)
            let needed = current.indices.isEmpty ? size.width : current.width + spacing + size.width
            if needed > width && !current.indices.isEmpty {
                rows.append(current)
                current = Row()
            }
            current.width = current.indices.isEmpty ? size.width : current.width + spacing + size.width
            current.height = max(current.height, size.height)
            current.indices.append(index)
        }
        if !current.indices.isEmpty { rows.append(current) }
        return rows
    }
}
