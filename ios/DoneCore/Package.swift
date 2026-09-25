// swift-tools-version:5.10
import PackageDescription

// The logic behind done., shared by the app and (later) its widgets and Siri
// intents. No UI code here. Ported from the web app's src/utils, src/data and
// src/lib; ParityTests checks the answers against the web code's own.
let package = Package(
    name: "DoneCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "DoneCore", targets: ["DoneCore"]),
    ],
    targets: [
        .target(name: "DoneCore"),
        .testTarget(
            name: "DoneCoreTests",
            dependencies: ["DoneCore"],
            resources: [.copy("Fixtures")]
        ),
    ]
)
