import AppIntents
import DoneCore
import SwiftUI
import WidgetKit

/// What the widget shows, read from the shared tasks file.
struct DoneEntry: TimelineEntry {
    let date: Date
    let current: TaskItem?
    let currentCategory: TaskCategory?
    let active: Int
    let doneToday: Int
    /// Tasks the picker would draw from right now.
    let candidates: Int

    static let sample = DoneEntry(
        date: .now,
        current: TaskItem(
            id: "sample",
            name: "Practice guitar",
            durationMinutes: 25,
            categoryId: "hobby",
            createdAt: DoneDate.string(from: .now),
            startedAt: DoneDate.string(from: Date.now.addingTimeInterval(-9 * 60))
        ),
        currentCategory: TaskCategory.defaults.first { $0.id == "hobby" },
        active: 8,
        doneToday: 3,
        candidates: 7
    )

    static func load(now: Date = .now) -> DoneEntry {
        let library = (try? LibraryFile.shared.load()) ?? Library()
        let preferences = PreferencesStore.shared.load()
        let current = library.current
        return DoneEntry(
            date: now,
            current: current,
            currentCategory: current.flatMap { library.category(id: $0.categoryId) },
            active: library.activeTasks.count,
            doneToday: library.doneToday(now: now),
            candidates: Shuffle.candidates(
                library.tasks,
                categoryIds: preferences.effectiveCategoryIds(in: library),
                timeFilter: preferences.shuffleTimeFilter,
                categories: library.categories
            ).count
        )
    }
}

struct DoneProvider: TimelineProvider {
    func placeholder(in context: Context) -> DoneEntry { .sample }

    func getSnapshot(in context: Context, completion: @escaping (DoneEntry) -> Void) {
        completion(context.isPreview ? .sample : .load())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DoneEntry>) -> Void) {
        // The app reloads the widget whenever tasks change; midnight resets "done today".
        let calendar = Calendar.current
        let midnight = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: .now)) ?? .now.addingTimeInterval(3600)
        completion(Timeline(entries: [.load()], policy: .after(midnight)))
    }
}

