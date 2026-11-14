import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarCollapsed: boolean;
  paletteOpen: boolean;
  toggleSidebar(): void;
  setPaletteOpen(open: boolean): void;
}

/** UI-only state. Just the sidebar preference is remembered between sessions. */
export const useUi = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      paletteOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
    }),
    {
      name: 'dashboard.ui',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
