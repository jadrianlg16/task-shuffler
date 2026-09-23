import { create } from "zustand";

/** Chrome/Edge/Android fire this when the app can be installed. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

interface InstallState {
  prompt: InstallPromptEvent | null;
  install: () => Promise<boolean>;
}

export const useInstallStore = create<InstallState>()((set, get) => ({
  prompt: null,
  install: async () => {
    const p = get().prompt;
    if (!p) return false;
    await p.prompt();
    const { outcome } = await p.userChoice;
    set({ prompt: null }); // a prompt can only be used once
    return outcome === "accepted";
  },
}));

// Capture the browser's install prompt so we can offer it at a good moment.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    useInstallStore.setState({ prompt: e as InstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => useInstallStore.setState({ prompt: null }));
}
