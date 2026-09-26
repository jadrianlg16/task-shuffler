import ActivityKit
import AppIntents
import DoneCore
import SwiftUI
import UniformTypeIdentifiers

/// Settings: categories, sounds and haptics, notifications and Live
/// Activities, Siri, Spotlight, appearance, backup, examples and About.
struct SettingsView: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var exporting = false
    @State private var importing = false
    @State private var pendingImport: PendingImport?
    @State private var confirmingImport = false
    @State private var importError: String?

    var body: some View {
        NavigationStack {
            Form {
                categoriesSection
                feedbackSection
                alertsSection
                siriSection
                appearanceSection
                backupSection
                examplesSection
                if UIDevice.current.userInterfaceIdiom != .phone {
                    keyboardSection
                }
                aboutSection
            }
            .scrollContentBackground(.hidden)
            .background(Palette.background)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .backupExporter(isPresented: $exporting)
            // The import stays pending while you save a backup first, then asks again.
            .onChange(of: exporting) {
                if !exporting, pendingImport != nil { confirmingImport = true }
            }
            .confirmationDialog(
                "Replace your tasks?",
                isPresented: $confirmingImport,
                titleVisibility: .visible,
                presenting: pendingImport
            ) { pending in
                Button("Replace", role: .destructive) {
                    store.replaceAll(with: pending.backup)
                    pendingImport = nil
                }
                Button("Save a backup of the current ones first") {
                    exporting = true
                }
                Button("Cancel", role: .cancel) {
                    pendingImport = nil
                }
            } message: { pending in
                Text("Replace your \(plural(store.library.tasks.count, "task")) and \(plural(store.library.categories.count, "category", "categories")) with \(plural(pending.backup.activities.count, "task")) and \(plural(pending.backup.categories.count, "category", "categories")) from \(pending.fileName)?")
            }
            .alert("Can't import that file", isPresented: Binding(get: { importError != nil }, set: { if !$0 { importError = nil } })) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(importError ?? "")
            }
        }
        // On a different view from the exporter: two file panels on one view can clash.
        .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
            readImport(result)
        }
        .tint(Palette.accent)
    }

    // MARK: - Sections

    private var categoriesSection: some View {
        Section("Categories") {
            NavigationLink {
                CategoriesView()
            } label: {
                HStack {
                    Text("Categories")
                    Spacer()
                    HStack(spacing: 3) {
                        ForEach(store.library.visibleCategories.prefix(6)) { category in
                            CategoryDot(color: category.color, size: 8)
                        }
                    }
                }
            }
        }
    }

    private var feedbackSection: some View {
        Section {
            Toggle("Sounds", isOn: store.binding(\.soundsOn))
            Toggle("Haptics", isOn: store.binding(\.hapticsOn))
        } header: {
            Text("Sound and touch")
        } footer: {
            Text("A tick as the reel spins, a chime when it lands and when you finish. Sounds follow the silent switch.")
        }
    }

    private var alertsSection: some View {
        Section {
            Toggle("Tell me when time's up", isOn: store.binding(\.timesUpAlerts))
            Toggle("Timer on the Lock Screen", isOn: store.binding(\.liveActivities))
                .disabled(!ActivityAuthorizationInfo().areActivitiesEnabled)
            Toggle("Daily nudge", isOn: store.binding(\.dailyNudge))
            if store.preferences.dailyNudge {
                DatePicker("At", selection: nudgeTime, displayedComponents: .hourAndMinute)
            }
        } header: {
            Text("Notifications")
        } footer: {
            if ActivityAuthorizationInfo().areActivitiesEnabled {
                Text("While you work on a task, its timer shows on the Lock Screen and in the Dynamic Island, with Done and Drop buttons.")
            } else {
                Text("Live Activities are off for done. in the Settings app.")
            }
        }
    }

    private var siriSection: some View {
        Section {
            SiriTipView(intent: PickTaskIntent())
            ShortcutsLink()
            Toggle("Show tasks in Spotlight", isOn: store.binding(\.spotlight))
        } header: {
            Text("Siri, Shortcuts and search")
        } footer: {
            Text("Try “Pick a task in done.”. Focus filters: Settings → Focus → a Focus → Add Filter → done.")
        }
    }

    private var appearanceSection: some View {
        Section("Appearance") {
            Picker("Theme", selection: store.binding(\.appearance)) {
                Text("System").tag(Appearance.system)
                Text("Light").tag(Appearance.light)
                Text("Dark").tag(Appearance.dark)
            }
            .pickerStyle(.segmented)
        }
    }

    private var backupSection: some View {
        Section {
            Button("Export backup…") { exporting = true }
            Button("Import backup…") { importing = true }
            if let last = store.preferences.lastBackupAt {
                LabeledContent("Last backup") {
                    Text(last, format: .relative(presentation: .named))
                }
            }
        } header: {
            Text("Backup")
        } footer: {
            Text("Your tasks live on this device and are included in its iCloud or computer backups. A backup file also opens in the web version of done. Importing checks the file first and asks before replacing anything.")
        }
    }

    private var examplesSection: some View {
        Section {
            if store.library.exampleCount > 0 {
                Button("Clear example tasks", role: .destructive) { store.clearExamples() }
            } else {
                Button("Add example tasks") { store.addExamples() }
            }
        }
    }

    private var keyboardSection: some View {
        Section("Keyboard") {
            ForEach(KeyboardShortcutsInfo.all, id: \.keys) { shortcut in
                LabeledContent(shortcut.label) {
                    Text(shortcut.keys).font(.body.monospaced())
                }
            }
        }
    }

    private var aboutSection: some View {
        Section {
            Text("No account, no analytics, no tracking. Your tasks never leave this device unless you export them.")
                .font(.footnote)
                .foregroundStyle(Palette.inkMuted)
            LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "–")
            Link("Source on GitHub (MIT)", destination: URL(string: "https://github.com/jadrianlg16/task-shuffler")!)
        } header: {
            Text("About")
        }
    }

    // MARK: - Import

    private var nudgeTime: Binding<Date> {
        Binding(
            get: {
                let minutes = store.preferences.dailyNudgeMinutes
                return Calendar.current.date(bySettingHour: minutes / 60, minute: minutes % 60, second: 0, of: Date()) ?? Date()
            },
            set: { date in
                let parts = Calendar.current.dateComponents([.hour, .minute], from: date)
                store.updatePreferences { $0.dailyNudgeMinutes = (parts.hour ?? 9) * 60 + (parts.minute ?? 0) }
            }
        )
    }

    private func readImport(_ result: Result<URL, Error>) {
        switch result {
        case .failure(let error):
            importError = error.localizedDescription
        case .success(let url):
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            do {
                let backup = try Backup.parse(Data(contentsOf: url))
                pendingImport = PendingImport(fileName: url.lastPathComponent, backup: backup)
                confirmingImport = true
            } catch let error as BackupError {
                importError = error.message
            } catch {
                importError = "That file couldn't be read."
            }
        }
    }

    private func plural(_ count: Int, _ one: String, _ many: String? = nil) -> String {
        "\(count) \(count == 1 ? one : (many ?? one + "s"))"
    }
}

