import { IAudioStorageContext } from './context/AudioStorageContext/AudioStorageContextProvider'

declare global {
    interface Window {
        __NPM_LIFECYCLE_EVENT__: string
        audioStorage: IAudioStorageContext
        addToDownloads: (itemIds: string[], containerId?: string) => void
    }

    const __VERSION__: string
}

export {}
