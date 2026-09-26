import AppIntents
import SwiftUI
import WidgetKit

/// Control Center, Lock Screen and Action button (iOS 18): opens done. and
/// shuffles.
@available(iOS 18.0, *)
struct PickControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "dev.adriangaona.done.pick") {
            ControlWidgetButton(action: OpenShuffleIntent()) {
                Label("Pick for Me", systemImage: "shuffle")
            }
        }
        .displayName("Pick for Me")
        .description("Opens done. and picks a task for you.")
    }
}