private struct PendingImport {
    var fileName: String
    var backup: Backup
}

/// The iPad / Mac keyboard shortcuts (defined in DoneApp's commands).
enum KeyboardShortcutsInfo {
    struct Shortcut {
        let keys: String
        let label: String
    }

    static let all = [
        Shortcut(keys: "⌘N", label: "New task"),
        Shortcut(keys: "⌘R", label: "Shuffle"),
        Shortcut(keys: "⌘F", label: "Search tasks"),
        Shortcut(keys: "↩", label: "Start the picked task"),
        Shortcut(keys: "⌘⇧A", label: "Archive"),
        Shortcut(keys: "⌘,", label: "Settings"),
        Shortcut(keys: "Esc", label: "Close"),
    ]
}

/// The categories screen: reorder, hide, rename, recolour, add and delete.
struct CategoriesView: View {
    @Environment(LibraryStore.self) private var store
    @State private var editing: TaskCategory?
    @State private var adding = false

    var body: some View {
        List {
            Section {
                ForEach(store.library.sortedCategories) { category in
                    Button {
                        editing = category
                    } label: {
                        HStack(spacing: 12) {
                            CategoryDot(color: category.color, size: 12)
                            Text(category.name)
                                .foregroundStyle(category.isHidden ? Palette.inkMuted : Palette.ink)
                            if category.isHidden {
                                Text("hidden").font(.caption).foregroundStyle(Palette.inkMuted)
                            }
                            Spacer()
                            Text("\(store.library.activeTasks.filter { $0.categoryId == category.id }.count)")
                                .font(.caption)
                                .foregroundStyle(Palette.inkMuted)
                        }
                    }
                    .swipeActions {
                        Button(category.isHidden ? "Show" : "Hide") {
                            store.setHidden(!category.isHidden, categoryId: category.id)
                        }
                        .tint(Palette.inkMuted)
                    }
                }
                .onMove { source, destination in
                    store.moveCategories(from: source, to: destination)
                }
            } footer: {
                Text("Drag to reorder. Hidden categories stay out of the list and the shuffle. Deleting a category moves its tasks to Unassigned.")
            }

            Section {
                Button {
                    adding = true
                } label: {
                    Label("New category", systemImage: "plus")
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Palette.background)
        .navigationTitle("Categories")
        .toolbar { EditButton() }
        .sheet(item: $editing) { category in
            CategoryEditor(category: category)
        }
        .sheet(isPresented: $adding) {
            CategoryEditor(category: nil)
        }
    }
}

/// Add or change one category.
struct CategoryEditor: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let category: TaskCategory?

    @State private var name = ""
    @State private var color = CategoryColors.presets[0]
    @State private var hidden = false
    @State private var confirmDelete = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("Category name", text: $name)
                }
                Section("Colour") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 8), spacing: 12) {
                        ForEach(CategoryColors.presets, id: \.self) { preset in
                            Button {
                                color = preset
                            } label: {
                                Circle()
                                    .fill(Color(hex: preset))
                                    .frame(width: 28, height: 28)
                                    .overlay(Circle().strokeBorder(Palette.ink, lineWidth: color == preset ? 2.5 : 0))
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Colour \(preset)")
                            .accessibilityAddTraits(color == preset ? .isSelected : [])
                        }
                    }
                    .padding(.vertical, 6)
                    ColorPicker("Custom colour", selection: customColor, supportsOpacity: false)
                }
                if let category {
                    Section {
                        Toggle("Hidden", isOn: $hidden)
                        if !category.isDefault {
                            Button("Delete category", role: .destructive) { confirmDelete = true }
                        }
                    }
                }
            }
            .navigationTitle(category == nil ? "New category" : "Edit category")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(category == nil ? "Add" : "Save") { save() }
                        .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .confirmationDialog("Delete this category?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete", role: .destructive) {
                    if let category { store.deleteCategory(id: category.id) }
                    dismiss()
                }
            } message: {
                Text("Its tasks move to Unassigned.")
            }
            .onAppear {
                if let category {
                    name = category.name
                    color = category.color
                    hidden = category.isHidden
                }
            }
        }
        .tint(Palette.accent)
    }

    /// Any colour, stored as "#RRGGBB" like the presets.
    private var customColor: Binding<Color> {
        Binding(
            get: { Color(hex: color) },
            set: { newValue in
                var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
                guard UIColor(newValue).getRed(&red, green: &green, blue: &blue, alpha: &alpha) else { return }
                func byte(_ value: CGFloat) -> Int { Int((min(1, max(0, value)) * 255).rounded()) }
                color = String(format: "#%02X%02X%02X", byte(red), byte(green), byte(blue))
            }
        )
    }

    private func save() {
        if let category {
            store.updateCategory(id: category.id, name: name, color: color)
            if hidden != category.isHidden { store.setHidden(hidden, categoryId: category.id) }
        } else {
            store.addCategory(name: name, color: color)
        }
        dismiss()
    }
}

/// Saves the backup file wherever you choose (Files, iCloud Drive, AirDrop…).
struct BackupDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    var data: Data

    init(data: Data) {
        self.data = data
    }

    init(configuration: ReadConfiguration) throws {
        data = configuration.file.regularFileContents ?? Data()
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

private struct BackupExporter: ViewModifier {
    @Environment(LibraryStore.self) private var store
    @Binding var isPresented: Bool

    func body(content: Content) -> some View {
        content.fileExporter(
            isPresented: $isPresented,
            document: BackupDocument(data: (try? store.backupData()) ?? Data()),
            contentType: .json,
            // Local date, like the web app's file name.
            defaultFilename: "done-backup-\(Date.ISO8601FormatStyle(timeZone: .current).year().month().day().format(Date.now))"
        ) { result in
            if case .success = result {
                store.recordBackup()
                store.toast = Toast(message: "Backup saved.")
            }
        }
    }
}

extension View {
    /// Presents the save-a-backup panel.
    func backupExporter(isPresented: Binding<Bool>) -> some View {
        modifier(BackupExporter(isPresented: isPresented))
    }
}
