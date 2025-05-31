import { ReactNode, useCallback, useRef } from 'react'
import { AudioStorageContext } from './AudioStorageContext'

export type IAudioStorageContext = ReturnType<typeof useInitialState>

export type IStorageTrack =
    | {
          type: 'container'
      }
    | {
          type: 'song'
          blob: Blob
      }
    | {
          type: 'm3u8'
          playlist: Blob
          ts: Blob[]
      }

const useInitialState = () => {
    const dbRef = useRef(
        new Promise<IDBDatabase>((resolve, reject) => {
            const DB_NAME = 'OfflineAudioDB'
            const STORE_NAME = 'tracks'
            const DB_VERSION = 1

            const request = indexedDB.open(DB_NAME, DB_VERSION)

            request.onupgradeneeded = () => {
                const db = request.result

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME)
                }
            }

            request.onsuccess = () => {
                resolve(request.result)
            }

            request.onerror = () => {
                console.error('IndexedDB error:', request.error)
                reject(request.error)
            }
        })
    )

    const saveTrack = useCallback(async (id: string, data: IStorageTrack) => {
        if (!dbRef.current) throw new Error('Database not initialized')
        const db = await dbRef.current
        const tx = db.transaction('tracks', 'readwrite')
        tx.objectStore('tracks').put(data, id)
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
            tx.onabort = () => reject(tx.error)
        })
    }, [])

    const removeTrack = useCallback(async (id: string) => {
        if (!dbRef.current) throw new Error('Database not initialized')
        const db = await dbRef.current
        const tx = db.transaction('tracks', 'readwrite')
        tx.objectStore('tracks').delete(id)
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
            tx.onabort = () => reject(tx.error)
        })
    }, [])

    const getTrack = useCallback(async (id: string): Promise<IStorageTrack | null> => {
        if (!dbRef.current) throw new Error('Database not initialized')
        const db = await dbRef.current
        const tx = db.transaction('tracks', 'readonly')
        const request = tx.objectStore('tracks').get(id)
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || null)
            request.onerror = () => reject(request.error)
        })
    }, [])

    const hasTrack = useCallback(
        async (id: string) => {
            const track = await getTrack(id)
            return track !== null
        },
        [getTrack]
    )

    const getPlayableUrl = useCallback(
        async (id: string) => {
            const track = await getTrack(id)

            return track?.type === 'song'
                ? { type: 'song', url: URL.createObjectURL(track.blob) }
                : track?.type === 'm3u8'
                ? { type: 'm3u8', url: URL.createObjectURL(track.playlist) }
                : undefined
        },
        [getTrack]
    )

    const getAllTracks = useCallback(async (): Promise<{ id: string; data: IStorageTrack }[]> => {
        if (!dbRef.current) throw new Error('Database not initialized')
        const db = await dbRef.current
        const tx = db.transaction('tracks', 'readonly')
        const request = tx.objectStore('tracks').getAll()
        const keysRequest = tx.objectStore('tracks').getAllKeys()

        return new Promise((resolve, reject) => {
            let keys: IDBValidKey[]
            let values: IStorageTrack[]

            request.onsuccess = () => {
                values = request.result
            }

            keysRequest.onsuccess = () => {
                keys = keysRequest.result
            }

            tx.oncomplete = () => {
                const tracks = keys.map((key, index) => ({
                    id: key as string,
                    data: values[index],
                }))
                resolve(tracks)
            }

            tx.onerror = () => reject(tx.error)
        })
    }, [])

    const getStorageStats = useCallback(async (): Promise<{
        totalSize: number
        trackCount: number
        quota?: number
        usage?: number
    }> => {
        try {
            const tracks = await getAllTracks()
            let totalSize = 0

            for (const { data } of tracks) {
                if (data.type === 'song') {
                    totalSize += data.blob.size
                } else if (data.type === 'm3u8') {
                    totalSize += data.playlist.size
                    totalSize += data.ts.reduce((sum, ts) => sum + ts.size, 0)
                }
            }

            // Get storage quota if available
            let quota: number | undefined
            let usage: number | undefined

            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate()
                quota = estimate.quota
                usage = estimate.usage
            }

            return {
                totalSize,
                trackCount: tracks.filter(t => t.data.type !== 'container').length,
                quota,
                usage,
            }
        } catch (error) {
            console.error('Failed to get storage stats:', error)
            throw error
        }
    }, [getAllTracks])

    const clearAllDownloads = useCallback(async (): Promise<void> => {
        if (!dbRef.current) throw new Error('Database not initialized')
        const db = await dbRef.current
        const tx = db.transaction('tracks', 'readwrite')
        tx.objectStore('tracks').clear()

        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
            tx.onabort = () => reject(tx.error)
        })
    }, [])

    const audioStorage = {
        saveTrack,
        removeTrack,
        getTrack,
        hasTrack,
        getPlayableUrl,
        getAllTracks,
        getStorageStats,
        clearAllDownloads,
    }

    // We need the audioStorage in jellyfin API but we don't want to cause unnecessary re-renders since opening the IndexedDB shouldn't take long
    window.audioStorage = audioStorage

    return audioStorage
}

export const AudioStorageContextProvider = ({ children }: { children: ReactNode }) => {
    const initialState = useInitialState()

    return <AudioStorageContext.Provider value={initialState}>{children}</AudioStorageContext.Provider>
}