struct NowWidget: Widget {
    let kind = "dev.adriangaona.done.now"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DoneProvider()) { entry in
            NowWidgetView(entry: entry)
        }
        .configurationDisplayName("done.")
        .description("The task you're doing now, or how today is going, with a button to pick your next task.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

struct NowWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: DoneEntry

    var body: some View {
        content
            .containerBackground(for: .widget) {
                if isAccessory { Color.clear } else { Palette.background }
            }
    }

    private var isAccessory: Bool {
        family == .accessoryCircular || family == .accessoryRectangular || family == .accessoryInline
    }

    @ViewBuilder
    private var content: some View {
        switch family {
        case .accessoryCircular: circular
        case .accessoryRectangular: rectangular
        case .accessoryInline: inline
        case .systemMedium: medium
        default: small
        }
    }

    private var startedAt: Date? { entry.current?.startedAt.flatMap { DoneDate.date(from: $0) } }

    // MARK: - Home Screen

    @ViewBuilder
    private var small: some View {
        if let current = entry.current {
            nowBlock(current)
                .widgetURL(URL(string: "done://task/\(current.id)"))
        } else {
            VStack(alignment: .leading, spacing: 2) {
                wordmark
                Spacer(minLength: 4)
                Text("\(entry.doneToday)")
                    .font(.system(size: 40, weight: .bold, design: .serif))
                    .foregroundStyle(Palette.ink)
                    .contentTransition(.numericText())
                Text("done today")
                    .font(.caption)
                    .foregroundStyle(Palette.ink)
                Text(entry.active == 0 ? "nothing waiting" : "\(entry.active) to go")
                    .font(.caption2)
                    .foregroundStyle(Palette.inkMuted)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .widgetURL(URL(string: "done://shuffle"))
        }
    }

    private var medium: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 2) {
                wordmark
                Spacer(minLength: 4)
                Text("\(entry.doneToday)")
                    .font(.system(size: 36, weight: .bold, design: .serif))
                    .foregroundStyle(Palette.ink)
                Text("done today")
                    .font(.caption)
                    .foregroundStyle(Palette.ink)
                Text("\(entry.active) to go")
                    .font(.caption2)
                    .foregroundStyle(Palette.inkMuted)
            }
            .frame(width: 96, alignment: .leading)

            VStack(alignment: .leading, spacing: 8) {
                if let current = entry.current {
                    nowBlock(current)
                    HStack(spacing: 8) {
                        Button(intent: CompleteNowIntent()) {
                            Label("Done", systemImage: "checkmark")
                                .font(.caption.weight(.semibold))
                        }
                        .tint(Palette.accent)
                        Button(intent: DropNowIntent()) {
                            Text("Drop").font(.caption)
                        }
                        .tint(Palette.inkMuted)
                    }
                } else {
                    Text("Got a few minutes?")
                        .font(.headline)
                        .fontDesign(.serif)
                        .foregroundStyle(Palette.ink)
                    Text(entry.candidates == 0 ? "Add a task in the app first." : "\(entry.candidates) task\(entry.candidates == 1 ? "" : "s") to pick from.")
                        .font(.caption)
                        .foregroundStyle(Palette.inkMuted)
                    Spacer(minLength: 0)
                    Button(intent: OpenShuffleIntent()) {
                        Label("Pick for me", systemImage: "shuffle")
                            .font(.caption.weight(.semibold))
                    }
                    .tint(Palette.accent)
                    .disabled(entry.candidates == 0)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }

    private var wordmark: some View {
        (Text("done") + Text(".").italic())
            .font(.system(.headline, design: .serif))
            .foregroundStyle(Palette.ink)
    }

    private func nowBlock(_ current: TaskItem) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 5) {
                if let category = entry.currentCategory {
                    Circle().fill(Color(hex: category.color)).frame(width: 7, height: 7)
                }
                Text("NOW")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Palette.accent)
            }
            Text(current.name)
                .font(.system(.subheadline, design: .serif).weight(.medium))
                .foregroundStyle(Palette.ink)
                .lineLimit(3)
            if let startedAt {
                HStack(spacing: 4) {
                    Text(startedAt, style: .timer)
                        .monospacedDigit()
                    if let minutes = current.durationMinutes {
                        Text("/ \(minutes) min")
                    }
                }
                .font(.caption)
                .foregroundStyle(Palette.inkMuted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Lock Screen

    private var circular: some View {
        Gauge(value: Double(entry.doneToday), in: 0...Double(max(1, entry.doneToday + entry.active))) {
            Image(systemName: "checkmark")
        } currentValueLabel: {
            Text("\(entry.doneToday)")
        }
        .gaugeStyle(.accessoryCircularCapacity)
        .widgetURL(URL(string: "done://shuffle"))
        .accessibilityLabel("\(entry.doneToday) done today, \(entry.active) to go")
    }

    @ViewBuilder
    private var rectangular: some View {
        if let current = entry.current {
            VStack(alignment: .leading, spacing: 1) {
                Text("Now").font(.caption2).foregroundStyle(.secondary)
                Text(current.name).font(.headline).lineLimit(1)
                if let startedAt {
                    Text(startedAt, style: .timer).font(.caption).monospacedDigit()
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .widgetURL(URL(string: "done://task/\(current.id)"))
        } else {
            VStack(alignment: .leading, spacing: 1) {
                Text("\(entry.doneToday) done today").font(.headline)
                Text("\(entry.active) to go").font(.caption)
                Text("Tap to pick one").font(.caption2).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .widgetURL(URL(string: "done://shuffle"))
        }
    }

    @ViewBuilder
    private var inline: some View {
        if let current = entry.current {
            Label(current.name, systemImage: "timer")
        } else {
            Label("\(entry.doneToday) done · \(entry.active) to go", systemImage: "checkmark.circle")
        }
    }
}
