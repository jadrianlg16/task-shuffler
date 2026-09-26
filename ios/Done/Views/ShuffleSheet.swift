import DoneCore
import SwiftUI

/// The shuffle: a short reel lands on one task, then Start / Shuffle again /
/// Not feeling it. Skipped tasks stay out until the sheet closes. With Reduce
/// Motion on (or a single candidate) the reel is skipped.
struct ShuffleSheet: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let request: ShuffleRequest

    private enum Phase { case pending, spinning, result }

    @State private var phase = Phase.pending
    @State private var winner: TaskItem
    @State private var skipped: Set<String> = []
    @State private var round = 0

    init(request: ShuffleRequest) {
        self.request = request
        _winner = State(initialValue: request.winner)
    }

    private var available: [TaskItem] { request.candidates.filter { !skipped.contains($0.id) } }

    var body: some View {
        ScrollView {
            VStack {
                switch phase {
                case .pending:
                    Color.clear.frame(height: Reel.rowHeight * Double(Reel.visibleRows))
                case .spinning:
                    ReelView(candidates: available, winner: winner) {
                        withAnimation(.spring(response: 0.45, dampingFraction: 0.8)) { phase = .result }
                    }
                    .id(round)
                case .result:
                    result
                        .transition(.opacity.combined(with: .scale(scale: 0.96)))
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 28)
            .padding(.bottom, 16)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
        }
        .scrollBounceBehavior(.basedOnSize)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationBackground(Palette.background)
        .onAppear {
            phase = shouldSpin(poolSize: available.count) ? .spinning : .result
            if phase == .result && !request.isManual { Feedback.shared.play(.land) }
        }
    }

    private func shouldSpin(poolSize: Int) -> Bool {
        !request.isManual && poolSize > 1 && !reduceMotion && !AppEnvironment.isUITesting
    }

    // MARK: - Result

    private var result: some View {
        let category = store.library.category(id: winner.categoryId)

        return VStack(spacing: 18) {
            VStack(spacing: 10) {
                SectionLabel("Your next task")
                Text(winner.name)
                    .font(.title)
                    .fontDesign(.serif)
                    .foregroundStyle(Palette.ink)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("pickedTask")
                HStack(spacing: 12) {
                    if let minutes = winner.durationMinutes { Text(minutesText(minutes)) }
                    if let category { CategoryBadge(category: category) }
                }
                .font(.caption)
                .foregroundStyle(Palette.inkMuted)
            }

            VStack(spacing: 10) {
                Button {
                    store.start(winner.id)
                    dismiss()
                } label: {
                    Label("Start", systemImage: "play.fill")
                        .primaryButtonStyle()
                }
                .buttonStyle(.plain)
                .keyboardShortcut(.defaultAction)
                .accessibilityIdentifier("startButton")

                if !request.isManual {
                    HStack(spacing: 10) {
                        Button { spin(available) } label: {
                            Text("Shuffle again").secondaryButtonStyle()
                        }
                        .buttonStyle(.plain)
                        if available.count > 1 {
                            Button { notFeelingIt() } label: {
                                Text("Not feeling it").secondaryButtonStyle()
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                Button { dismiss() } label: {
                    Text("Back to list")
                        .font(.subheadline)
                        .foregroundStyle(Palette.inkMuted)
                        .frame(maxWidth: .infinity, minHeight: 40)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .keyboardShortcut(.cancelAction)

                if !skipped.isEmpty {
                    Text("\(skipped.count) skipped until you close this")
                        .font(.caption2)
                        .foregroundStyle(Palette.inkMuted)
                }
            }
        }
    }

    private func spin(_ pool: [TaskItem]) {
        guard let next = Shuffle.select(pool) else {
            dismiss()
            return
        }
        Feedback.shared.prepare()
        winner = next
        round += 1
        if shouldSpin(poolSize: pool.count) {
            phase = .spinning
        } else {
            Feedback.shared.play(.land)
            phase = .result
        }
    }

    private func notFeelingIt() {
        skipped.insert(winner.id)
        spin(request.candidates.filter { !skipped.contains($0.id) })
    }
}

/// The reel: rows fly up past a band and slow to a stop on the winner, with a
/// tick (sound and haptic) as rows pass and a chime when it lands.
struct ReelView: View {
    let candidates: [TaskItem]
    let winner: TaskItem
    let onFinish: () -> Void

    @State private var strip: [TaskItem] = []
    @State private var offset = 0.0
    @State private var landed = false

    private let rowHeight = Reel.rowHeight
    private var winnerIndex: Int { Reel.winnerIndex(stripCount: strip.count) }

    var body: some View {
        VStack(spacing: 14) {
            SectionLabel(landed ? "Landed" : "Shuffling…")

            ZStack(alignment: .top) {
                Rectangle()
                    .fill(Palette.accentSoft)
                    .overlay(alignment: .top) { Rectangle().fill(Palette.accent).frame(height: 1) }
                    .overlay(alignment: .bottom) { Rectangle().fill(Palette.accent).frame(height: 1) }
                    .frame(height: rowHeight)
                    .padding(.top, rowHeight * Double(Reel.centerRow))

                VStack(spacing: 0) {
                    ForEach(Array(strip.enumerated()), id: \.offset) { index, task in
                        let isWinner = index == winnerIndex
                        Text(task.name)
                            .font(.subheadline.weight(landed && isWinner ? .semibold : .regular))
                            .foregroundStyle(landed && isWinner ? Palette.ink : Palette.inkMuted)
                            .opacity(landed && !isWinner ? 0.45 : 1)
                            .scaleEffect(landed && isWinner ? 1.08 : 1)
                            .lineLimit(1)
                            .padding(.horizontal, 16)
                            .frame(maxWidth: .infinity)
                            .frame(height: rowHeight)
                    }
                }
                .offset(y: offset)
            }
            .frame(height: rowHeight * Double(Reel.visibleRows), alignment: .top)
            .frame(maxWidth: 360)
            .background(Palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(alignment: .top) { fade(from: .top) }
            .overlay(alignment: .bottom) { fade(from: .bottom) }
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Palette.inkFaint, lineWidth: 1))
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(landed ? "Landed on \(winner.name)" : "Shuffling")
        .task { await spin() }
    }

    private func fade(from edge: VerticalEdge) -> some View {
        LinearGradient(
            colors: [Palette.surface, Palette.surface.opacity(0)],
            startPoint: edge == .top ? .top : .bottom,
            endPoint: edge == .top ? .bottom : .top
        )
        .frame(height: rowHeight * 1.5)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .allowsHitTesting(false)
    }

    private func spin() async {
        strip = Reel.strip(candidates: candidates, winner: winner)
        let travel = Reel.travel(stripCount: strip.count)
        let start = Date()
        var lastRow = 0
        while !Task.isCancelled {
            let t = min(1, Date().timeIntervalSince(start) / Reel.spinSeconds)
            offset = travel * Reel.eased(t)
            let row = Int((-offset / rowHeight).rounded())
            if row != lastRow {
                lastRow = row
                Feedback.shared.play(.tick)
            }
            if t >= 1 { break }
            try? await Task.sleep(nanoseconds: 16_000_000)
        }
        guard !Task.isCancelled else { return }
        withAnimation(.spring(response: 0.3, dampingFraction: 0.55)) { landed = true }
        Feedback.shared.play(.land)
        try? await Task.sleep(nanoseconds: UInt64(Reel.holdSeconds * 1_000_000_000))
        guard !Task.isCancelled else { return }
        onFinish()
    }
}
