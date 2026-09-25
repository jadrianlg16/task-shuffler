import DoneCore
import SwiftUI

/// Phase 0 placeholder: proves the app builds, runs on a phone and uses
/// DoneCore. The real screens replace it in phases 3 and 4.
struct ContentView: View {
    @State private var tasks = ExampleTasks.make()
    @State private var picked: TaskItem?

    var body: some View {
        NavigationStack {
            List {
                if let picked {
                    Section("Picked for you") {
                        Text(picked.name)
                            .font(.headline)
                    }
                }
                Section("Example tasks") {
                    ForEach(tasks) { task in
                        HStack {
                            Text(task.name)
                            Spacer()
                            if let minutes = task.durationMinutes {
                                Text("\(minutes) min")
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("done.")
            .toolbar {
                Button("Shuffle", action: shuffle)
            }
        }
    }

    private func shuffle() {
        let pool = Shuffle.candidates(tasks, categoryIds: [], timeFilter: .anyLength, categories: TaskCategory.defaults)
        picked = Shuffle.select(pool)
    }
}

#Preview {
    ContentView()
}
