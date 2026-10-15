import DoneCore
import SwiftUI

/// "Pick for me": how much time you have, which categories, and the Shuffle
/// button with how many tasks fit. Time is one segmented row (other lengths
/// behind its last segment) and categories one scrolling row, each chip saying
/// how many tasks it holds, so the card stays short and the list stays in view.
/// When nothing fits it offers the smallest change that works ("Try 30 min").
/// Your choices are remembered.
struct PickerCard: View {
    @Environment(LibraryStore.self) private var store
    @Environment(Router.self) private var router
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var moreOpen = false
    @Namespace private var thumb

    private var filter: TimeFilter { store.preferences.shuffleTimeFilter }

    var body: some View {
        let count = store.candidates.count

        VStack(alignment: .leading, spacing: 14) {
            SectionLabel("Pick for me")

            timeRow

            if moreOpen {
                TimeFilterEditor(filter: filterBinding)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }

            categoryRow

            Button {
                router.shuffle()
            } label: {
                Label(count == 0 ? "Shuffle" : "Shuffle \(count) task\(count == 1 ? "" : "s")", systemImage: "shuffle")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .foregroundStyle(count == 0 ? Palette.inkMuted : Palette.onAccent)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(count == 0 ? Palette.inkFaint.opacity(0.5) : Palette.accent)
                    )
                    .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(count == 0)
            .accessibilityIdentifier("shuffleButton")

            if let loosening = store.loosening {
                hint(for: loosening)
            }
        }
        .card()
    }

    // MARK: - Time

    private enum TimeChoice: Hashable {
        case any
        case preset(Int)
        /// At least / between / exactly, or "at most" a length that isn't a preset.
        case other
    }

    private struct TimeOption: Identifiable {
        let choice: TimeChoice
        let title: String?
        var systemImage: String?
        let accessibilityLabel: String
        /// Nothing would fit: shown faded, still tappable.
        var isEmpty = false

        var id: TimeChoice { choice }
    }

    private var timeOptions: [TimeOption] {
        var options = [TimeOption(choice: .any, title: "Any", accessibilityLabel: "Any length")]
        for minutes in Shuffle.timePresets {
            var preset = filter
            preset.mode = .max
            preset.value = minutes
            options.append(TimeOption(
                choice: .preset(minutes),
                title: "\(minutes)m",
                accessibilityLabel: "\(minutes) minutes or less",
                isEmpty: fitCount(timeFilter: preset) == 0
            ))
        }
        let other = otherTitle
        options.append(TimeOption(
            choice: .other,
            title: other,
            systemImage: other == nil ? "slider.horizontal.3" : nil,
            accessibilityLabel: other.map { "Other length, \($0)" } ?? "Other lengths"
        ))
        return options
    }

    /// The segment that's on. "Other" while its editor is open, or when the
    /// filter is one the presets can't show.
    private var selectedTime: TimeChoice {
        if moreOpen || !isSimple(filter) { return .other }
        if filter.mode == .any { return .any }
        return .preset(filter.value ?? 0)
    }

    /// What the last segment says when it holds the filter: "≥30m", "20–45m".
    private var otherTitle: String? {
        guard !isSimple(filter) else { return nil }
        switch filter.mode {
        case .max: return filter.value.map { "≤\($0)m" }
        case .min: return filter.value.map { "≥\($0)m" }
        case .exact: return filter.value.map { "=\($0)m" }
        case .range:
            guard let low = filter.min, let high = filter.max else { return nil }
            return "\(low)–\(high)m"
        case .any: return nil
        }
    }

    @ViewBuilder
    private var timeRow: some View {
        let selected = selectedTime
        if typeSize.isAccessibilitySize {
            // Six segments don't fit across at these sizes: wrap them as chips.
            FlowLayout(spacing: 6) {
                ForEach(timeOptions) { option in
                    Chip(isOn: option.choice == selected, action: { choose(option.choice) }) {
                        timeLabel(option)
                    }
                    .accessibilityLabel(option.accessibilityLabel)
                }
            }
        } else {
            HStack(spacing: 2) {
                ForEach(timeOptions) { option in
                    segment(option, isOn: option.choice == selected)
                }
            }
            .padding(3)
            .background(Capsule().fill(Palette.background))
            .overlay(Capsule().strokeBorder(Palette.inkFaint.opacity(0.8), lineWidth: 1))
            .animation(.snappy(duration: 0.28), value: selected)
        }
    }

