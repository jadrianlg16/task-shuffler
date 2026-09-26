import DoneCore
import SwiftUI

/// The task you started, pinned above the picker until you finish or drop it.
struct NowCard: View {
    @Environment(LibraryStore.self) private var store
    let task: TaskItem

    var body: some View {
        // Redraws every 30 seconds so the minutes move.
        TimelineView(.periodic(from: .now, by: 30)) { timeline in
            content(now: timeline.date)
        }
    }

    private func content(now: Date) -> some View {
        let category = store.library.category(id: task.categoryId)
        let progress = NowStatus.progress(for: task, now: now)
        let over = (task.durationMinutes.map { NowStatus.elapsedMinutes(since: task.startedAt ?? "", now: now) > $0 }) ?? false

        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                SectionLabel("Now", color: Palette.accent)
                Spacer()
                Text(NowStatus.text(for: task, now: now))
                    .font(.caption)
                    .foregroundStyle(Palette.inkMuted)
                    .accessibilityIdentifier("nowStatus")
            }

            Text(task.name)
                .font(.title2)
                .fontDesign(.serif)
                .foregroundStyle(Palette.ink)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityIdentifier("nowTitle")

            HStack(spacing: 12) {
                if let minutes = task.durationMinutes { Text(minutesText(minutes)) }
                if let category { CategoryBadge(category: category) }
            }
            .font(.caption)
            .foregroundStyle(Palette.inkMuted)

            if let progress {
                ProgressBar(value: progress, fill: over ? Palette.inkMuted : Palette.accent)
                    .padding(.top, 2)
                    .accessibilityLabel("Time used")
            }

            HStack(spacing: 10) {
                Button {
                    store.complete(task.id)
                } label: {
                    Label("Done", systemImage: "checkmark")
                        .primaryButtonStyle()
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("nowDone")

                Button("Drop") { store.drop(task.id) }
                    .font(.subheadline)
                    .foregroundStyle(Palette.inkMuted)
                    .padding(.horizontal, 14)
                    .frame(minHeight: 44)
                    .accessibilityHint("Stops without finishing; it goes back in the pool")
                    .accessibilityIdentifier("nowDrop")
            }
            .padding(.top, 4)
        }
        .card(accentEdge: true)
        .accessibilityElement(children: .contain)
    }
}
