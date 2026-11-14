import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarCollapsed: boolean;
  paletteOpen: boolean;
  toggleSidebar(): void;
  setPaletteOpen(open: boolean): void;
}

/** UI-only state. Just the sidebar preference is remembered; it starts as an icon rail. */
export const useUi = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: true,
      paletteOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
    }),
    {
      name: 'databoard.ui.v2',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
