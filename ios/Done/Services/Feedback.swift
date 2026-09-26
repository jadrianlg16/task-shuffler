import AVFoundation
import UIKit

/// Sounds and haptics. Sounds use the ambient audio session, so they respect
/// the silent switch and mix with whatever else is playing. Both can be turned
/// off in Settings.
@MainActor
final class Feedback {
    static let shared = Feedback()

    enum Event {
        /// A row passing the band while the reel spins.
        case tick
        /// The reel landing on a task.
        case land
        /// Starting a task.
        case start
        /// Finishing a task.
        case done
        /// Dropping a task back into the pool.
        case drop
        /// Adding a task, small confirmations.
        case tap
    }

    private var soundsOn = true
    private var hapticsOn = true
    private var sessionReady = false
    /// Ticks come faster than one player can restart, so they rotate through a few.
    private var tickPlayers: [AVAudioPlayer] = []
    private var nextTick = 0
    private var players: [String: AVAudioPlayer] = [:]
    private var lastTick = Date.distantPast

    private let selection = UISelectionFeedbackGenerator()
    private let soft = UIImpactFeedbackGenerator(style: .soft)
    private let light = UIImpactFeedbackGenerator(style: .light)
    private let notification = UINotificationFeedbackGenerator()

    private init() {}

    func configure(soundsOn: Bool, hapticsOn: Bool) {
        self.soundsOn = soundsOn
        self.hapticsOn = hapticsOn
    }

    /// Warms up the haptic engine and sounds just before the reel starts.
    func prepare() {
        if hapticsOn {
            selection.prepare()
            notification.prepare()
        }
        if soundsOn { loadSounds() }
    }

    func play(_ event: Event) {
        switch event {
        case .tick:
            // A tick at most every 45 ms: the first rows fly past faster than that.
            let now = Date()
            guard now.timeIntervalSince(lastTick) >= 0.045 else { return }
            lastTick = now
            if hapticsOn { selection.selectionChanged() }
            playTick()
        case .land:
            if hapticsOn { notification.notificationOccurred(.success) }
            playSound("land")
        case .start:
            if hapticsOn { soft.impactOccurred() }
            playSound("start")
        case .done:
            if hapticsOn { notification.notificationOccurred(.success) }
            playSound("done")
        case .drop:
            if hapticsOn { light.impactOccurred(intensity: 0.6) }
        case .tap:
            if hapticsOn { light.impactOccurred(intensity: 0.5) }
        }
    }

    // MARK: - Sounds

    private func loadSounds() {
        guard players.isEmpty else { return }
        if !sessionReady {
            try? AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers])
            sessionReady = true
        }
        for name in ["land", "start", "done"] {
            if let player = makePlayer(name) { players[name] = player }
        }
        tickPlayers = (0..<4).compactMap { _ in makePlayer("tick") }
    }

    private func makePlayer(_ name: String) -> AVAudioPlayer? {
        guard let url = Bundle.main.url(forResource: name, withExtension: "wav"),
              let player = try? AVAudioPlayer(contentsOf: url)
        else { return nil }
        player.prepareToPlay()
        return player
    }

    private func playSound(_ name: String) {
        guard soundsOn else { return }
        loadSounds()
        guard let player = players[name] else { return }
        player.currentTime = 0
        player.play()
    }

    private func playTick() {
        guard soundsOn else { return }
        loadSounds()
        guard !tickPlayers.isEmpty else { return }
        let player = tickPlayers[nextTick % tickPlayers.count]
        nextTick += 1
        player.currentTime = 0
        player.play()
    }
}
