import CoreSpotlight
import DoneCore
import SwiftUI

/// The main screen. On iPhone (and narrow iPad windows) one scrolling list:
/// header, notes, Now, the picker, then the tasks. On a wide iPad the picker
/// side sits in a column next to the list.
struct RootView: View {
    @Environment(LibraryStore.self) private var store
    @Environment(Router.self) private var router
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.scenePhase) private var scenePhase
    @State private var search = ""
    @State private var searching = false

    var body: some View {
        @Bindable var router = router

        NavigationStack {
            Group {
                if sizeClass == .regular {
                    wideLayout
                } else {
                    compactLayout
                }
            }
            .background(Palette.background.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbarItems }
            .searchable(text: $search, isPresented: $searching, placement: .navigationBarDrawer(displayMode: .automatic), prompt: "Search tasks")
        }
        .overlay(alignment: .bottom) { toastOverlay }
        .animation(.snappy, value: store.toast)
        .sheet(item: $router.sheet) { sheet in
            sheetContent(sheet)
                .environment(store)
                .environment(router)
                .preferredColorScheme(colorScheme)
        }
        .alert(
            "Couldn't read your tasks",
            isPresented: Binding(get: { store.loadProblem != nil }, set: { if !$0 { store.loadProblem = nil } })
        ) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(store.loadProblem ?? "")
        }
        .onOpenURL { router.open($0) }
        .onContinueUserActivity(CSSearchableItemActionType) { activity in
            if let id = activity.userInfo?[CSSearchableItemActivityIdentifier] as? String {
                router.sheet = .edit(taskId: id)
            }
        }
        .onChange(of: scenePhase) {
            if scenePhase == .active { becameActive() }
        }
        .onChange(of: router.focusSearch) {
            searching = true
        }
        .preferredColorScheme(colorScheme)
        .tint(Palette.accent)
    }

    // MARK: - Layouts

    private var compactLayout: some View {
        List {
            Section {
                HeaderView()
                NoticesView()
                if let current = store.library.current {
                    NowCard(task: current)
                }
                PickerCard()
            }
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))

            TaskSections(search: search)
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .safeAreaInset(edge: .bottom, spacing: 0) { QuickAddBar() }
    }

    private var wideLayout: some View {
        HStack(alignment: .top, spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HeaderView()
                    NoticesView()
                    if let current = store.library.current {
                        NowCard(task: current)
                    }
                    PickerCard()
                }
                .padding(20)
            }
            .frame(width: 400)

            Divider()

            List {
                TaskSections(search: search)
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .scrollDismissesKeyboard(.interactively)
            .safeAreaInset(edge: .bottom, spacing: 0) { QuickAddBar() }
        }
    }

    // MARK: - Toolbar, sheets, toast

    @ToolbarContentBuilder
    private var toolbarItems: some ToolbarContent {
        ToolbarItemGroup(placement: .topBarTrailing) {
            Menu {
                Picker("Show", selection: store.binding(\.listGrouped)) {
                    Label("By category", systemImage: "square.grid.2x2").tag(true)
                    Label("One list", systemImage: "list.bullet").tag(false)
                }
                Picker("Sort by", selection: store.binding(\.sortBy)) {
                    Text("Newest first").tag(SortBy.date)
                    Text("Name").tag(SortBy.name)
                    Text("Duration").tag(SortBy.duration)
                    Text("Category").tag(SortBy.category)
                }
            } label: {
                Image(systemName: "line.3.horizontal.decrease.circle")
            }
            .accessibilityLabel("View and sort")

            Button {
                router.sheet = .archive
            } label: {
                Image(systemName: "archivebox")
            }
            .accessibilityLabel("Archive")
            .accessibilityIdentifier("archiveButton")

            Button {
                router.sheet = .settings
            } label: {
                Image(systemName: "gearshape")
            }
            .accessibilityLabel("Settings")
            .accessibilityIdentifier("settingsButton")
        }
    }

    @ViewBuilder
    private func sheetContent(_ sheet: Router.Sheet) -> some View {
        switch sheet {
        case .shuffle(let request):
            ShuffleSheet(request: request)
        case .edit(let taskId):
            TaskEditor(taskId: taskId)
        case .archive:
            ArchiveView()
        case .settings:
            SettingsView()
        }
    }

    @ViewBuilder
    private var toastOverlay: some View {
        if let toast = store.toast {
            ToastView(toast: toast) { store.toast = nil }
                .padding(.bottom, 92)
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .task(id: toast.id) {
                    try? await Task.sleep(nanoseconds: 4_000_000_000)
                    if store.toast?.id == toast.id { store.toast = nil }
                }
        }
    }

    private var colorScheme: ColorScheme? {
        switch store.preferences.appearance {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }

    // MARK: - Coming back to the app

    /// Catch up on anything that changed while away: widget or Siri changes, a
    /// "Pick for me" tap waiting to be handled, and the current Focus.
    private func becameActive() {
        store.reloadFromDisk()
        if let action = store.takePendingAction() {
            router.perform(action)
        }
        Task {
            if let filter = try? await DoneFocusFilter.current {
                store.applyFocus(categoryIds: filter.categories?.map(\.id))
            }
        }
    }
}
