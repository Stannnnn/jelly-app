import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client'
import { useQueryClient } from '@tanstack/react-query'
import { Parser } from 'm3u8-parser'
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { MediaItem } from '../../api/jellyfin'
import { usePatchQueries } from '../../hooks/usePatchQueries'
import { useAudioStorageContext } from '../AudioStorageContext/AudioStorageContext'
import { useJellyfinContext } from '../JellyfinContext/JellyfinContext'
import { usePlaybackContext } from '../PlaybackContext/PlaybackContext'
import { DownloadContext } from './DownloadContext'
import { useConfig } from '../../hooks/useConfig'

type Task = { mediaItem: MediaItem; action: 'download' | 'remove'; containerId?: string }

export type IDownloadContext = ReturnType<typeof useInitialState>

const useInitialState = () => {
    const api = useJellyfinContext()
    const playback = usePlaybackContext()
    const audioStorage = useAudioStorageContext()
    const { patchMediaItem, patchMediaItems } = usePatchQueries()
    const queryClient = useQueryClient()
    const [storageStats, setStorageStats] = useState({ usage: 0, indexedDB: 0, trackCount: 0 })

    const refreshStorageStats = useCallback(async () => {
        try {
            const count = await audioStorage.getTrackCount()

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const estimate: any = await navigator.storage?.estimate()

            setStorageStats({
                usage: estimate?.usage || 0,
                indexedDB: estimate?.usageDetails?.indexedDB || 0,
                trackCount: count,
            })
        } catch (error) {
            console.error('Failed to load storage stats:', error)
        }
    }, [audioStorage])

    useEffect(() => {
        refreshStorageStats()
    }, [refreshStorageStats])

    const [queue, setQueue] = useConfig<Task[]>('playback.media.queue', [], { sync: false })

    const processingRef = useRef(false)
    const abortControllerRef = useRef<AbortController | null>(null)

    // Enqueue download
    const addToDownloads = (items: MediaItem[], container: MediaItem | undefined) => {
        const containerId = container?.Id

        patchMediaItems(
            items.map(item => item.Id),
            item => ({ ...item, offlineState: 'downloading' })
        )

        if (containerId) {
            patchMediaItem(containerId, item => ({ ...item, offlineState: 'downloading' }))
        }

        setQueue(prev => {
            const filtered = prev.filter(task => !items.some(i => i.Id === task.mediaItem.Id))
            const newTasks: Task[] = items.map(item => ({ mediaItem: item, action: 'download' as const, containerId }))

            if (containerId) {
                newTasks.push({ mediaItem: container, action: 'download' })
            }

            return newTasks.length ? [...filtered, ...newTasks] : filtered
        })
    }

    // Enqueue removal
    const removeFromDownloads = (items: MediaItem[], container: MediaItem | undefined) => {
        const containerId = container?.Id

        patchMediaItems(
            items.map(item => item.Id),
            item => ({ ...item, offlineState: 'deleting' })
        )

        if (containerId) {
            patchMediaItem(containerId, item => ({ ...item, offlineState: 'deleting' }))
        }

        setQueue(prev => {
            const filtered = prev.filter(task => !items.some(i => i.Id === task.mediaItem.Id))
            const newTasks: Task[] = items.map(item => ({ mediaItem: item, action: 'remove' as const, containerId }))

            if (containerId) {
                newTasks.push({ mediaItem: container, action: 'remove' })
            }

            return newTasks.length ? [...filtered, ...newTasks] : filtered
        })
    }

    const clearQueue = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort('clearQueue')
            abortControllerRef.current = null
        }

        queue.forEach(({ mediaItem }) => {
            patchMediaItem(mediaItem.Id, item => ({
                ...item,
                offlineState:
                    item.offlineState === 'downloading'
                        ? undefined
                        : item.offlineState === 'deleting'
                        ? 'downloaded'
                        : item.offlineState,
            }))
        })

        setQueue([])
    }, [queue, setQueue, patchMediaItem])

    // Process queue tasks one at a time
    useEffect(() => {
        const runNext = async () => {
            if (processingRef.current) return
            const next = queue[0]
            if (!next) return

            processingRef.current = true
            abortControllerRef.current = new AbortController()
            const signal = abortControllerRef.current.signal

            const { mediaItem, action } = next

            try {
                if (action === 'download') {
                    const already = await audioStorage.hasTrack(mediaItem.Id)

                    if (already) {
                        patchMediaItem(mediaItem.Id, item => ({ ...item, offlineState: 'downloaded' }))
                    } else {
                        // The mediaItem object is saved so we modify it directly
                        mediaItem.offlineState = 'downloaded'

                        if (mediaItem.Type === BaseItemKind.Audio) {
                            const isTranscoded = [128000, 192000, 256000, 320000].includes(playback.bitrate)
                            const streamUrl = api.getStreamUrl(mediaItem.Id, playback.bitrate)

                            if (isTranscoded) {
                                const { playlist, ts } = await downloadTranscodedTrack(streamUrl, signal)
                                await audioStorage.saveTrack(mediaItem.Id, {
                                    type: 'm3u8',
                                    timestamp: Date.now(),
                                    mediaItem,
                                    bitrate: playback.bitrate,
                                    playlist,
                                    ts,
                                    containerId: next.containerId,
                                })
                            } else {
                                const response = await fetch(streamUrl, { signal })
                                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                                const blob = await response.blob()
                                await audioStorage.saveTrack(mediaItem.Id, {
                                    type: 'song',
                                    timestamp: Date.now(),
                                    bitrate: playback.bitrate,
                                    mediaItem,
                                    blob,
                                    containerId: next.containerId,
                                })
                            }
                        } else {
                            await audioStorage.saveTrack(mediaItem.Id, {
                                type: 'container',
                                timestamp: Date.now(),
                                bitrate: playback.bitrate,
                                mediaItem,
                            })
                        }

                        patchMediaItem(mediaItem.Id, item => ({ ...item, offlineState: 'downloaded' }))
                    }
                } else if (action === 'remove') {
                    await audioStorage.removeTrack(mediaItem.Id)
                    patchMediaItem(mediaItem.Id, item => ({ ...item, offlineState: undefined }))
                }

                queryClient.invalidateQueries({ queryKey: ['downloads'] })
                refreshStorageStats()
            } catch (error) {
                console.error(`Task failed for ${action} id=${mediaItem.Id}`, error)

                if (action === 'download') {
                    patchMediaItem(mediaItem.Id, item => ({ ...item, offlineState: undefined }))
                } else if (action === 'remove') {
                    patchMediaItem(mediaItem.Id, item => ({ ...item, offlineState: 'downloaded' }))
                }
            } finally {
                abortControllerRef.current = null
                setQueue(prev => prev.slice(1))
                processingRef.current = false
            }
        }

        runNext()
    }, [api, audioStorage, refreshStorageStats, patchMediaItem, playback, queryClient, queue, setQueue])

    // We need the addToDownloads in jellyfin API but we don't want to cause unnecessary re-renders
    window.addToDownloads = addToDownloads

    return {
        addToDownloads,
        removeFromDownloads,
        storageStats,
        refreshStorageStats,
        queueCount: queue.length,
        clearQueue,
    }
}

