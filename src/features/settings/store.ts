import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { InputMode } from './types'

interface SettingsState {
  inputMode: InputMode
  setInputMode: (mode: InputMode) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      inputMode: 'both',
      setInputMode: (mode) => set({ inputMode: mode }),
    }),
    {
      name: 'wordrow-settings',
    },
  ),
)
