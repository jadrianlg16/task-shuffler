import DoneCore
import SwiftUI

/// The active tasks, grouped by category or in one list, searched and sorted.
/// Used inside a List: each group is a Section.
struct TaskSections: View {
    @Environment(LibraryStore.self) private var store
    @Environment(Router.self) private var router
    let search: String

    var body: some View {
        let focus = store.preferences.focusCategoryIds.map { Set($0) }
        let tasks = store.library
            .listTasks(search: search, sortBy: store.preferences.sortBy)
            .filter { focus?.contains($0.categoryId) ?? true }

        if tasks.isEmpty {
            Section {
                emptyState
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
            }
        } else if store.preferences.listGrouped {
            ForEach(store.library.visibleCategories) { category in
                let items = tasks.filter { $0.categoryId == category.id }
                if !items.isEmpty {
                    Section {
                        ForEach(items) { task in
                            row(task, showCategory: false)
                        }
                    } header: {
                        HStack(spacing: 8) {
                            CategoryDot(color: category.color, size: 8)
                            Text(category.name)
                            Spacer()
                            Text("\(items.count)")
                                .foregroundStyle(Palette.inkMuted)
                        }
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Palette.ink)
                        .textCase(nil)
                    }
                }
            }
        } else {
            Section {
                ForEach(tasks) { task in
                    row(task, showCategory: true)
                }
            } header: {
                SectionLabel("Tasks")
            }
        }
    }

    @ViewBuilder
    private var emptyState: some View {
        let searching = !search.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        if searching {
            EmptyStateView(systemImage: "magnifyingglass", title: "No matches", message: "Nothing matches “\(search.trimmingCharacters(in: .whitespaces))”.")
        } else if store.library.tasks.isEmpty {
            EmptyStateView(
                systemImage: "plus.circle",
                title: "No tasks yet",
                message: "Add your first task below to get started.",
                actionTitle: "Try it with example tasks",
                action: { store.addExamples() }
            )
        } else {
            EmptyStateView(systemImage: "checkmark.circle", title: "All clear", message: "Nothing left to do. Add something below.")
        }
    }

    private func row(_ task: TaskItem, showCategory: Bool) -> some View {
        TaskRow(
            task: task,
            category: showCategory ? store.library.category(id: task.categoryId) : nil,
            onComplete: { store.complete(task.id) },
            onOpen: { router.sheet = .edit(taskId: task.id) },
            onPick: { router.pick(task) }
        )
        .listRowBackground(Palette.surface)
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button {
                store.start(task.id)
            } label: {
                Label("Start", systemImage: "play.fill")
            }
            .tint(Palette.accent)
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            Button {
                store.complete(task.id)
            } label: {
                Label("Done", systemImage: "checkmark")
            }
            .tint(Palette.accent)
            Button(role: .destructive) {
                store.delete(task.id)
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
        .contextMenu {
            Button { store.start(task.id) } label: { Label("Start now", systemImage: "play") }
            Button { router.sheet = .edit(taskId: task.id) } label: { Label("Edit", systemImage: "pencil") }
            Button { store.complete(task.id) } label: { Label("Mark done", systemImage: "checkmark") }
            Button(role: .destructive) { store.delete(task.id) } label: { Label("Delete", systemImage: "trash") }
        }
    }
}

/// One task: a round check button, the name and details, and a play button
/// to pick it by hand.
struct TaskRow: View {
    let task: TaskItem
    let category: TaskCategory?
    let onComplete: () -> Void
    let onOpen: () -> Void
    let onPick: () -> Void

    var body: some View {
        HStack(spacing: 14) {
            Button(action: onComplete) {
                Circle()
                    .strokeBorder(Palette.inkMuted.opacity(0.6), lineWidth: 1.5)
                    .frame(width: 22, height: 22)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.borderless)
            .accessibilityLabel("Complete \(task.name)")

            Button(action: onOpen) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(task.name)
                        .font(.body)
                        .foregroundStyle(Palette.ink)
                        .lineLimit(2)
                    if task.isStarted || task.durationMinutes != nil || category != nil {
                        HStack(spacing: 10) {
                            if task.isStarted {
                                Text("In progress")
                                    .fontWeight(.medium)
                                    .foregroundStyle(Palette.accent)
                            }
                            if let minutes = task.durationMinutes { Text(minutesText(minutes)) }
                            if let category { CategoryBadge(category: category) }
                        }
                        .font(.caption)
                        .foregroundStyle(Palette.inkMuted)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.borderless)
            .accessibilityHint("Edit")

            Button(action: onPick) {
                Image(systemName: "play")
                    .font(.footnote)
                    .foregroundStyle(Palette.inkMuted)
                    .frame(width: 40, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.borderless)
            .accessibilityLabel("Pick \(task.name)")
        }
        .padding(.vertical, 2)
        .accessibilityIdentifier("task-\(task.name)")
    }
}
