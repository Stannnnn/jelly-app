import { createContext, useContext } from 'react'
import { MediaItem } from '../../api/jellyfin'
import { IDownloadContext } from './DownloadContextProvider'

export const DownloadContext = createContext<IDownloadContext>({} as IDownloadContext)

export const useDownloadContext = () => useContext(DownloadContext)

export const syncDownloads = (container: MediaItem, items: MediaItem[]) => {
    if (container.offlineState === 'downloaded') {
        const toDownload = items.filter(track => track.offlineState !== 'downloaded')

        if (toDownload.length) {
            // Explicitly set offlineState to 'downloading' since addToDownloads happens before they are stored in react-query, so that patch will fail
            for (const track of toDownload) {
                track.offlineState = 'downloading'
            }

            window.addToDownloads(toDownload)
        }
    }
}

export const syncDownloadsById = async (containerId: string, items: MediaItem[]) => {
    const isDownloaded = containerId ? await window.audioStorage.hasTrack(containerId) : false

    if (isDownloaded) {
        const toDownload = items.filter(track => track.offlineState !== 'downloaded')

        if (toDownload.length) {
            // Explicitly set offlineState to 'downloading' since addToDownloads happens before they are stored in react-query, so that patch will fail
            for (const track of toDownload) {
                track.offlineState = 'downloading'
            }

            window.addToDownloads(toDownload)
        }
    }
}

export const unsyncDownloadsById = async (containerId: string, items: MediaItem[]) => {
    const isDownloaded = containerId ? await window.audioStorage.hasTrack(containerId) : false

    if (isDownloaded) {
        const toRemove = items.filter(track => track.offlineState !== undefined)

        if (toRemove.length) {
            // Explicitly set offlineState to 'deleting' since removeFromDownloads happens before they are stored in react-query, so that patch will fail
            for (const track of toRemove) {
                track.offlineState = 'deleting'
            }

            window.removeFromDownloads(toRemove)
        }
    }
}
