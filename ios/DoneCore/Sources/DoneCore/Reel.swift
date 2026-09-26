import Foundation

/// The shuffle reel's rows and motion (src/components/shuffle/RouletteWheel.tsx).
/// The drawing lives in the app; what's shown and how it moves lives here.
public enum Reel {
    public static let rowHeight = 48.0
    public static let visibleRows = 5
    /// The band where the pick lands.
    public static let centerRow = visibleRows / 2
    public static let passes = 4
    public static let spinSeconds = 2.5
    /// How long the winner sits in the band before the result shows.
    public static let holdSeconds = 0.65

    /// Several shuffled passes over the candidates, then the winner, then enough
    /// rows to fill the window under the band. The winner's own name is kept
    /// out of the rows just above the band, so it never lands looking doubled.
    public static func strip<G: RandomNumberGenerator>(
        candidates: [TaskItem],
        winner: TaskItem,
        using generator: inout G
    ) -> [TaskItem] {
        var strip: [TaskItem] = []
        for _ in 0..<passes {
            strip.append(contentsOf: candidates.shuffled(using: &generator))
        }
        let others = candidates.filter { $0.id != winner.id }
        if !others.isEmpty {
            for index in max(0, strip.count - centerRow)..<strip.count where strip[index].id == winner.id {
                strip[index] = others[Int.random(in: 0..<others.count, using: &generator)]
            }
        }
        strip.append(winner)
        let tail = (others.isEmpty ? candidates : others).shuffled(using: &generator)
        for index in 0..<centerRow where !tail.isEmpty {
            strip.append(tail[index % tail.count])
        }
        return strip
    }

    public static func strip(candidates: [TaskItem], winner: TaskItem) -> [TaskItem] {
        var generator = SystemRandomNumberGenerator()
        return strip(candidates: candidates, winner: winner, using: &generator)
    }

    /// Where the winner sits in a strip built above.
    public static func winnerIndex(stripCount: Int) -> Int { stripCount - 1 - centerRow }

    /// How far the strip moves (negative = up) to put the winner in the band.
    public static func travel(stripCount: Int) -> Double {
        -Double(winnerIndex(stripCount: stripCount) - centerRow) * rowHeight
    }

    /// The web reel's easing, CSS `cubic-bezier(0.15, 0.85, 0.35, 1)`: fast
    /// start, long gentle stop. `t` and the result run 0...1.
    public static func eased(_ t: Double) -> Double {
        cubicBezier(t, x1: 0.15, y1: 0.85, x2: 0.35, y2: 1)
    }

    static func cubicBezier(_ t: Double, x1: Double, y1: Double, x2: Double, y2: Double) -> Double {
        if t <= 0 { return 0 }
        if t >= 1 { return 1 }
        func bezier(_ s: Double, _ p1: Double, _ p2: Double) -> Double {
            let inverse = 1 - s
            return 3 * inverse * inverse * s * p1 + 3 * inverse * s * s * p2 + s * s * s
        }
        func slope(_ s: Double, _ p1: Double, _ p2: Double) -> Double {
            let inverse = 1 - s
            return 3 * inverse * inverse * p1 + 6 * inverse * s * (p2 - p1) + 3 * s * s * (1 - p2)
        }
        // Solve x(s) = t for s: Newton's method, then bisection if it stalls.
        var s = t
        for _ in 0..<8 {
            let error = bezier(s, x1, x2) - t
            if abs(error) < 1e-7 { return bezier(s, y1, y2) }
            let d = slope(s, x1, x2)
            if abs(d) < 1e-6 { break }
            s -= error / d
        }
        var low = 0.0, high = 1.0
        s = t
        for _ in 0..<40 {
            let x = bezier(s, x1, x2)
            if abs(x - t) < 1e-7 { break }
            if x < t { low = s } else { high = s }
            s = (low + high) / 2
        }
        return bezier(s, y1, y2)
    }
}
