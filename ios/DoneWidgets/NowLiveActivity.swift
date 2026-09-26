import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

/// The task in progress on the Lock Screen and in the Dynamic Island: elapsed
/// time, the estimate as a bar, and Done / Drop buttons.
struct NowLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: NowActivityAttributes.self) { context in
            NowLockScreenView(state: context.state)
                .activityBackgroundTint(Palette.background)
                .activitySystemActionForegroundColor(Palette.ink)
        } dynamicIsland: { context in
            let state = context.state
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        Circle().fill(Color(hex: state.categoryColor)).frame(width: 8, height: 8)
                        Text(state.categoryName)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(state.startedAt, style: .timer)
                        .font(.body.monospacedDigit())
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 72, alignment: .trailing)
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(state.taskName)
                            .font(.system(.headline, design: .serif))
                            .lineLimit(2)
                        EstimateBar(state: state)
                        HStack(spacing: 8) {
                            Button(intent: CompleteNowIntent()) {
                                Label("Done", systemImage: "checkmark")
                                    .font(.subheadline.weight(.semibold))
                                    .frame(maxWidth: .infinity)
                            }
                            .tint(Palette.accent)
                            Button(intent: DropNowIntent()) {
                                Text("Drop").font(.subheadline)
                            }
                            .tint(.gray)
                        }
                    }
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                Circle().fill(Color(hex: state.categoryColor)).frame(width: 10, height: 10)
            } compactTrailing: {
                Text(state.startedAt, style: .timer)
                    .font(.caption.monospacedDigit())
                    .frame(maxWidth: 48)
            } minimal: {
                Image(systemName: "timer")
                    .foregroundStyle(Color(hex: state.categoryColor))
            }
            .keylineTint(Palette.accent)
        }
    }
}

private struct NowLockScreenView: View {
    let state: NowActivityAttributes.ContentState

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Circle().fill(Color(hex: state.categoryColor)).frame(width: 8, height: 8)
                Text("NOW")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Palette.accent)
                if !state.categoryName.isEmpty {
                    Text("· \(state.categoryName)")
                        .font(.caption2)
                        .foregroundStyle(Palette.inkMuted)
                }
                Spacer()
                Text(state.startedAt, style: .timer)
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(Palette.ink)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 80, alignment: .trailing)
            }
            Text(state.taskName)
                .font(.system(.title3, design: .serif))
                .foregroundStyle(Palette.ink)
                .lineLimit(2)
            EstimateBar(state: state)
            HStack(spacing: 10) {
                Button(intent: CompleteNowIntent()) {
                    Label("Done", systemImage: "checkmark")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                }
                .tint(Palette.accent)
                Button(intent: DropNowIntent()) {
                    Text("Drop").font(.subheadline)
                }
                .tint(Palette.inkMuted)
            }
        }
        .padding(16)
    }
}

/// The estimate as a bar that fills on its own (no updates needed).
private struct EstimateBar: View {
    let state: NowActivityAttributes.ContentState

    var body: some View {
        if let end = state.endsAt, end > state.startedAt {
            HStack(spacing: 8) {
                ProgressView(timerInterval: state.startedAt...end, countsDown: false) {
                    EmptyView()
                } currentValueLabel: {
                    EmptyView()
                }
                .tint(Palette.accent)
                if let minutes = state.durationMinutes {
                    Text("\(minutes) min")
                        .font(.caption2)
                        .foregroundStyle(Palette.inkMuted)
                }
            }
        }
    }
}
