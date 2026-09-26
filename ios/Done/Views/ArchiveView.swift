import DoneCore
import SwiftUI

/// Finished tasks, newest first, grouped Today / This week / Earlier. Restore
/// them, or delete them for good.
struct ArchiveView: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var pendingDelete: TaskItem?

    var body: some View {
        let groups = Archive.group(store.library.tasks)

        NavigationStack {
            List {
                if groups.isEmpty {
                    EmptyStateView(
                        systemImage: "archivebox",
                        title: "Nothing here yet",
                        message: "Tasks you finish land here, in case you want one back."
                    )
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                }
                ForEach(groups, id: \.label) { group in
                    Section {
                        ForEach(group.items) { task in
                            row(task)
                        }
                    } header: {
                        HStack {
                            SectionLabel(group.label)
                            Spacer()
                            Text("\(group.items.count)").font(.caption2).foregroundStyle(Palette.inkMuted)
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Palette.background)
            .navigationTitle("Archive")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .confirmationDialog(
                "Delete for good?",
                isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } }),
                titleVisibility: .visible,
                presenting: pendingDelete
            ) { task in
                Button("Delete", role: .destructive) {
                    store.delete(task.id, showUndo: false)
                    pendingDelete = nil
                }
            } message: { task in
                Text("“\(task.name)” will be permanently removed. This can't be undone.")
            }
        }
        .tint(Palette.accent)
    }

    private func row(_ task: TaskItem) -> some View {
        let category = store.library.category(id: task.categoryId)
        let completed = task.completedAt.flatMap { DoneDate.date(from: $0) }

        return HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(task.name)
                    .strikethrough(color: Palette.inkMuted)
                    .foregroundStyle(Palette.inkMuted)
                HStack(spacing: 10) {
                    if let minutes = task.durationMinutes { Text(minutesText(minutes)) }
                    if let category { CategoryBadge(category: category) }
                    if let completed { Text(completed, format: .relative(presentation: .named)) }
                }
                .font(.caption)
                .foregroundStyle(Palette.inkMuted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Button {
                store.restore(task.id)
            } label: {
                Image(systemName: "arrow.uturn.backward")
                    .frame(width: 40, height: 40)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel("Restore \(task.name)")

            Button {
                pendingDelete = task
            } label: {
                Image(systemName: "trash")
                    .foregroundStyle(Palette.danger)
                    .frame(width: 40, height: 40)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel("Delete \(task.name)")
        }
        .listRowBackground(Palette.surface)
        .swipeActions(edge: .leading) {
            Button { store.restore(task.id) } label: { Label("Restore", systemImage: "arrow.uturn.backward") }
                .tint(Palette.accent)
        }
        .swipeActions(edge: .trailing) {
            Button { pendingDelete = task } label: { Label("Delete", systemImage: "trash") }
                .tint(Palette.danger)
        }
        .accessibilityIdentifier("archived-\(task.name)")
    }
}
