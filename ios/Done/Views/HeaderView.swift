import DoneCore
import SwiftUI

/// Wordmark, today's date, and today at a glance: active tasks, tasks done
/// today, and a bar that fills as today's work gets done.
struct HeaderView: View {
    @Environment(LibraryStore.self) private var store

    var body: some View {
        let active = store.library.activeTasks.count
        let doneToday = store.library.doneToday()
        let total = active + doneToday

        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                (Text("done") + Text(".").italic())
                    .font(.largeTitle)
                    .fontDesign(.serif)
                    .foregroundStyle(Palette.ink)
                    .accessibilityLabel("done.")
                    .accessibilityAddTraits(.isHeader)
                Text(Date.now, format: .dateTime.weekday(.wide).month(.wide).day())
                    .font(.subheadline)
                    .foregroundStyle(Palette.inkMuted)
            }

            HStack(alignment: .firstTextBaseline, spacing: 28) {
                stat(active, "Active")
                stat(doneToday, "Done today")
            }

            ProgressBar(value: total > 0 ? Double(doneToday) / Double(total) : 0)
                .accessibilityLabel("Done today")
        }
        .padding(.vertical, 6)
    }

    private func stat(_ value: Int, _ label: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("\(value)")
                .font(.title.weight(.bold))
                .fontDesign(.serif)
                .foregroundStyle(Palette.ink)
                .contentTransition(.numericText(value: Double(value)))
                .animation(.snappy, value: value)
            Text(label.uppercased())
                .font(.caption2.weight(.medium))
                .tracking(0.6)
                .foregroundStyle(Palette.inkMuted)
        }
        .accessibilityElement(children: .combine)
    }
}
