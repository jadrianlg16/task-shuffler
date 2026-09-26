import SwiftUI

@main
struct DoneApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var store = LibraryStore.shared
    @State private var router = Router.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .environment(router)
        }
        .commands {
            // iPad keyboards and Macs: shown when you hold ⌘, and in the Mac menu bar.
            CommandMenu("Tasks") {
                Button("New Task") { router.perform(.addTask) }
                    .keyboardShortcut("n")
                Button("Shuffle") { router.perform(.shuffle) }
                    .keyboardShortcut("r")
                Button("Search") { router.focusSearch += 1 }
                    .keyboardShortcut("f")
                Divider()
                Button("Archive") { router.sheet = .archive }
                    .keyboardShortcut("a", modifiers: [.command, .shift])
            }
            CommandGroup(replacing: .appSettings) {
                Button("Settings…") { router.sheet = .settings }
                    .keyboardShortcut(",")
            }
        }
    }
}
