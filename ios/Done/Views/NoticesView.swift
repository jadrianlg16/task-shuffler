import DoneCore
import SwiftUI

/// At most one note at a time: the Focus filter in use, the examples banner, or
/// the backup reminder.
struct NoticesView: View {
    @Environment(LibraryStore.self) private var store
    @State private var exporting = false

    var body: some View {
        if let focusIds = store.preferences.focusCategoryIds, !focusIds.isEmpty {
            focusNote(focusIds)
        }
        if store.library.exampleCount > 0 {
            examplesNote
        }
        if store.shouldRemindBackup {
            backupNote
        }
    }

    private func focusNote(_ ids: [String]) -> some View {
        let names = ids.compactMap { store.library.category(id: $0)?.name }
        return HStack(spacing: 8) {
            Image(systemName: "moon.fill")
                .foregroundStyle(Palette.accent)
            Text("Focus: only \(names.joined(separator: ", "))")
                .font(.footnote)
                .foregroundStyle(Palette.inkMuted)
        }
        .accessibilityElement(children: .combine)
    }

    private var examplesNote: some View {
        HStack(spacing: 12) {
            Text("These are example tasks. Clear them when you're ready to add your own.")
                .font(.footnote)
                .foregroundStyle(Palette.inkMuted)
                .frame(maxWidth: .infinity, alignment: .leading)
            Button("Clear examples") { store.clearExamples() }
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Palette.accent)
                .accessibilityIdentifier("clearExamples")
        }
        .card()
    }

    private var backupNote: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label {
                Text("Keep a copy of your \(store.library.ownTaskCount) tasks. ")
                    .fontWeight(.semibold)
                + Text("A backup is one small file you can import on any device, including the web version.")
            } icon: {
                Image(systemName: "square.and.arrow.down")
                    .foregroundStyle(Palette.accent)
            }
            .font(.footnote)
            .foregroundStyle(Palette.ink)
            HStack(spacing: 10) {
                Button("Save a backup") { exporting = true }
                    .font(.footnote.weight(.semibold))
                    .buttonStyle(.borderedProminent)
                    .tint(Palette.accent)
                Button("Later") { store.snoozeBackupReminder() }
                    .font(.footnote)
                    .foregroundStyle(Palette.inkMuted)
            }
        }
        .card(accentEdge: true)
        .backupExporter(isPresented: $exporting)
    }
}
