import { InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query'
import Hls, { FragmentLoaderContext, HlsConfig, LoaderCallbacks, LoaderConfiguration } from 'hls.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MediaItem } from '../api/jellyfin'
import { useAudioStorageContext } from '../context/AudioStorageContext/AudioStorageContext'
import { useJellyfinContext } from '../context/JellyfinContext/JellyfinContext'
import { IJellyfinInfiniteProps, useJellyfinInfiniteData } from '../hooks/Jellyfin/Infinite/useJellyfinInfiniteData'

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
    // Whether the lyrics display is enabled
    const [lyricsOpen, setLyricsOpen] = useState(false)
    const [lyricsExpanded, setLyricsExpanded] = useState(false)
    const [currentTrackIndex, setCurrentTrackIndex] = useState({
        index: localStorage.getItem('currentTrackIndex') ? Number(localStorage.getItem('currentTrackIndex')) : -1,
    })
    const [isPlaying, setIsPlaying] = useState(false)

    const [volume, setVolume] = useState(() => {
        const savedVolume = localStorage.getItem('volume')
        return savedVolume ? parseFloat(savedVolume) : initialVolume
    })

    const [shuffle, setShuffle] = useState(false)
    const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>(() => {
        const savedRepeat = localStorage.getItem('repeatMode')
        return savedRepeat === 'all' || savedRepeat === 'one' ? savedRepeat : 'off'
    })
    const audioRef = useRef<HTMLAudioElement>(new Audio())
    const hlsRef = useRef<Hls | null>(null)
    const shuffledPlaylist = useRef<number[]>([])
    const [currentShuffledIndex, setCurrentShuffledIndex] = useState({ index: -1 })
    const playedIndices = useRef<Set<number>>(new Set())
    const hasRestored = useRef(false)
    const queryClient = useQueryClient()

    const [playlistTitle, setPlaylistTitle] = useState(localStorage.getItem('playlistTitle') || '')
    const [reviver, setReviver] = useState<IReviver>(JSON.parse(localStorage.getItem('reviver') || '{}') || {})

    const [bitrate, setBitrate] = useState(Number(localStorage.getItem('bitrate')))
    const needsReloadRef = useRef(false)

    const audioStorage = useAudioStorageContext()

    useEffect(() => {
        localStorage.setItem('bitrate', bitrate.toString())
    }, [bitrate])

    const reviverFn = useMemo(() => {
        const queryFn = reviver.queryFn?.fn || ''
        const params = reviver.queryFn?.params || []

        const pageParamIndex = params.findIndex(param => param === ___PAGE_PARAM_INDEX___)
        const itemsPerPage = params[pageParamIndex + 1]

        return {
            queryKey: ['reviver', ...(reviver.queryKey || [])],
            queryFn: async ({ pageParam = 0 }) => {
                const startIndex = (pageParam as number) * (itemsPerPage as number)

                params[pageParamIndex] = startIndex

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (await (api as any)[queryFn]?.(...params)) || []
            },
            queryFnReviver: undefined,
            // NOTE; The reviverPageIndex is probably wrong but its not really an issue for now
            initialPageParam: Number(localStorage.getItem('reviverPageIndex')) || 0,
        } satisfies IJellyfinInfiniteProps
    }, [api, reviver.queryFn, reviver.queryKey])

    const { items, hasNextPage, loadMore, isLoading } = useJellyfinInfiniteData(reviverFn)

    const setCurrentPlaylist = useCallback(
        (props: { playlist: MediaItem[]; title: string; reviver?: IReviver }) => {
            if (shuffle) {
                setShuffle(false)
            }

            localStorage.setItem('reviver', JSON.stringify(props.reviver || {}))

            queryClient.setQueryData(['reviver', ...(props.reviver?.queryKey || [])], {
                pageParams: [1],
                pages: [props.playlist],
            } satisfies InfiniteData<MediaItem[], unknown>)

            setReviver(props.reviver || ({} as IReviver))

            localStorage.setItem('playlistTitle', props.title)
            setPlaylistTitle(props.title)
        },
        [queryClient, shuffle]
    )

    const abortControllerRef = useRef<AbortController | null>(null)

    const [userInteracted, setUserInteracted] = useState(false)

    const currentTrack = useMemo(() => {
        return (
            items[shuffle ? shuffledPlaylist.current.indexOf(currentShuffledIndex.index) : currentTrackIndex.index] ||
            null
        )
    }, [currentShuffledIndex.index, currentTrackIndex.index, items, shuffle])

    const { data: currentTrackLyrics, isLoading: currentTrackLyricsLoading } = useQuery({
        queryKey: useMemo(() => [`lyrics-${currentTrack?.Id || null}`], [currentTrack]),
        queryFn: async () => {
            const id = currentTrack?.Id

            if (id) {
                try {
                    return await api.getTrackLyrics(id)
                } catch {
                    // On error we just assume there are no lyrics
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
    }, [api, currentTrack, isPlaying])

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
        [audioStorage]
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
        [api, audioStorage, bitrate, handleHls]
    )

    const generateShuffledPlaylist = useCallback((currentIdx: number, totalItems: number) => {
        const newShuffledPlaylist = [...Array(totalItems).keys()]
            .filter(i => i !== currentIdx)
            .sort(() => Math.random() - 0.5)

        if (currentIdx !== -1) {
            newShuffledPlaylist.unshift(currentIdx)
        }

        return newShuffledPlaylist
    }, [])

    const playTrack = useCallback(
        async (index: number) => {
            const track = items[index]

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

                    playedIndices.current.add(index)
                    updateMediaSessionMetadata(track)

                    // Report playback start to Jellyfin
                    api.reportPlaybackStart(track.Id, signal)
                } catch (error) {
                    console.error('Error playing track:', error)
                }
            }
        },
        [setAudioSourceAndLoad, api, currentTrack, isPlaying, items, updateMediaSessionMetadata, userInteracted]
    )

    const togglePlayPause = useCallback(async () => {
        setUserInteracted(true)

        if (audioRef.current && currentTrack) {
            const audio = audioRef.current
            if (isPlaying) {
                audio.pause()

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
                    audioRef.current?.pause()
                }
            }
        }
    }, [setAudioSourceAndLoad, api, currentTrack, isPlaying, updateMediaSessionMetadata])

    useEffect(() => {
        if (currentTrackIndex.index >= 0 && currentTrackIndex.index < items.length && items[currentTrackIndex.index]) {
            playTrack(currentTrackIndex.index)
        } else {
            if (audioRef.current) {
                audioRef.current.pause()
            }
        }
    }, [currentTrackIndex]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (shuffle) {
            if (
                currentShuffledIndex.index >= 0 &&
                currentShuffledIndex.index < items.length &&
                items[currentShuffledIndex.index]
            ) {
                playTrack(shuffledPlaylist.current.indexOf(currentShuffledIndex.index))
            } else {
                if (audioRef.current) {
                    audioRef.current.pause()
                }
            }
        }
    }, [currentShuffledIndex]) // eslint-disable-line react-hooks/exhaustive-deps

    const nextTrack = useCallback(async () => {
        setUserInteracted(true)

        if (!items || items.length === 0 || currentTrackIndex.index === -1 || !currentTrack) {
            if (audioRef.current) {
                audioRef.current.pause()
            }

            return
        }

        if (repeat === 'one') {
            // If repeat is 'one', play the same track again, no need to change index
            setCurrentTrackIndex({ index: currentTrackIndex.index })
        } else if (shuffle) {
            const nextIndex = currentShuffledIndex.index + 1
            if (nextIndex >= shuffledPlaylist.current.length) {
                if (shuffledPlaylist.current.length) {
                    // todo; used to be loadMore but thats unrelated for this so ehh no idea what shud be here
                    setCurrentShuffledIndex({ index: nextIndex })
                    return
                } else if (repeat === 'all') {
                    playedIndices.current.clear()
                    shuffledPlaylist.current = generateShuffledPlaylist(currentTrackIndex.index, items.length)
                    setCurrentShuffledIndex({ index: 0 })
                } else {
                    if (audioRef.current) {
                        audioRef.current.pause()
                    }

                    return
                }
            } else {
                setCurrentShuffledIndex({ index: nextIndex })
            }
        } else {
            const nextIndex = currentTrackIndex.index + 1
            if (nextIndex >= items.length) {
                if (await loadMore()) {
                    setCurrentTrackIndex({ index: nextIndex })
                } else {
                    if (repeat === 'all') {
                        setCurrentTrackIndex({ index: 0 })
                    } else {
                        if (audioRef.current) {
                            audioRef.current.pause()
                        }

                        return
                    }
                }
            } else {
                setCurrentTrackIndex({ index: nextIndex })
            }
        }
    }, [
        generateShuffledPlaylist,
        currentShuffledIndex.index,
        currentTrack,
        currentTrackIndex.index,
        items,
        loadMore,
        repeat,
        shuffle,
    ])

    const previousTrack = useCallback(async () => {
        setUserInteracted(true)

        if (!items || items.length === 0 || currentTrackIndex.index === -1 || !currentTrack) {
            if (audioRef.current) {
                audioRef.current.pause()
            }

            return
        }

        if (repeat === 'one') {
            // If repeat is 'one', play the same track again, no need to change index
        } else if (shuffle) {
            const prevIndex = currentShuffledIndex.index - 1
            if (prevIndex < 0) {
                if (repeat === 'all') {
                    playedIndices.current.clear()
                    shuffledPlaylist.current = generateShuffledPlaylist(currentTrackIndex.index, items.length)
                    setCurrentShuffledIndex({ index: shuffledPlaylist.current.length - 1 })
                } else {
                    if (audioRef.current) {
                        audioRef.current.pause()
                    }

                    return
                }
            } else {
                setCurrentShuffledIndex({ index: prevIndex })
            }
        } else {
            const prevIndex = currentTrackIndex.index - 1
            if (prevIndex < 0) {
                if (repeat === 'all') {
                    setCurrentTrackIndex({ index: items.length - 1 })
                } else {
                    if (audioRef.current) {
                        audioRef.current.pause()
                    }

                    return
                }
            } else {
                setCurrentTrackIndex({ index: prevIndex })
            }
        }
    }, [
        generateShuffledPlaylist,
        currentShuffledIndex.index,
        currentTrack,
        currentTrackIndex.index,
        items,
        repeat,
        shuffle,
    ])

    const toggleLyrics = () => {
        setLyricsOpen(prev => {
            const newLyricsOpen = !prev
            if (!newLyricsOpen) setLyricsExpanded(false)
            return newLyricsOpen
        })
    }

    const toggleExpandLyrics = () => {
        setLyricsExpanded(prev => {
            if (!lyricsOpen) return false

            const newLyricsExpanded = !prev
            return newLyricsExpanded
        })
    }

    const toggleShuffle = useCallback(() => {
        setShuffle(prevShuffleState => {
            const newShuffle = !prevShuffleState
            if (newShuffle) {
                playedIndices.current.clear()
                shuffledPlaylist.current = generateShuffledPlaylist(currentTrackIndex.index, items.length)
                setCurrentShuffledIndex({ index: 0 })

                if (currentTrack && currentTrackIndex.index !== -1) {
                    setCurrentTrackIndex({ index: currentTrackIndex.index })
                }
            } else {
                shuffledPlaylist.current = []
                setCurrentShuffledIndex({ index: -1 })
                playedIndices.current.clear()
            }
            return newShuffle
        })
    }, [generateShuffledPlaylist, currentTrack, currentTrackIndex.index, items.length])

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
    }, [])

    // Attach error event listeners
    useEffect(() => {
        const audio = audioRef.current

        const handleError = (e: Event) => {
            console.error('Audio error during playback:', e)
            needsReloadRef.current = true
            audioRef.current?.pause()
        }

        audio.addEventListener('error', handleError)

        return () => {
            audio.removeEventListener('error', handleError)
        }
    }, [])

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
        localStorage.setItem('volume', volume.toString())
        if (audioRef.current) {
            audioRef.current.volume = volume
        }
    }, [volume])

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
                    if (audioRef.current) {
                        await setAudioSourceAndLoad(lastPlayedTrack)
                    }
                    updateMediaSessionMetadata(lastPlayedTrack)
                }
            } else if (!api.auth.token) {
                setCurrentTrackIndex({ index: -1 })
            }
        }

        restoreAudio()
    }, [setAudioSourceAndLoad, api.auth.token, currentTrackIndex.index, items, updateMediaSessionMetadata])

    // Preload next page when near end
    useEffect(() => {
        const threshold = 5
        const index = shuffle ? currentShuffledIndex.index : currentTrackIndex.index
        const length = shuffle ? shuffledPlaylist.current.length : items.length

        if (hasNextPage && index >= length - threshold) {
            loadMore()
        }
    }, [currentShuffledIndex.index, currentTrackIndex.index, hasNextPage, items.length, loadMore, shuffle])

    useEffect(() => {
        if (!audioRef.current) return

        const audio = audioRef.current
        const handleEnded = async () => {
            if (!currentTrack || currentTrackIndex.index === -1 || !items || items.length === 0) {
                if (currentTrack) {
                    api.reportPlaybackStopped(currentTrack.Id, audio.currentTime)
                }

                return
            }

            api.reportPlaybackStopped(currentTrack.Id, audio.currentTime)

            if (repeat === 'one') {
                setCurrentTrackIndex({ index: currentTrackIndex.index })
            } else {
                nextTrack()
            }
        }

        audio.addEventListener('ended', handleEnded)

        return () => {
            audio.removeEventListener('ended', handleEnded)
        }
    }, [api, currentTrack, currentTrackIndex.index, items, nextTrack, repeat])

    useEffect(() => {
        if (clearOnLogout && currentTrack) {
            api.reportPlaybackStopped(currentTrack.Id, audioRef.current.currentTime)
            setCurrentTrackIndex({ index: -1 })

            if (audioRef.current) {
                audioRef.current.pause()
            }
        }
    }, [api, clearOnLogout, currentTrack])

    return {
        currentTrack,
        currentTrackIndex: shuffle
            ? shuffledPlaylist.current.indexOf(currentShuffledIndex.index)
            : currentTrackIndex.index,
        currentTrackLyricsLoading,
        currentTrackLyrics,
        lyricsOpen,
        lyricsExpanded,
        isPlaying,
        togglePlayPause,
        formatTime,
        volume,
        setVolume,
        playTrack: (index: number) => {
            setUserInteracted(true)
            setCurrentTrackIndex({ index })
        },
        nextTrack,
        previousTrack,
        shuffle,
        toggleLyrics,
        toggleExpandLyrics,
        toggleShuffle,
        repeat,
        toggleRepeat,
        currentPlaylist: items,
        setCurrentPlaylist,
        loadMore,
        sessionPlayCount,
        resetSessionCount,
        playlistTitle,
        audioRef,
        bitrate,
        setBitrate,
        isLoading,
    }
}
