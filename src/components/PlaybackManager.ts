import { InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import Hls, { FragmentLoaderContext, HlsConfig, LoaderCallbacks, LoaderConfiguration } from 'hls.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MediaItem } from '../api/jellyfin'
import { useAudioStorageContext } from '../context/AudioStorageContext/AudioStorageContext'
import { useJellyfinContext } from '../context/JellyfinContext/JellyfinContext'
import { IJellyfinInfiniteProps, useJellyfinInfiniteData } from '../hooks/Jellyfin/Infinite/useJellyfinInfiniteData'
import { isMediaItem } from '../hooks/usePatchQueries'

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
    const [sessionPlayCount, setSessionPlayCount] = useState(() => {
        const saved = localStorage.getItem('sessionPlayCount')
        return saved ? Number(saved) : 0
    })

    // Lyrics
    const [lyricsTimestamps, setLyricsTimestamps] = useState(localStorage.getItem('lyricsTimestamps') === 'on')
    useEffect(() => localStorage.setItem('lyricsTimestamps', lyricsTimestamps ? 'on' : 'off'), [lyricsTimestamps])

    const [centeredLyrics, setCenteredLyrics] = useState(localStorage.getItem('centeredLyrics') === 'on')
    useEffect(() => localStorage.setItem('centeredLyrics', centeredLyrics ? 'on' : 'off'), [centeredLyrics])

    // UI Settings
    const [rememberFilters, setRememberFilters] = useState(localStorage.getItem('rememberFilters') === 'on')
    useEffect(() => localStorage.setItem('rememberFilters', rememberFilters ? 'on' : 'off'), [rememberFilters])

    // Queue Protection Setting
    const [warnBeforeOverwriteQueue, setWarnBeforeOverwriteQueue] = useState(
        localStorage.getItem('warnBeforeOverwriteQueue') === 'on'
    )

    useEffect(
        () => localStorage.setItem('warnBeforeOverwriteQueue', warnBeforeOverwriteQueue ? 'on' : 'off'),
        [warnBeforeOverwriteQueue]
    )

    // Update Checker Setting
    const [checkForUpdates, setCheckForUpdates] = useState(localStorage.getItem('checkForUpdates') === 'on')

    useEffect(() => localStorage.setItem('checkForUpdates', checkForUpdates ? 'on' : 'off'), [checkForUpdates])

    const [currentTrackIndex, setCurrentTrackIndex] = useState({
        index: localStorage.getItem('currentTrackIndex') ? Number(localStorage.getItem('currentTrackIndex')) : -1,
    })
    const [isPlaying, setIsPlaying] = useState(false)

    const [volume, setVolume] = useState(() => {
        const savedVolume = localStorage.getItem('volume')
        return savedVolume ? parseFloat(savedVolume) : initialVolume
    })

    const [shuffle, setShuffle] = useState(localStorage.getItem('shuffle') === 'true')
    const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>(() => {
        const savedRepeat = localStorage.getItem('repeatMode')
        return savedRepeat === 'all' || savedRepeat === 'one' ? savedRepeat : 'off'
    })

    const [isCrossfadeActive, setIsCrossfadeActive] = useState(localStorage.getItem('crossfade') === 'true')
    const [crossfadeDuration, setCrossfadeDuration] = useState(() => {
        const savedDuration = localStorage.getItem('crossfadeDuration')
        return savedDuration ? Number(savedDuration) : 1
    })

    const [isPreloadActive, setIsPreloadActive] = useState(
        localStorage.getItem('preload') !== 'false' // Default to true unless explicitly set to false
    )
    const [preloadDuration, setPreloadDuration] = useState(() => {
        const savedDuration = localStorage.getItem('preloadDuration')
        return savedDuration ? Number(savedDuration) : 6
    })

    const isPreloaded = useRef(false)
    const preloadedTrackId = useRef<string | undefined>(undefined)

    useEffect(() => {
        localStorage.setItem('crossfade', isCrossfadeActive.toString())
    }, [isCrossfadeActive])

    useEffect(() => {
        localStorage.setItem('crossfadeDuration', crossfadeDuration.toString())
    }, [crossfadeDuration])

    useEffect(() => {
        localStorage.setItem('preload', isPreloadActive.toString())
    }, [isPreloadActive])

    useEffect(() => {
        localStorage.setItem('preloadDuration', preloadDuration.toString())
    }, [preloadDuration])

    useEffect(() => {
        localStorage.setItem('shuffle', shuffle.toString())
    }, [shuffle])

    const audioQueue = useRef([new Audio(), new Audio()])
    const hlsQueue = useRef<[Hls | null, Hls | null]>([null, null])

    const shiftAudioQueue = useCallback(() => {
        audioQueue.current.push(audioQueue.current.shift() as HTMLAudioElement)
    }, [])

    const shiftHlsQueue = useCallback(() => {
        hlsQueue.current.push(hlsQueue.current.shift() as Hls | null)
    }, [])

    const audioRef = audioQueue.current[0]
    const crossfadeRef = audioQueue.current[1]

    const hasRestored = useRef(false)
    const queryClient = useQueryClient()

    const [playlistTitle, setPlaylistTitle] = useState(localStorage.getItem('playlistTitle') || '')
    const [playlistUrl, setPlaylistUrl] = useState(localStorage.getItem('playlistUrl') || '')
    const [reviver, setReviver] = useState<IReviver>(JSON.parse(localStorage.getItem('reviver') || '{}') || {})

    const [bitrate, setBitrate] = useState(Number(localStorage.getItem('bitrate')))
    const [maxWidth, setMaxWidth] = useState(() => {
        const saved = localStorage.getItem('maxWidth')
        return saved || '800'
    })
    const needsReloadRef = useRef(false)

    const audioStorage = useAudioStorageContext()

    const tmpShuffleTrackRef = useRef<MediaItem | undefined>(undefined)

    useEffect(() => {
        localStorage.setItem('bitrate', bitrate.toString())
    }, [bitrate])

    useEffect(() => {
        localStorage.setItem('maxWidth', maxWidth)
    }, [maxWidth])

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
                        response.splice(currentTrackIndex.index, 0, tmpShuffleTrackRef.current)
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
            staleTime: Infinity,
        } satisfies IJellyfinInfiniteProps
    }, [
        api,
        currentTrackIndex.index,
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

    // Mark items as manually added to queue
    const markAsManuallyAdded = useCallback((items: MediaItem[], title = 'Queue', url?: string) => {
        return items.map(item => ({
            ...item,
            manuallyAdded: true,
            originTitle: title,
            ...(url ? { originUrl: url } : {}),
        }))
    }, [])

    const { items: _items, hasNextPage, loadMore, isLoading, infiniteData } = useJellyfinInfiniteData(reviverFn)

    const items = useMemo(() => {
        const itemsWithIds = _items
            .map(addQueueId)
            .map(item =>
                item.originTitle
                    ? item
                    : { ...item, originTitle: playlistTitle, ...(playlistUrl ? { originUrl: playlistUrl } : {}) }
            )

        if (isManualShuffle && itemsWithIds.length) {
            const playedEnd = currentTrackIndex.index + 1
            const played = itemsWithIds.slice(0, playedEnd)
            const future = itemsWithIds.slice(playedEnd).sort(() => Math.random() - 0.5)
            return [...played, ...future]
        }

        return itemsWithIds
        // We ignore 'currentTrackIndex.index' here because we only want to shuffle once, not on every render.
    }, [_items, addQueueId, isManualShuffle, playlistTitle, playlistUrl]) // eslint-disable-line react-hooks/exhaustive-deps

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
        (props: {
            pages: InfiniteData<MediaItem[], unknown>
            title: string
            disableUrl?: boolean
            reviver?: IReviver | 'persistAll'
        }) => {
            if (props.reviver !== 'persistAll') {
                // Check for unplayed manually added items if warning is enabled
                if (warnBeforeOverwriteQueue && items && items.length > 0 && currentTrackIndex.index >= 0) {
                    const unplayedManualItems = items
                        .slice(currentTrackIndex.index + 1)
                        .filter(item => item.manuallyAdded)

                    if (unplayedManualItems.length > 0) {
                        const itemText = unplayedManualItems.length === 1 ? 'track' : 'tracks'
                        const confirmed = confirm(
                            `You've added ${unplayedManualItems.length} ${itemText} to your queue that haven't played yet. Are you sure you want to overwrite the active queue?`
                        )

                        if (!confirmed) {
                            return false
                        }
                    }
                }

                const queryKey = ['reviver', ...(props.reviver?.queryKey || [])]

                const url = location.href
                const itemOriginUrl = url !== '/' && !props.disableUrl ? url : undefined

                // Embed origin into every item so each queue entry carries its own source
                const taggedPages: InfiniteData<MediaItem[], unknown> = {
                    ...props.pages,
                    pages: props.pages.pages.map(page =>
                        page.map(item => ({ ...item, originTitle: props.title, originUrl: itemOriginUrl }))
                    ),
                }

                queryClient.setQueryData(queryKey, taggedPages)

                localStorage.setItem('reviver', JSON.stringify(props.reviver || {}))
                setReviver(props.reviver || ({} as IReviver))

                setShuffle(false)

                localStorage.setItem('playlistTitle', props.title)
                setPlaylistTitle(props.title)

                if (itemOriginUrl) {
                    localStorage.setItem('playlistUrl', itemOriginUrl)
                    setPlaylistUrl(itemOriginUrl)
                } else {
                    localStorage.removeItem('playlistUrl')
                    setPlaylistUrl('')
                }
            }

            tmpShuffleTrackRef.current = undefined
            return true
        },
        [queryClient, warnBeforeOverwriteQueue, items, currentTrackIndex.index]
    )

    const setCurrentPlaylistSimple = useCallback(
        (props: { playlist: MediaItem[]; title: string; disableUrl?: boolean }) => {
            return setCurrentPlaylist({
                pages: { pageParams: [1], pages: [props.playlist] },
                title: props.title,
                disableUrl: props.disableUrl,
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

    // Track user-initiated pause to prevent unwanted auto-resume on devicechange
    const lastUserPauseRef = useRef<number>(0)

    // Track previous track and last reported stopped track to avoid duplicate reports
    const previousTrackRef = useRef<MediaItem | undefined>(undefined)
    const lastStoppedTrackIdRef = useRef<string | undefined>(undefined)

    const currentTrack = useMemo<MediaItem | undefined>(() => {
        return tmpShuffleTrackRef.current || items[currentTrackIndex.index] || undefined
    }, [currentTrackIndex.index, items])

    // Helper function to report playback stopped, avoiding duplicate reports
    const reportTrackStopped = useCallback(
        (track: MediaItem | undefined, currentTime: number, signal?: AbortSignal) => {
            if (!track || track.Id === lastStoppedTrackIdRef.current) {
                return
            }

            lastStoppedTrackIdRef.current = track.Id
            api.reportPlaybackStopped(track.Id, currentTime, signal)
        },
        [api]
    )

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

    const handleSeekTo = useCallback(
        (details: MediaSessionActionDetails) => {
            if (details.seekTime !== undefined) {
                audioRef.currentTime = details.seekTime
            }
        },
        [audioRef]
    )

    useEffect(() => {
        if (!isPlaying || !currentTrack) return

        const interval = setInterval(() => {
            api.reportPlaybackProgress(currentTrack.Id, audioRef.currentTime, false)
        }, 10000)

        return () => clearInterval(interval)
    }, [api, audioRef, currentTrack, isPlaying])

    // Handle login/logout and sync to localStorage
    useEffect(() => {
        if (clearOnLogout || !api.auth.token) {
            setSessionPlayCount(0)
            localStorage.removeItem('sessionPlayCount')
        } else if (api.auth.token) {
            localStorage.setItem('sessionPlayCount', sessionPlayCount.toString())
        }
    }, [api.auth.token, clearOnLogout, sessionPlayCount])

    // Force session play count to reset
    const resetSessionCount = () => {
        setSessionPlayCount(0)
        localStorage.removeItem('sessionPlayCount')
    }

    const handleHls = useCallback(
        async (
            audio: HTMLAudioElement,
            hlsIndex: number,
            offlineUrl: string | undefined,
            streamUrl: string,
            trackId: string
        ) => {
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
            hlsQueue.current[hlsIndex] = hls

            hls.loadSource(offlineUrl || streamUrl)
            hls.attachMedia(audio)

            hls.on(Hls.Events.ERROR, (_evt, data) => {
                console.error('HLS error:', data.type, data.details, data)
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            needsReloadRef.current = true
                            audio.pause()
                            break
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError()
                            break
                        default:
                            needsReloadRef.current = true
                            audio.pause()
                    }
                }
            })
        },
        [audioStorage]
    )

    const setAudioSourceAndLoad = useCallback(
        async (audio: HTMLAudioElement, hlsIndex: number, track: MediaItem) => {
            audio.pause()
            audio.currentTime = 0

            hlsQueue.current[hlsIndex]?.destroy()

            const offlineUrl = await audioStorage.getPlayableUrl(track.Id)
            const streamUrl = api.getStreamUrl(track.Id, bitrate)
            const isTranscoded = offlineUrl
                ? offlineUrl.type === 'm3u8'
                : [128000, 192000, 256000, 320000].includes(bitrate)

            if (isTranscoded && Hls.isSupported()) {
                await handleHls(audio, hlsIndex, offlineUrl?.url, streamUrl, track.Id)
            } else {
                audio.src = offlineUrl?.url || streamUrl
                audio.load()
            }
        },
        [api, audioStorage, bitrate, handleHls]
    )

    const playTrack = useCallback(async () => {
        if (!currentTrack) {
            return
        }

        if (currentTrack.pageIndex) {
            localStorage.setItem('reviverPageIndex', currentTrack.pageIndex.toString())
        } else {
            localStorage.removeItem('reviverPageIndex')
        }

        abortControllerRef.current?.abort('abort')
        abortControllerRef.current = new AbortController()
        const signal = abortControllerRef.current.signal

        let localAudioRef = audioRef
        let localCrossfadeRef = crossfadeRef

        if (isPlaying && previousTrackRef.current) {
            reportTrackStopped(previousTrackRef.current, localAudioRef.currentTime, signal)
        }

        previousTrackRef.current = currentTrack

        try {
            if (isPreloaded.current) {
                isPreloaded.current = false
                preloadedTrackId.current = undefined

                if (!isCrossfadeActive) {
                    shiftAudioQueue()
                    shiftHlsQueue()
                    localAudioRef = audioQueue.current[0]
                    localCrossfadeRef = audioQueue.current[1]
                }
            } else {
                await setAudioSourceAndLoad(localAudioRef, 0, currentTrack)
            }

            if (localAudioRef.readyState >= HTMLMediaElement.HAVE_METADATA) {
                // We can't call play directly here cuz we changed the crossfade.current above so all event listeners are on the other audio element
                setTimeout(async () => {
                    if (userInteracted) {
                        await localAudioRef.play()

                        if (isPreloadActive && !isCrossfadeActive) {
                            localCrossfadeRef.pause()
                        }
                    }
                })
            } else {
                await new Promise<void>((resolve, reject) => {
                    const onLoadedMetadata = async () => {
                        localAudioRef.removeEventListener('loadedmetadata', onLoadedMetadata)
                        signal.removeEventListener('abort', onAbort)

                        try {
                            if (userInteracted) {
                                await localAudioRef.play()

                                if (isPreloadActive && !isCrossfadeActive) {
                                    localCrossfadeRef.pause()
                                }
                            }
                        } catch (e) {
                            reject(e)
                        }

                        resolve()
                    }
                    const onAbort = () => {
                        localAudioRef.removeEventListener('loadedmetadata', onLoadedMetadata)
                        resolve()
                    }
                    signal.addEventListener('abort', onAbort)
                    localAudioRef.addEventListener('loadedmetadata', onLoadedMetadata)
                })
            }

            setSessionPlayCount(prev => {
                const newCount = prev + 1
                return newCount
            })

            updateMediaSessionMetadata(currentTrack)

            // Report playback start to Jellyfin
            api.reportPlaybackStart(currentTrack.Id, signal)
        } catch (error) {
            console.error('Error playing track:', error)
        }
    }, [
        api,
        audioRef,
        crossfadeRef,
        currentTrack,
        isCrossfadeActive,
        isPlaying,
        isPreloadActive,
        reportTrackStopped,
        setAudioSourceAndLoad,
        shiftAudioQueue,
        shiftHlsQueue,
        updateMediaSessionMetadata,
        userInteracted,
    ])

    const togglePlayPause = useCallback(async () => {
        setUserInteracted(true)

        if (currentTrack) {
            if (isPlaying) {
                lastUserPauseRef.current = Date.now()

                audioRef.pause()
                crossfadeRef.pause()

                // If progress fails to report, we can still continue playback
                api.reportPlaybackProgress(currentTrack.Id, audioRef.currentTime, true)
            } else {
                if (needsReloadRef.current || (!audioRef.src && !hlsQueue.current[0] && currentTrack)) {
                    const restoreTime = needsReloadRef.current ? audioRef.currentTime : 0
                    needsReloadRef.current = false

                    await setAudioSourceAndLoad(audioRef, 0, currentTrack)

                    if (restoreTime) {
                        audioRef.currentTime = restoreTime
                    }
                }

                try {
                    await audioRef.play()
                    api.reportPlaybackProgress(currentTrack.Id, audioRef.currentTime, false)
                    updateMediaSessionMetadata(currentTrack)
                } catch (error) {
                    console.error('Error resuming playback:', error)
                    audioRef.pause()
                }
            }
        }
    }, [api, audioRef, crossfadeRef, currentTrack, isPlaying, setAudioSourceAndLoad, updateMediaSessionMetadata])

    const protectedPlay = useCallback(async () => {
        const timeSinceLastPause = Date.now() - lastUserPauseRef.current

        if (timeSinceLastPause < 2000) {
            console.info('Ignoring automatic play request - user recently paused')
            return
        }

        await togglePlayPause()
    }, [togglePlayPause])

    useEffect(() => {
        if (currentTrackIndex.index >= 0 && currentTrackIndex.index < items.length && items[currentTrackIndex.index]) {
            playTrack()
        } else {
            audioRef.pause()
        }
    }, [currentTrack?.Id]) // eslint-disable-line react-hooks/exhaustive-deps

    const getNextTrack = useCallback(() => {
        if (!items || items.length === 0 || currentTrackIndex.index === -1) {
            return undefined
        }

        return items[currentTrackIndex.index + 1]
    }, [currentTrackIndex.index, items])

    const hasNextTrack = useCallback(() => {
        return !!getNextTrack()
    }, [getNextTrack])

    const nextTrack = useCallback(async () => {
        setUserInteracted(true)

        if (!items || items.length === 0 || currentTrackIndex.index === -1 || !currentTrack) {
            audioRef.pause()
            return
        }

        if (repeat === 'one') {
            playTrack()
        } else {
            const nextIndex = currentTrackIndex.index + 1
            if (nextIndex >= items.length) {
                if (await loadMore()) {
                    setCurrentTrackIndex({ index: nextIndex })
                } else {
                    if (repeat === 'all') {
                        setCurrentTrackIndex({ index: 0 })
                    } else {
                        audioRef.pause()
                        return
                    }
                }
            } else {
                setCurrentTrackIndex({ index: nextIndex })
            }
        }
    }, [audioRef, currentTrack, currentTrackIndex.index, items, loadMore, playTrack, repeat])

    const previousTrack = useCallback(async () => {
        setUserInteracted(true)

        if (!items || items.length === 0 || currentTrackIndex.index === -1 || !currentTrack) {
            audioRef.pause()
            return
        }

        if (repeat === 'one') {
            playTrack()
        } else {
            const prevIndex = currentTrackIndex.index - 1
            if (prevIndex < 0) {
                if (repeat === 'all') {
                    setCurrentTrackIndex({ index: items.length - 1 })
                } else {
                    audioRef.pause()
                    return
                }
            } else {
                setCurrentTrackIndex({ index: prevIndex })
            }
        }
    }, [audioRef, currentTrack, currentTrackIndex.index, items, playTrack, repeat])

    const nextTrackCrossfade = useCallback(async () => {
        if (hasNextTrack()) {
            shiftAudioQueue()
            shiftHlsQueue()
            await nextTrack()
        }
    }, [hasNextTrack, nextTrack, shiftAudioQueue, shiftHlsQueue])

    const nextTrackPreload = useCallback(async () => {
        const nextTrack = getNextTrack()

        if (nextTrack) {
            setAudioSourceAndLoad(crossfadeRef, 1, nextTrack)
            isPreloaded.current = true
            preloadedTrackId.current = nextTrack.Id
        }
    }, [crossfadeRef, getNextTrack, setAudioSourceAndLoad])

    useEffect(() => {
        const onTimeUpdate = () => {
            if (
                isCrossfadeActive &&
                audioRef.duration - audioRef.currentTime < crossfadeDuration &&
                isPlaying &&
                repeat !== 'one'
            ) {
                nextTrackCrossfade()
                return
            }

            if (
                !isPreloaded.current &&
                isPreloadActive &&
                audioRef.duration - audioRef.currentTime <
                    (isCrossfadeActive ? crossfadeDuration : 0) + preloadDuration &&
                isPlaying &&
                repeat !== 'one'
            ) {
                nextTrackPreload()
                return
            }
        }

        audioRef.addEventListener('timeupdate', onTimeUpdate)

        return () => {
            audioRef.removeEventListener('timeupdate', onTimeUpdate)
        }
    }, [
        audioRef,
        crossfadeDuration,
        isCrossfadeActive,
        isPlaying,
        nextTrackCrossfade,
        nextTrackPreload,
        repeat,
        isPreloadActive,
        preloadDuration,
    ])

    // Re-preload if the next track changed
    useEffect(() => {
        const nextTrack = getNextTrack()

        // If we have a preloaded track but it's not the current next track, invalidate and re-preload
        if (isPreloaded.current && preloadedTrackId.current && nextTrack?.Id !== preloadedTrackId.current) {
            isPreloaded.current = false
            preloadedTrackId.current = undefined

            // If we're currently playing and conditions are met, preload the new next track
            if (isPlaying && isPreloadActive && nextTrack && repeat !== 'one') {
                nextTrackPreload()
            }
        }
    }, [getNextTrack, isPlaying, isPreloadActive, nextTrackPreload, repeat])

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
    }, [currentTrack, isManualShuffle, queryClient, reviver.queryKey, shuffle])

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
        audioRef.volume = volume
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Attach play/pause event listeners
    useEffect(() => {
        setIsPlaying(!audioRef.paused)

        const handlePlay = () => {
            setIsPlaying(true)
        }

        const handlePause = () => {
            setIsPlaying(false)
        }

        audioRef.addEventListener('play', handlePlay)
        audioRef.addEventListener('pause', handlePause)

        return () => {
            audioRef.removeEventListener('play', handlePlay)
            audioRef.removeEventListener('pause', handlePause)
        }
    }, [audioRef])

    // Attach error event listeners
    useEffect(() => {
        const handleError = (e: Event) => {
            console.error('Audio error during playback:', e)
            needsReloadRef.current = true
            audioRef.pause()
        }

        audioRef.addEventListener('error', handleError)

        return () => {
            audioRef.removeEventListener('error', handleError)
        }
    }, [audioRef])

    useEffect(() => {
        const handleDeviceChange = () => {
            if (!isPlaying && lastUserPauseRef.current > 0) {
                lastUserPauseRef.current = Date.now()
            }
        }

        if ('mediaDevices' in navigator) {
            navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

            return () => {
                navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
            }
        }
    }, [isPlaying])

    // Set up Media Session API for next/previous actions
    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('nexttrack', nextTrack)
            navigator.mediaSession.setActionHandler('previoustrack', previousTrack)
            navigator.mediaSession.setActionHandler('play', protectedPlay)
            navigator.mediaSession.setActionHandler('pause', togglePlayPause)
            navigator.mediaSession.setActionHandler('seekto', handleSeekTo)

            return () => {
                navigator.mediaSession.setActionHandler('nexttrack', null)
                navigator.mediaSession.setActionHandler('previoustrack', null)
                navigator.mediaSession.setActionHandler('play', null)
                navigator.mediaSession.setActionHandler('pause', null)
                navigator.mediaSession.setActionHandler('seekto', null)
            }
        }
    }, [nextTrack, previousTrack, protectedPlay, togglePlayPause, handleSeekTo])

    useEffect(() => {
        localStorage.setItem('volume', volume.toString())
        audioRef.volume = volume
    }, [audioRef, volume])

    useEffect(() => {
        localStorage.setItem('repeatMode', repeat)
    }, [repeat])

    useEffect(() => {
        localStorage.setItem('currentTrackIndex', currentTrackIndex.index.toString())
    }, [currentTrackIndex])

    useEffect(() => {
        if (hasRestored.current) return
        hasRestored.current = true

        const restoreAudio = async () => {
            const savedIndex = localStorage.getItem('currentTrackIndex')
            if (api.auth.token) {
                const indexInPlaylist = Number(savedIndex)
                if (indexInPlaylist !== -1) {
                    setCurrentTrackIndex({ index: currentTrackIndex.index })
                } else if (savedIndex) {
                    setCurrentTrackIndex({ index: Number(savedIndex) })
                } else {
                    setCurrentTrackIndex({ index: -1 })
                }

                const lastPlayedTrack = items[currentTrackIndex.index]

                if (lastPlayedTrack) {
                    await setAudioSourceAndLoad(audioRef, 0, lastPlayedTrack)
                    updateMediaSessionMetadata(lastPlayedTrack)
                }
            } else if (!api.auth.token) {
                setCurrentTrackIndex({ index: -1 })
            }
        }

        restoreAudio()
    }, [api.auth.token, audioRef, currentTrackIndex.index, items, setAudioSourceAndLoad, updateMediaSessionMetadata])

    // Preload next page when near end
    useEffect(() => {
        const threshold = 5

        if (hasNextPage && currentTrackIndex.index >= items.length - threshold) {
            loadMore()
        }
    }, [currentTrackIndex.index, hasNextPage, items.length, loadMore])

    useEffect(() => {
        const handleEnded = async () => {
            if (!currentTrack || currentTrackIndex.index === -1 || !items || items.length === 0) {
                if (currentTrack) {
                    reportTrackStopped(currentTrack, audioRef.currentTime)
                }

                return
            }

            reportTrackStopped(currentTrack, audioRef.currentTime)

            if (repeat === 'one') {
                playTrack()
            } else {
                nextTrack()
            }
        }

        audioRef.addEventListener('ended', handleEnded)

        return () => {
            audioRef.removeEventListener('ended', handleEnded)
        }
    }, [
        api,
        audioRef,
        currentTrack,
        currentTrackIndex.index,
        items,
        nextTrack,
        playTrack,
        repeat,
        reportTrackStopped,
        shiftAudioQueue,
    ])

    useEffect(() => {
        if (clearOnLogout && currentTrack) {
            reportTrackStopped(currentTrack, audioRef.currentTime)
            setCurrentTrackIndex({ index: -1 })
            audioRef.pause()
        }
    }, [api, audioRef, clearOnLogout, currentTrack, reportTrackStopped])

    return {
        currentTrack,
        currentTrackIndex: currentTrackIndex.index,
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
            setCurrentTrackIndex({ index })
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
        audioRef,
        crossfadeRef,
        bitrate,
        setBitrate,
        isLoading,
        isCrossfadeActive,
        setIsCrossfadeActive,
        crossfadeDuration,
        setCrossfadeDuration,
        isPreloadActive,
        setIsPreloadActive,
        preloadDuration,
        setPreloadDuration,
        rememberFilters,
        setRememberFilters,
        warnBeforeOverwriteQueue,
        setWarnBeforeOverwriteQueue,
        checkForUpdates,
        setCheckForUpdates,
        maxWidth,
        setMaxWidth,
        markAsManuallyAdded,
    }
}
