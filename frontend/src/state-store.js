import { create } from 'zustand'

const useStore = create((set) => ({
    isSentimenting: false,
    setIsSentimenting: () => set((state) => ({ isSentimenting: !state.isSentimenting })),
    isGroupifying: false,
    setIsGroupifying: () => set((state) => ({ isGroupifying: !state.isGroupifying })),
}))

export default useStore