export const DownloadContextProvider = ({ children }: { children: ReactNode }) => {
    const initialState = useInitialState()

    return <DownloadContext.Provider value={initialState}>{children}</DownloadContext.Provider>
}

const downloadTranscodedTrack = async (
    manifestUrl: string,
    signal?: AbortSignal
): Promise<{ playlist: Blob; ts: Blob[] }> => {
    // 1. Fetch the playlist (master or media)
    const manifestText = await (await fetch(manifestUrl, { signal })).text()

    // 2. Parse it
    const parser = new Parser()
    parser.push(manifestText)
    parser.end()

    const baseUrl = manifestUrl.replace(/\/[^/]+$/, '/')
    const playlistBlob = new Blob([manifestText], { type: 'application/vnd.apple.mpegurl' })

    // 3a. If it's a master playlist, recurse into the first variant
    if (parser.manifest.playlists && parser.manifest.playlists.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const variantUri = (parser as any).manifest.playlists[0].uri
        const variantUrl = new URL(variantUri, baseUrl).toString()
        return await downloadTranscodedTrack(variantUrl, signal)
    }

    // 3b. Otherwise it’s a media playlist: grab its segments
    const segments = parser.manifest.segments
    if (!segments || segments.length === 0) {
        throw new Error('No segments found in media playlist')
    }

    // 4. Download each TS segment
    const tsBlobs: Blob[] = []
    for (const { uri } of segments) {
        const segUrl = new URL(uri, baseUrl).toString()
        const res = await fetch(segUrl, { signal })
        if (!res.ok) throw new Error(`Segment error ${res.status}`)
        tsBlobs.push(await res.blob())
    }

    // 5. Return the media playlist and its TS segments
    return { playlist: playlistBlob, ts: tsBlobs }
}
