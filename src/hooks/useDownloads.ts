import { Parser } from 'm3u8-parser'
import { useEffect, useRef, useState } from 'react'
import { MediaItem } from '../api/jellyfin'
import { useAudioStorageContext } from '../context/AudioStorageContext/AudioStorageContext'
import { useJellyfinContext } from '../context/JellyfinContext/JellyfinContext'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { usePatchQueries } from './usePatchQueries'

const STORAGE_KEY = 'mediaTaskQueue'

type IMediaType = 'song' | 'container'
type Task = { id: string; action: 'download' | 'remove'; mediaType: IMediaType }

export const useDownloads = () => {
    const api = useJellyfinContext()
    const playback = usePlaybackContext()
    const audioStorage = useAudioStorageContext()
    const { patchMediaItem, patchMediaItems } = usePatchQueries()

    const [queue, setQueue] = useState<Task[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            return stored ? (JSON.parse(stored) as Task[]) : []
        } catch (e) {
            console.error('Failed to load media task queue:', e)
            return []
        }
    })

    const processingRef = useRef(false)

    // Persist queue
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
        } catch (e) {
            console.error('Failed to save media task queue:', e)
        }
    }, [queue])

    // Enqueue download
    const addToDownloads = (itemIds: string[], containerId: string | undefined) => {
        patchMediaItems(itemIds, item => ({ ...item, offlineState: 'downloading' }))

        if (containerId) {
            patchMediaItem(containerId, item => ({ ...item, offlineState: 'downloading' }))
        }

        setQueue(prev => {
            const newTasks = itemIds
                .filter(id => !prev.some(task => task.id === id && task.action === 'download'))
                .map(id => ({ id, action: 'download' as const, mediaType: 'song' as IMediaType }))

            if (containerId) {
                newTasks.push({ id: containerId, action: 'download', mediaType: 'container' as IMediaType })
            }

            return newTasks.length ? [...prev, ...newTasks] : prev
        })
    }

    // Enqueue removal
    const removeFromDownloads = (itemIds: string[], containerId: string | undefined) => {
        patchMediaItems(itemIds, item => ({ ...item, offlineState: 'deleting' }))

        if (containerId) {
            patchMediaItem(containerId, item => ({ ...item, offlineState: 'deleting' }))
        }

        setQueue(prev => {
            const newTasks = itemIds
                .filter(id => !prev.some(task => task.id === id && task.action === 'remove'))
                .map(id => ({ id, action: 'remove' as const, mediaType: 'song' as IMediaType }))

            if (containerId) {
                newTasks.push({ id: containerId, action: 'remove', mediaType: 'container' as IMediaType })
            }

            return newTasks.length ? [...prev, ...newTasks] : prev
        })
    }

    // Process queue tasks one at a time
    useEffect(() => {
        const runNext = async () => {
            if (processingRef.current) return
            const next = queue[0]
            if (!next) return

            processingRef.current = true
            const { id, action, mediaType } = next

            try {
                if (action === 'download') {
                    const already = await audioStorage.hasTrack(id)
                    if (already) {
                        patchMediaItem(id, item => ({ ...item, offlineState: 'downloaded' }))
                    } else {
                        if (mediaType === 'song') {
                            const isTranscoded = [128000, 192000, 256000, 320000].includes(playback.bitrate)

                            if (isTranscoded) {
                                const streamUrl = api.getStreamUrl(id, playback.bitrate)
                                const { playlist, ts } = await downloadTranscodedTrack(streamUrl)
                                await audioStorage.saveTrack(id, { type: 'm3u8', playlist, ts })
                            } else {
                                const streamUrl = api.getStreamUrl(id, playback.bitrate)
                                const response = await fetch(streamUrl)
                                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                                const blob = await response.blob()
                                await audioStorage.saveTrack(id, { type: 'song', blob })
                            }
                        } else {
                            await audioStorage.saveTrack(id, { type: 'container' })
                        }

                        patchMediaItem(id, item => ({ ...item, offlineState: 'downloaded' }))
                    }
                } else if (action === 'remove') {
                    await audioStorage.removeTrack(id)
                    patchMediaItem(id, item => ({ ...item, offlineState: undefined }))
                }
            } catch (error) {
                console.error(`Task failed for ${action} id=${id}`, error)

                if (action === 'download') {
                    patchMediaItem(id, item => ({ ...item, offlineState: undefined }))
                }
            } finally {
                setQueue(prev => prev.slice(1))
                processingRef.current = false
            }
        }

        runNext()
    }, [api, audioStorage, patchMediaItem, playback.bitrate, queue])

    // We need the addToDownloads in jellyfin API but we don't want to cause unnecessary re-renders
    window.addToDownloads = addToDownloads

    return { queue, addToDownloads, removeFromDownloads }
}

const downloadTranscodedTrack = async (manifestUrl: string): Promise<{ playlist: Blob; ts: Blob[] }> => {
    // 1. Fetch the playlist (master or media)
    const manifestText = await (await fetch(manifestUrl)).text()

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
        // The current playlistBlob is the master playlist.
        // The recursive call will fetch the media playlist and its segments.
        return await downloadTranscodedTrack(variantUrl)
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
        const res = await fetch(segUrl)
        if (!res.ok) throw new Error(`Segment error ${res.status}`)
        tsBlobs.push(await res.blob())
    }

    // 5. Return the media playlist and its TS segments
    return { playlist: playlistBlob, ts: tsBlobs }
}

export const syncDownloads = (container: MediaItem, items: MediaItem[]) => {
    if (container.offlineState === 'downloaded') {
        const toDownload = items.filter(track => track.offlineState !== 'downloaded')

        if (toDownload.length) {
            // Explicitly set offlineState to 'downloading' since addToDownloads happens before they are stored in react-query, so that patch will fail
            for (const track of toDownload) {
                track.offlineState = 'downloading'
            }

            window.addToDownloads(toDownload.map(track => track.Id))
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

            window.addToDownloads(toDownload.map(track => track.Id))
        }
    }
}
