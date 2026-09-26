import CoreSpotlight
import DoneCore
import Foundation
import UniformTypeIdentifiers

/// Active tasks in Spotlight search, on this device only. Tapping a result
/// opens the task (see RootView's onContinueUserActivity).
enum Spotlight {
    static let domain = "dev.adriangaona.done.tasks"

    static func sync(library: Library, enabled: Bool) {
        let index = CSSearchableIndex.default()
        let items = enabled ? library.listTasks().map { item(for: $0, in: library) } : []
        index.deleteSearchableItems(withDomainIdentifiers: [domain]) { _ in
            guard !items.isEmpty else { return }
            index.indexSearchableItems(items) { _ in }
        }
    }

    private static func item(for task: TaskItem, in library: Library) -> CSSearchableItem {
        let attributes = CSSearchableItemAttributeSet(contentType: .text)
        attributes.title = task.name
        attributes.contentDescription = [
            task.durationMinutes.map(minutesText),
            library.category(id: task.categoryId)?.name,
        ].compactMap { $0 }.joined(separator: " · ")
        return CSSearchableItem(uniqueIdentifier: task.id, domainIdentifier: domain, attributeSet: attributes)
    }
}
