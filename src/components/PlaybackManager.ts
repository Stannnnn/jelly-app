import { InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import Hls, { FragmentLoaderContext, HlsConfig, LoaderCallbacks, LoaderConfiguration } from 'hls.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MediaItem } from '../api/jellyfin'
import { useAudioStorageContext } from '../context/AudioStorageContext/AudioStorageContext'
import { useJellyfinContext } from '../context/JellyfinContext/JellyfinContext'
import { IJellyfinInfiniteProps, useJellyfinInfiniteData } from '../hooks/Jellyfin/Infinite/useJellyfinInfiniteData'
import { isMediaItem } from '../hooks/usePatchQueries'
import { useConfig } from '../hooks/useConfig'

export type IReviver = {
    queryKey: unknown[]
    queryFn?: { fn: string; params: unknown[] }
}

export const ___PAGE_PARAM_INDEX___ = '___PAGE_PARAM_INDEX___'

export type PlaybackManagerProps = {
    initialVolume: number
    clearOnLogout?: boolean
}

export const usePlaybackManager = ({ initialVolume, clearOnLogout }: PlaybackManagerProps) => {
    const api = useJellyfinContext()
    // Session based play count for settings page
    const [sessionPlayCount, setSessionPlayCount] = useConfig('playback.state.sessionplaycount', 0)

    // Lyrics
    const [lyricsTimestamps, setLyricsTimestamps] = useConfig('lyrics.timestamps', false)
    const [centeredLyrics, setCenteredLyrics] = useConfig('lyrics.centered', false)

    // UI Settings
    const [rememberFilters, setRememberFilters] = useConfig('ui.remember-filters', true)

    const [currentTrackIndex, setCurrentTrackIndex] = useConfig('playback.state.trackindex', -1, { sync: false })
    const [isPlaying, setIsPlaying] = useState(false)

    const [volume, setVolume] = useConfig('playback.state.volume', initialVolume, { sync: false })
    const [shuffle, setShuffle] = useConfig('playback.state.shuffle', false, { sync: false })
    const [repeat, setRepeat] = useConfig<'off' | 'all' | 'one'>('playback.state.repeat', 'off', { sync: false })

    const crossfade = useRef<'A' | 'B'>('A')
    const [isCrossfadeActive, setIsCrossfadeActive] = useConfig('playback.crossfade.active', false)
    const [crossfadeDuration, setCrossfadeDuration] = useConfig('playback.crossfade.duration', 1)

    const audioA = useRef(new Audio())
    const audioB = useRef(new Audio())

    const hlsA = useRef<Hls | null>(null)
    const hlsB = useRef<Hls | null>(null)

    const audioRef = crossfade.current === 'A' ? audioA : audioB
    const crossfadeRef = crossfade.current === 'A' ? audioB : audioA

    const hlsRef = crossfade.current === 'A' ? hlsA : hlsB

    const hasRestored = useRef(false)
    const queryClient = useQueryClient()

    const [playlistTitle, setPlaylistTitle] = useConfig('playback.state.title', '')
    const [reviver, setReviver] = useConfig<IReviver>('playback.state.reviver', { queryKey: [] })

    const [bitrate, setBitrate] = useConfig('playback.bitrate', 0)

    const needsReloadRef = useRef(false)

    const audioStorage = useAudioStorageContext()

    const tmpShuffleTrackRef = useRef<MediaItem | undefined>(undefined)

    // Shuffle is normally handled by passing 'random' to queryFn but when this is not an infinite query we have to manually handle it
    const isManualShuffle = useMemo(() => {
        return shuffle && !(reviver.queryFn?.params || []).includes(___PAGE_PARAM_INDEX___)
    }, [reviver.queryFn?.params, shuffle])

    const reviverFn = useMemo(() => {
        const queryFn = reviver.queryFn?.fn || ''
        const params = [...(reviver.queryFn?.params || [])]
        const pageParamIndex = params.findIndex(param => param === ___PAGE_PARAM_INDEX___)

        return {
            queryKey: ['reviver', ...(shuffle && !isManualShuffle ? ['shuffle'] : []), ...(reviver.queryKey || [])],
            queryFn: async ({ pageParam = 0 }) => {
                try {
                    const itemsPerPage = params[pageParamIndex + 1]
                    const startIndex = (pageParam as number) * (itemsPerPage as number)

                    params[pageParamIndex] = startIndex

                    // When shuffle is enabled, we set the pageParam to 'Random' to fetch random items
                    // Note; Hardcoded it to 2 params after the pageParam, should improve this
                    if (shuffle && !isManualShuffle) {
                        params[pageParamIndex + 2] = 'Random'
                    }

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const response: MediaItem[] = (await (api as any)[queryFn]?.(...params)) || []

                    if (shuffle && !isManualShuffle && tmpShuffleTrackRef.current) {
                        response.splice(currentTrackIndex, 0, tmpShuffleTrackRef.current)
                    }

                    tmpShuffleTrackRef.current = undefined

                    return response
                } catch (e) {
                    console.error('Error in reviver queryFn:', e)
                    console.trace()
                    return []
                }
            },
            queryFnReviver: undefined,
            // NOTE; The reviverPageIndex is probably wrong but its not really an issue for now
            initialPageParam: Number(localStorage.getItem('reviverPageIndex')) || 0,
            allowDuplicates: true,
            enabled: params.length > 0,
        } satisfies IJellyfinInfiniteProps
    }, [
        api,
        currentTrackIndex,
        isManualShuffle,
        reviver.queryFn?.fn,
        reviver.queryFn?.params,
        reviver.queryKey,
        shuffle,
    ])

    const queueCounter = useRef(0)

    const addQueueId = useCallback((a: MediaItem) => {
        a.queueId ||= `${a.Id}-${Date.now().toString(36)}-${queueCounter.current++}`
        return a
    }, [])

    // Playlist can contain duplicates, so we need to ensure each item has a unique queueId
    const updateQueueId = useCallback((a: MediaItem) => {
        a.queueId = `${a.Id}-${Date.now().toString(36)}-${queueCounter.current++}`
        return a
    }, [])

    const { items: _items, hasNextPage, loadMore, isLoading, infiniteData } = useJellyfinInfiniteData(reviverFn)

    const items = useMemo(() => {
        const itemsWithIds = _items.map(addQueueId)

        if (isManualShuffle && itemsWithIds.length) {
            const playedEnd = currentTrackIndex + 1
            const played = itemsWithIds.slice(0, playedEnd)
            const future = itemsWithIds.slice(playedEnd).sort(() => Math.random() - 0.5)
            return [...played, ...future]
        }

        return itemsWithIds
        // We ignore 'currentTrackIndex' here because we only want to shuffle once, not on every render.
    }, [_items, addQueueId, isManualShuffle]) // eslint-disable-line react-hooks/exhaustive-deps

    const _pages = useMemo(() => {
        return (
            infiniteData?.pages.map(page => {
                if (!page) {
                    console.error('_pages: Page is undefined or null', infiniteData)
                    console.trace()
                    return []
                }

                if (!Array.isArray(page)) {
                    console.error('_pages: Page is not an array', infiniteData)
                    console.trace()
                    return []
                }

                if (page[0] && !isMediaItem(page[0])) {
                    console.error('_pages: Page does not contain MediaItem objects', infiniteData)
                    console.trace()
                    return []
                }

                return page.map(addQueueId)
            }) || []
        )
    }, [addQueueId, infiniteData])

    const updateCurrentPlaylist = useCallback(
        async (cb: (pages: MediaItem[][]) => Promise<MediaItem[][]>) => {
            const queryKey = reviverFn.queryKey

            queryClient.setQueryData(queryKey, {
                pageParams: Object.keys(_pages),
                pages: (await cb(_pages)).map(page => page.map(updateQueueId)),
            } satisfies InfiniteData<MediaItem[], unknown>)
        },
        [reviverFn.queryKey, _pages, queryClient, updateQueueId]
    )

    const setCurrentPlaylist = useCallback(
        (props: { pages: InfiniteData<MediaItem[], unknown>; title: string; reviver?: IReviver | 'persistAll' }) => {
            if (props.reviver !== 'persistAll') {
                const queryKey = ['reviver', ...(props.reviver?.queryKey || [])]

                queryClient.setQueryData(queryKey, props.pages)

                setReviver(props.reviver || ({} as IReviver))

                setShuffle(false)
            }

            setPlaylistTitle(props.title)

            tmpShuffleTrackRef.current = undefined
        },
        [queryClient, setPlaylistTitle, setReviver, setShuffle]
    )

    const setCurrentPlaylistSimple = useCallback(
        (props: { playlist: MediaItem[]; title: string }) => {
            setCurrentPlaylist({
                pages: { pageParams: [1], pages: [props.playlist] },
                title: props.title,
            })
        },
        [setCurrentPlaylist]
    )

    const moveItemInPlaylist = useCallback(
        async (oldIndex: number, newIndex: number) => {
            await updateCurrentPlaylist(async pages => {
                const flat = pages.flat()
                const [movedItem] = flat.splice(oldIndex, 1)
                flat.splice(newIndex, 0, movedItem)

                const newPages: typeof pages = []
                let offset = 0

                for (const page of pages) {
                    const length = page.length
                    newPages.push(flat.slice(offset, offset + length))
                    offset += length
                }

                return newPages
            })
        },
        [updateCurrentPlaylist]
    )

    const abortControllerRef = useRef<AbortController | null>(null)

    const [userInteracted, setUserInteracted] = useState(false)

    const currentTrack = useMemo<MediaItem | undefined>(() => {
        return tmpShuffleTrackRef.current || items[currentTrackIndex] || undefined
    }, [currentTrackIndex, items])

    useEffect(() => {
        if (isManualShuffle) {
            tmpShuffleTrackRef.current = undefined
        }
    }, [isManualShuffle, items])

    const { data: currentTrackLyrics, isLoading: currentTrackLyricsLoading } = useQuery({
        queryKey: ['lyrics', currentTrack?.Id],
        queryFn: async () => {
            const id = currentTrack?.Id

            if (id) {
                try {
                    return await api.getTrackLyrics(id)
                } catch (e) {
                    if (!(e instanceof AxiosError && e.response?.status === 404)) console.error(e)
                    return null
                }
            }

            return null
        },
    })

    // Update Media Session metadata
    const updateMediaSessionMetadata = useCallback(
        (track: MediaItem) => {
            if ('mediaSession' in navigator) {
                const artworkUrl = api.getImageUrl(track, 'Primary', { width: 512, height: 512 })

                navigator.mediaSession.metadata = new MediaMetadata({
                    title: track.Name || 'Unknown Track',
                    artist: track.Artists?.join(', ') || track.AlbumArtist || 'Unknown Artist',
                    album: track.Album || 'Unknown Album',
                    artwork: artworkUrl
                        ? [
                              {
                                  src: artworkUrl,
                                  sizes: '512x512',
                                  type: 'image/webp',
                              },
                          ]
                        : [],
                })
            }
        },
        [api]
    )

    useEffect(() => {
        if (!isPlaying || !currentTrack) return

        const interval = setInterval(() => {
            api.reportPlaybackProgress(currentTrack.Id, audioRef.current.currentTime, false)
        }, 10000)

        return () => clearInterval(interval)
    }, [api, audioRef, currentTrack, isPlaying])

    // Handle login/logout and sync to localStorage
    useEffect(() => {
        if (clearOnLogout || !api.auth.token) {
            setSessionPlayCount(0)
        } else if (api.auth.token) {
            setSessionPlayCount(sessionPlayCount)
        }
    }, [api.auth.token, clearOnLogout, sessionPlayCount, setSessionPlayCount])

    // Force session play count to reset
    const resetSessionCount = () => {
        setSessionPlayCount(0)
    }

    const handleHls = useCallback(
        async (offlineUrl: string | undefined, streamUrl: string, trackId: string) => {
            const hlsConfig: Partial<HlsConfig> = {
                enableWorker: false,
                maxBufferLength: 10,
                maxMaxBufferLength: 20,
            }

            if (offlineUrl) {
                const stored = await audioStorage.getTrack(trackId)
                if (stored?.type === 'm3u8') {
                    const playlistText = await stored.playlist.text()
                    const segmentBuffers = await Promise.all(stored.ts.map(tsBlob => tsBlob.arrayBuffer()))
                    const m = playlistText.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/)
                    const sequenceOffset = m ? parseInt(m[1], 10) : 1

                    class CustomLoader extends Hls.DefaultConfig.loader {
                        load(
                            context: FragmentLoaderContext,
                            _config: LoaderConfiguration,
                            callbacks: LoaderCallbacks<FragmentLoaderContext>
                        ) {
                            if (context.frag) {
                                const sn = context.frag.sn as number
                                const idx = sn - sequenceOffset
                                const buf = segmentBuffers[idx]

                                if (buf) {
                                    callbacks.onSuccess(
                                        { data: buf, url: context.url },
                                        {
                                            aborted: false,
                                            loaded: buf.byteLength,
                                            total: buf.byteLength,
                                            retry: 0,
                                            chunkCount: 0,
                                            bwEstimate: 0,
                                            loading: { start: 0, first: 0, end: 0 },
                                            parsing: { start: 0, end: 0 },
                                            buffering: { start: 0, first: 0, end: 0 },
                                        },
                                        context,
                                        null
                                    )
                                }
                            }
                        }
                    }

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    hlsConfig.fLoader = CustomLoader as any
                }
            }

            const hls = new Hls(hlsConfig)
            hlsRef.current = hls

            hls.loadSource(offlineUrl || streamUrl)
            hls.attachMedia(audioRef.current)

            hls.on(Hls.Events.ERROR, (_evt, data) => {
                console.error('HLS error:', data.type, data.details, data)
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            needsReloadRef.current = true
                            audioRef.current.pause()
                            break
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError()
                            break
                        default:
                            needsReloadRef.current = true
                            audioRef.current.pause()
                    }
                }
            })
        },
        [audioRef, audioStorage, hlsRef]
    )

    const setAudioSourceAndLoad = useCallback(
        async (track: MediaItem) => {
            if (!audioRef.current) return

            audioRef.current.pause()
            audioRef.current.currentTime = 0

            hlsRef.current?.destroy()
            hlsRef.current = null

            const offlineUrl = await audioStorage.getPlayableUrl(track.Id)
            const streamUrl = api.getStreamUrl(track.Id, bitrate)
            const isTranscoded = offlineUrl
                ? offlineUrl.type === 'm3u8'
                : [128000, 192000, 256000, 320000].includes(bitrate)

            if (isTranscoded && Hls.isSupported()) {
                await handleHls(offlineUrl?.url, streamUrl, track.Id)
            } else {
                audioRef.current.src = offlineUrl?.url || streamUrl
                audioRef.current.load()
            }
        },
        [api, audioRef, audioStorage, bitrate, handleHls, hlsRef]
    )

    const playTrack = useCallback(async () => {
        const track = currentTrack

        if (!track) {
            return
        }

        if (track.pageIndex) {
            localStorage.setItem('reviverPageIndex', track.pageIndex.toString())
        } else {
            localStorage.removeItem('reviverPageIndex')
        }

        abortControllerRef.current?.abort('abort')
        abortControllerRef.current = new AbortController()
        const signal = abortControllerRef.current.signal

        if (audioRef.current) {
            const audio = audioRef.current
            if (currentTrack && isPlaying) {
                // If the playback stopped request fails, we can still continue playing the new track
                api.reportPlaybackStopped(currentTrack.Id, audio.currentTime, signal)
            }

            try {
                await setAudioSourceAndLoad(track)

                await new Promise<void>((resolve, reject) => {
                    const onLoadedMetadata = async () => {
                        audio.removeEventListener('loadedmetadata', onLoadedMetadata)
                        signal.removeEventListener('abort', onAbort)

                        try {
                            if (userInteracted) {
                                await audio.play()
                            }
                        } catch (e) {
                            reject(e)
                        }

                        resolve()
                    }
                    const onAbort = () => {
                        audio.removeEventListener('loadedmetadata', onLoadedMetadata)
                        resolve()
                    }
                    signal.addEventListener('abort', onAbort)
                    audio.addEventListener('loadedmetadata', onLoadedMetadata)
                })

                setSessionPlayCount(prev => {
                    const newCount = prev + 1
                    return newCount
                })

                updateMediaSessionMetadata(track)

                // Report playback start to Jellyfin
                api.reportPlaybackStart(track.Id, signal)
            } catch (error) {
                console.error('Error playing track:', error)
            }
        }
    }, [
        api,
        audioRef,
        currentTrack,
        isPlaying,
        setAudioSourceAndLoad,
        setSessionPlayCount,
        updateMediaSessionMetadata,
        userInteracted,
    ])

    const togglePlayPause = useCallback(async () => {
        setUserInteracted(true)

        if (audioRef.current && currentTrack) {
            const audio = audioRef.current
            if (isPlaying) {
                audio.pause()
                crossfadeRef.current.pause()

                // If progress fails to report, we can still continue playback
                api.reportPlaybackProgress(currentTrack.Id, audio.currentTime, true)
            } else {
                if (needsReloadRef.current || (!audio.src && !hlsRef.current && currentTrack)) {
                    const restoreTime = needsReloadRef.current ? audio.currentTime : 0
                    needsReloadRef.current = false

                    await setAudioSourceAndLoad(currentTrack)

                    if (restoreTime) {
                        audio.currentTime = restoreTime
                    }
                }

                try {
                    await audio.play()
                    api.reportPlaybackProgress(currentTrack.Id, audio.currentTime, false)
                    updateMediaSessionMetadata(currentTrack)
                } catch (error) {
                    console.error('Error resuming playback:', error)
                    audioRef.current.pause()
                }
            }
        }
    }, [
        api,
        audioRef,
        crossfadeRef,
        currentTrack,
        hlsRef,
        isPlaying,
        setAudioSourceAndLoad,
        updateMediaSessionMetadata,
    ])

    useEffect(() => {
        if (currentTrackIndex >= 0 && currentTrackIndex < items.length && items[currentTrackIndex]) {
            playTrack()
        } else {
            if (audioRef.current) {
                audioRef.current.pause()
            }
        }
    }, [currentTrack?.Id]) // eslint-disable-line react-hooks/exhaustive-deps

    const hasNextTrack = useCallback(() => {
        if (!items || items.length === 0 || currentTrackIndex === -1) {
            return false
        }

        return currentTrackIndex + 1 < items.length
    }, [currentTrackIndex, items])

    const nextTrack = useCallback(async () => {
        setUserInteracted(true)

        if (!items || items.length === 0 || currentTrackIndex === -1 || !currentTrack) {
            if (audioRef.current) {
                audioRef.current.pause()
            }

            return
        }

        if (repeat === 'one') {
            playTrack()
        } else {
            const nextIndex = currentTrackIndex + 1
            if (nextIndex >= items.length) {
                if (await loadMore()) {
                    setCurrentTrackIndex(nextIndex)
                } else {
                    if (repeat === 'all') {
                        setCurrentTrackIndex(0)
                    } else {
                        if (audioRef.current) {
                            audioRef.current.pause()
                        }

                        return
                    }
                }
            } else {
                setCurrentTrackIndex(nextIndex)
            }
        }
    }, [audioRef, currentTrack, currentTrackIndex, items, loadMore, playTrack, repeat, setCurrentTrackIndex])

    const previousTrack = useCallback(async () => {
        setUserInteracted(true)

        if (!items || items.length === 0 || currentTrackIndex === -1 || !currentTrack) {
            if (audioRef.current) {
                audioRef.current.pause()
            }

            return
        }

        if (repeat === 'one') {
            playTrack()
        } else {
            const prevIndex = currentTrackIndex - 1
            if (prevIndex < 0) {
                if (repeat === 'all') {
                    setCurrentTrackIndex(items.length - 1)
                } else {
                    if (audioRef.current) {
                        audioRef.current.pause()
                    }

                    return
                }
            } else {
                setCurrentTrackIndex(prevIndex)
            }
        }
    }, [audioRef, currentTrack, currentTrackIndex, items, playTrack, repeat, setCurrentTrackIndex])

    const nextTrackCrossfade = useCallback(async () => {
        if (!audioRef.current) return

        if (isCrossfadeActive && hasNextTrack()) {
            crossfade.current = crossfade.current === 'A' ? 'B' : 'A'
            await nextTrack()
        }
    }, [audioRef, hasNextTrack, isCrossfadeActive, nextTrack])

    useEffect(() => {
        if (!audioRef.current) return

        const onTimeUpdate = () => {
            if (
                audioRef.current.duration - audioRef.current.currentTime < crossfadeDuration &&
                isPlaying &&
                repeat !== 'one'
            ) {
                nextTrackCrossfade()
            }
        }

        const audio = audioRef.current

        audio.addEventListener('timeupdate', onTimeUpdate)

        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate)
        }
    }, [audioRef, crossfadeDuration, isPlaying, nextTrackCrossfade, repeat])

    const toggleShuffle = useCallback(() => {
        const newShuffle = !shuffle

        setShuffle(newShuffle)

        if (newShuffle) {
            tmpShuffleTrackRef.current = currentTrack

            queryClient.removeQueries({
                queryKey: [
                    'reviver',
                    ...(newShuffle && !isManualShuffle ? ['shuffle'] : []),
                    ...(reviver.queryKey || []),
                ],
            })
        }
    }, [currentTrack, isManualShuffle, queryClient, reviver.queryKey, setShuffle, shuffle])

    const toggleRepeat = () => {
        setRepeat(prev => {
            const newRepeat = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'
            return newRepeat
        })
    }

    const formatTime = (seconds: number) => {
        if (isNaN(seconds) || seconds === 0) return '0:00'
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = Math.floor(seconds % 60)

        if (hrs > 0) {
            return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
        }
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`
    }

    // Set initial volume
    useEffect(() => {
        audioRef.current.volume = volume
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Attach play/pause event listeners
    useEffect(() => {
        const audio = audioRef.current

        const handlePlay = () => {
            setIsPlaying(true)
        }

        const handlePause = () => {
            setIsPlaying(false)
        }

        audio.addEventListener('play', handlePlay)
        audio.addEventListener('pause', handlePause)

        return () => {
            audio.removeEventListener('play', handlePlay)
            audio.removeEventListener('pause', handlePause)
        }
    }, [audioRef])

    // Attach error event listeners
    useEffect(() => {
        const audio = audioRef.current

        const handleError = (e: Event) => {
            console.error('Audio error during playback:', e)
            needsReloadRef.current = true
            audioRef.current.pause()
        }

        audio.addEventListener('error', handleError)

        return () => {
            audio.removeEventListener('error', handleError)
        }
    }, [audioRef])

    // Set up Media Session API for next/previous actions
    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('nexttrack', nextTrack)
            navigator.mediaSession.setActionHandler('previoustrack', previousTrack)
            navigator.mediaSession.setActionHandler('play', togglePlayPause)
            navigator.mediaSession.setActionHandler('pause', togglePlayPause)

            return () => {
                navigator.mediaSession.setActionHandler('nexttrack', null)
                navigator.mediaSession.setActionHandler('previoustrack', null)
                navigator.mediaSession.setActionHandler('play', null)
                navigator.mediaSession.setActionHandler('pause', null)
            }
        }
    }, [nextTrack, previousTrack, togglePlayPause])

    useEffect(() => {
        setVolume(volume)
        if (audioRef.current) {
            audioRef.current.volume = volume
        }
    }, [audioRef, setVolume, volume])

    useEffect(() => {
        if (hasRestored.current) return
        hasRestored.current = true

        const restoreAudio = async () => {
            const savedIndex = currentTrackIndex
            if (api.auth.token) {
                const indexInPlaylist = Number(savedIndex)
                if (indexInPlaylist !== -1) {
                    setCurrentTrackIndex(currentTrackIndex)
                } else if (savedIndex) {
                    setCurrentTrackIndex(Number(savedIndex))
                } else {
                    setCurrentTrackIndex(-1)
                }

                const lastPlayedTrack = items[currentTrackIndex]

                if (lastPlayedTrack) {
                    if (audioRef.current) {
                        await setAudioSourceAndLoad(lastPlayedTrack)
                    }
                    updateMediaSessionMetadata(lastPlayedTrack)
                }
            } else if (!api.auth.token) {
                setCurrentTrackIndex(-1)
            }
        }

        restoreAudio()
    }, [
        api.auth.token,
        audioRef,
        currentTrackIndex,
        items,
        setAudioSourceAndLoad,
        setCurrentTrackIndex,
        updateMediaSessionMetadata,
    ])

    // Preload next page when near end
    useEffect(() => {
        const threshold = 5

        if (hasNextPage && currentTrackIndex >= items.length - threshold) {
            loadMore()
        }
    }, [currentTrackIndex, hasNextPage, items.length, loadMore])

    useEffect(() => {
        if (!audioRef.current) return

        const audio = audioRef.current

        const handleEnded = async () => {
            if (!currentTrack || currentTrackIndex === -1 || !items || items.length === 0) {
                if (currentTrack) {
                    api.reportPlaybackStopped(currentTrack.Id, audio.currentTime)
                }

                return
            }

            api.reportPlaybackStopped(currentTrack.Id, audio.currentTime)

            if (repeat === 'one') {
                playTrack()
            } else {
                nextTrack()
            }
        }

        audio.addEventListener('ended', handleEnded)

        return () => {
            audio.removeEventListener('ended', handleEnded)
        }
    }, [api, audioRef, currentTrack, currentTrackIndex, items, nextTrack, playTrack, repeat])

    useEffect(() => {
        if (clearOnLogout && currentTrack) {
            api.reportPlaybackStopped(currentTrack.Id, audioRef.current.currentTime)
            setCurrentTrackIndex(-1)

            if (audioRef.current) {
                audioRef.current.pause()
            }
        }
    }, [api, audioRef, clearOnLogout, currentTrack, setCurrentTrackIndex])

    return {
        currentTrack,
        currentTrackIndex: currentTrackIndex,
        currentTrackLyricsLoading,
        currentTrackLyrics,
        isPlaying,
        togglePlayPause,
        formatTime,
        lyricsTimestamps,
        setLyricsTimestamps,
        centeredLyrics,
        setCenteredLyrics,
        volume,
        setVolume,
        playTrack: (index: number) => {
            setUserInteracted(true)
            setCurrentTrackIndex(index)
        },
        nextTrack,
        previousTrack,
        shuffle,
        toggleShuffle,
        repeat,
        toggleRepeat,
        currentPlaylist: items,
        setCurrentPlaylist,
        setCurrentPlaylistSimple,
        updateCurrentPlaylist,
        moveItemInPlaylist,
        loadMore,
        sessionPlayCount,
        resetSessionCount,
        playlistTitle,
        audioRef,
        crossfadeRef,
        bitrate,
        setBitrate,
        isLoading,
        isCrossfadeActive,
        setIsCrossfadeActive,
        crossfadeDuration,
        setCrossfadeDuration,
        rememberFilters,
        setRememberFilters,
    }
}
