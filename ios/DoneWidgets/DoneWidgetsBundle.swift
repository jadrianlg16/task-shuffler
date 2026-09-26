import SwiftUI
import WidgetKit

/// Everything the widget extension shows: the home and Lock Screen widget, the
/// Live Activity, and (iOS 18) the Control Center button.
@main
struct DoneWidgetsBundle: WidgetBundle {
    var body: some Widget {
        NowWidget()
        NowLiveActivity()
        // Needs Xcode 16.1 or later: 16.0's builder crashed on iOS 17 with this check.
        if #available(iOS 18.0, *) {
            PickControl()
        }
    }
}
