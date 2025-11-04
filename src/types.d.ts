import { MediaItem } from './api/jellyfin'
import { IAudioStorageContext } from './context/AudioStorageContext/AudioStorageContextProvider'

declare global {
    interface Window {
        __NPM_LIFECYCLE_EVENT__: string
        audioStorage: IAudioStorageContext
        addToDownloads: (items: MediaItem[], container?: MediaItem) => void
        removeFromDownloads: (items: MediaItem[], container?: MediaItem) => void
        getDownloadState: (itemId: string) => 'downloading' | 'deleting' | undefined
    }

    const __VERSION__: string
}

export {}