    private func segment(_ option: TimeOption, isOn: Bool) -> some View {
        Button {
            choose(option.choice)
        } label: {
            timeLabel(option)
                .font(.subheadline.weight(isOn ? .semibold : .regular))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .foregroundStyle(isOn ? Palette.onAccent : option.isEmpty ? Palette.inkMuted.opacity(0.7) : Palette.ink)
                .frame(maxWidth: .infinity, minHeight: 34)
                .background {
                    if isOn {
                        Capsule()
                            .fill(Palette.accent)
                            .matchedGeometryEffect(id: "thumb", in: thumb)
                    }
                }
                .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(option.accessibilityLabel)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }

    @ViewBuilder
    private func timeLabel(_ option: TimeOption) -> some View {
        if let title = option.title {
            Text(title)
        } else if let systemImage = option.systemImage {
            Image(systemName: systemImage)
        }
    }

    private func choose(_ choice: TimeChoice) {
        Feedback.shared.play(.select)
        switch choice {
        case .any: choosePreset(nil)
        case .preset(let minutes): choosePreset(minutes)
        case .other: withAnimation(.snappy) { moreOpen.toggle() }
        }
    }

    private var filterBinding: Binding<TimeFilter> { store.binding(\.shuffleTimeFilter) }

    private func isSimple(_ filter: TimeFilter) -> Bool {
        filter.mode == .any || (filter.mode == .max && Shuffle.timePresets.contains(filter.value ?? -1))
    }

    private func choosePreset(_ minutes: Int?) {
        withAnimation(.snappy) { moreOpen = false }
        var next = filter
        if let minutes {
            next.mode = .max
            next.value = minutes
        } else {
            next.mode = .any
        }
        store.updatePreferences { $0.shuffleTimeFilter = next }
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

    /// How many tasks would be in the pool with these categories (none = all
    /// the chips) and this time filter.
    private func fitCount(categoryIds: [String]? = nil, timeFilter: TimeFilter? = nil) -> Int {
        Shuffle.candidates(
            store.library.tasks,
            categoryIds: categoryIds ?? store.pickerCategoryIds,
            timeFilter: timeFilter ?? filter,
            categories: store.library.categories
        ).count
    }

    private var categoryRow: some View {
        // "All" under a Focus means all of the Focus's categories.
        let allIds = focus == nil ? [] : chipCategories.map(\.id)

        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                CategoryChip(name: "All", color: nil, count: fitCount(categoryIds: allIds), isOn: selectedIds.isEmpty) {
                    Feedback.shared.play(.select)
                    store.updatePreferences { $0.shuffleCategoryIds = [] }
                }
                ForEach(chipCategories) { category in
                    CategoryChip(
                        name: category.name,
                        color: category.swiftUIColor,
                        count: fitCount(categoryIds: [category.id]),
                        isOn: selectedIds.contains(category.id)
                    ) {
                        Feedback.shared.play(.select)
                        store.toggleShuffleCategory(category.id)
                    }
                }
            }
        }
        // Scroll edge to edge inside the card, fading out at its sides. The mask
        // goes on before the negative padding so it spans the full width.
        .contentMargins(.horizontal, 18, for: .scrollContent)
        .mask {
            HStack(spacing: 0) {
                LinearGradient(colors: [.clear, .black], startPoint: .leading, endPoint: .trailing).frame(width: 18)
                Rectangle()
                LinearGradient(colors: [.black, .clear], startPoint: .leading, endPoint: .trailing).frame(width: 18)
            }
        }
        .padding(.horizontal, -18)
    }

    // MARK: - Hints

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
                    withAnimation(.snappy) { moreOpen = moreOpen && !isSimple(suggestion) }
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
}

/// A category to shuffle from: its dot, its name and how many tasks it holds
/// that fit the time. On, it takes the category's colour; "All" (no colour)
/// takes the accent.
private struct CategoryChip: View {
    let name: String
    let color: Color?
    let count: Int
    let isOn: Bool
    let action: () -> Void

    var body: some View {
        let tint = color ?? Palette.accent

        Button(action: action) {
            HStack(spacing: 6) {
                if let color {
                    Circle().fill(color).frame(width: 7, height: 7)
                }
                Text(name)
                    .foregroundStyle(count == 0 && !isOn ? Palette.inkMuted : Palette.ink)
                Text("\(count)")
                    .font(.caption.weight(.semibold))
                    .monospacedDigit()
                    .foregroundStyle(isOn ? Palette.ink.opacity(0.75) : Palette.inkMuted)
            }
            .font(.subheadline.weight(isOn ? .medium : .regular))
            .lineLimit(1)
            .padding(.horizontal, 12)
            .frame(minHeight: 32)
            .background(Capsule().fill(isOn ? tint.opacity(0.14) : Palette.surface))
            .overlay(Capsule().strokeBorder(isOn ? tint : Palette.inkFaint, lineWidth: isOn ? 1.5 : 1))
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(name), \(count) task\(count == 1 ? "" : "s")")
        .accessibilityAddTraits(isOn ? [.isButton, .isSelected] : .isButton)
    }
}

/// The last time segment: at most / at least / between / exactly, in minutes.
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
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Palette.background))
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
