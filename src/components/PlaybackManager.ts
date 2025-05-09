import { ItemSortBy, SortOrder } from '@jellyfin/sdk/lib/generated-client'
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MediaItem } from '../api/jellyfin'
import { useJellyfinContext } from '../context/JellyfinContext/JellyfinContext'

export interface PlaybackManagerProps {
    initialVolume: number
    clearOnLogout?: boolean
}

// Broken name to prevent confusion with the context
export const usePlaybackManager = ({ initialVolume, clearOnLogout }: PlaybackManagerProps) => {
    const api = useJellyfinContext()
    // Session based play count for settings page
    const [sessionPlayCount, setSessionPlayCount] = useState(() => {
        const saved = localStorage.getItem('sessionPlayCount')
        return saved ? Number(saved) : 0
    })
    const [currentTrackIndex, setCurrentTrackIndex] = useState({
        index: localStorage.getItem('currentTrackIndex') ? Number(localStorage.getItem('currentTrackIndex')) : -1,
    })
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [buffered, setBuffered] = useState(0)
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
    const shuffledPlaylist = useRef<number[]>([])
    const [currentShuffledIndex, setCurrentShuffledIndex] = useState({ index: -1 })
    const playedIndices = useRef<Set<number>>(new Set())
    const hasRestored = useRef(false)
    const [hasMore, setHasMore] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)

    const currentPlaylist = useRef<MediaItem[]>(JSON.parse(localStorage.getItem('currentPlaylist') || '[]'))
    const currentPlaylistType = useRef<string | undefined>(localStorage.getItem('currentPlaylistType') || undefined)

    const setCurrentPlaylist = useCallback(
        ({
            type,
            playlist,
            hasMore,
            loadMore,
            loading,
        }: {
            type?: string
            playlist: MediaItem[]
            hasMore?: boolean
            loadMore?: () => Promise<MediaItem[] | undefined>
            loading?: boolean
        }) => {
            if (shuffle) {
                setShuffle(false)
            }

            currentPlaylistType.current = type || '__undefined__' // Undefined is assumed to be a fresh load, so we set it to a string
            localStorage.setItem('currentPlaylistType', type || '')

            currentPlaylist.current = playlist
            localStorage.setItem('currentPlaylist', JSON.stringify(currentPlaylist.current || []))

            if (type) {
                loadMoreCallback.current = loadMore
                setHasMore(hasMore || false)
                setLoading(loading || false)
            }
        },
        [shuffle]
    )

    const loadMoreCallback = useRef<() => Promise<MediaItem[] | undefined>>(undefined)
    const abortControllerRef = useRef<AbortController | null>(null)

    const [userInteracted, setUserInteracted] = useState(false)

    const [sortBy, setSortBy] = useState<ItemSortBy>(ItemSortBy.DateCreated)
    const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.Descending)

    const currentTrack = useMemo(() => {
        return (
            currentPlaylist.current[
                shuffle ? shuffledPlaylist.current.indexOf(currentShuffledIndex.index) : currentTrackIndex.index
            ] || null
        )
    }, [currentTrackIndex, currentShuffledIndex, shuffle])

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

    const reportPlaybackStartWrapper = useCallback(
        async (track: MediaItem, signal: AbortSignal) => {
            try {
                await api.reportPlaybackStart(track.Id, signal)
            } catch (error) {
                console.error('Error reporting playback start:', error)
            }
        },
        [api]
    )

    const reportPlaybackProgressWrapper = useCallback(
        async (track: MediaItem, position: number, isPaused: boolean) => {
            try {
                await api.reportPlaybackProgress(track.Id, position, isPaused)
            } catch (error) {
                console.error('Error reporting playback progress:', error)
            }
        },
        [api]
    )

    const reportPlaybackStoppedWrapper = useCallback(
        async (track: MediaItem, position: number, signal?: AbortSignal) => {
            try {
                await api.reportPlaybackStopped(track.Id, position, signal)
            } catch (error) {
                console.error('Error reporting playback stopped:', error)
            }
        },
        [api]
    )

    useEffect(() => {
        if (!isPlaying || !currentTrack) return

        const interval = setInterval(() => {
            reportPlaybackProgressWrapper(currentTrack, audioRef.current.currentTime, false)
        }, 10000)

        return () => clearInterval(interval)
    }, [isPlaying, currentTrack, reportPlaybackProgressWrapper])

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

    const playTrack = useCallback(
        async (index: number) => {
            if (!userInteracted) {
                return
            }

            const track = currentPlaylist.current[index]

            if (!track) {
                return
            }

            abortControllerRef.current?.abort('abort')
            abortControllerRef.current = new AbortController()
            const signal = abortControllerRef.current.signal

            if (audioRef.current) {
                const audio = audioRef.current
                if (currentTrack && isPlaying) {
                    await reportPlaybackStoppedWrapper(currentTrack, audio.currentTime, signal)
                }
                audio.pause()
                audio.currentTime = 0

                try {
                    const streamUrl = api.getStreamUrl(track.Id)
                    audio.src = streamUrl
                    audio.load()

                    await new Promise<void>((resolve, reject) => {
                        const onLoadedMetadata = async () => {
                            audio.removeEventListener('loadedmetadata', onLoadedMetadata)
                            signal.removeEventListener('abort', onAbort)

                            try {
                                await audio.play()
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
                    await reportPlaybackStartWrapper(track, signal)
                } catch (error) {
                    console.error('Error playing track:', error)
                }
            }
        },
        [
            userInteracted,
            currentTrack,
            isPlaying,
            reportPlaybackStoppedWrapper,
            api,
            updateMediaSessionMetadata,
            reportPlaybackStartWrapper,
        ]
    )

    const togglePlayPause = useCallback(() => {
        setUserInteracted(true)

        if (audioRef.current && currentTrack) {
            const audio = audioRef.current
            if (isPlaying) {
                audio.pause()
                reportPlaybackProgressWrapper(currentTrack, audio.currentTime, true)
            } else {
                if (!audio.src) {
                    const streamUrl = api.getStreamUrl(currentTrack.Id)
                    audio.src = streamUrl
                    audio.load()
                }
                audio
                    .play()
                    .then(() => {
                        reportPlaybackProgressWrapper(currentTrack, audio.currentTime, false)
                    })
                    .catch(error => {
                        console.error('Error resuming playback:', error)
                        setCurrentTrackIndex({ index: -1 })
                        setProgress(0)
                        setDuration(0)
                        setBuffered(0)
                    })
            }
        }
    }, [api, currentTrack, isPlaying, reportPlaybackProgressWrapper])

    useEffect(() => {
        if (
            currentTrackIndex.index >= 0 &&
            currentTrackIndex.index < currentPlaylist.current.length &&
            currentPlaylist.current[currentTrackIndex.index]
        ) {
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
                currentShuffledIndex.index < currentPlaylist.current.length &&
                currentPlaylist.current[currentShuffledIndex.index]
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

        if (
            !currentPlaylist.current ||
            currentPlaylist.current.length === 0 ||
            currentTrackIndex.index === -1 ||
            !currentTrack
        ) {
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
                if (hasMore && loadMoreCallback.current) {
                    setCurrentShuffledIndex({ index: nextIndex })
                    return
                } else if (repeat === 'all') {
                    playedIndices.current.clear()
                    shuffledPlaylist.current = [...Array(currentPlaylist.current.length).keys()]
                        .filter(i => i !== currentTrackIndex.index)
                        .sort(() => Math.random() - 0.5)
                    if (currentTrackIndex.index !== -1) {
                        shuffledPlaylist.current.unshift(currentTrackIndex.index)
                    }

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
            if (nextIndex >= currentPlaylist.current.length) {
                if (hasMore && loadMoreCallback.current) {
                    const newPlaylist = await loadMoreCallback.current()
                    setCurrentTrackIndex({ index: nextIndex })
                    setCurrentPlaylist({ playlist: newPlaylist || [] })
                    return
                } else if (repeat === 'all') {
                    setCurrentTrackIndex({ index: 0 })
                } else {
                    if (audioRef.current) {
                        audioRef.current.pause()
                    }

                    return
                }
            } else {
                setCurrentTrackIndex({ index: nextIndex })
            }
        }
    }, [
        currentTrackIndex.index,
        currentTrack,
        repeat,
        shuffle,
        currentShuffledIndex.index,
        hasMore,
        setCurrentPlaylist,
    ])

    const previousTrack = useCallback(async () => {
        setUserInteracted(true)

        if (
            !currentPlaylist.current ||
            currentPlaylist.current.length === 0 ||
            currentTrackIndex.index === -1 ||
            !currentTrack
        ) {
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
                    shuffledPlaylist.current = [...Array(currentPlaylist.current.length).keys()]
                        .filter(i => i !== currentTrackIndex.index)
                        .sort(() => Math.random() - 0.5)
                    if (currentTrackIndex.index !== -1) {
                        shuffledPlaylist.current.unshift(currentTrackIndex.index)
                    }

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
                    setCurrentTrackIndex({ index: currentPlaylist.current.length - 1 })
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
    }, [currentShuffledIndex.index, currentTrack, currentTrackIndex.index, repeat, shuffle])

    const toggleShuffle = () => {
        setShuffle(prev => {
            const newShuffle = !prev
            if (newShuffle) {
                playedIndices.current.clear()
                shuffledPlaylist.current = [...Array(currentPlaylist.current.length).keys()]
                    .filter(i => i !== currentTrackIndex.index)
                    .sort(() => Math.random() - 0.5)
                if (currentTrackIndex.index !== -1) {
                    shuffledPlaylist.current.unshift(currentTrackIndex.index)
                }

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
    }

    const toggleRepeat = () => {
        setRepeat(prev => {
            const newRepeat = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'
            return newRepeat
        })
    }

    const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            const newTime = parseFloat(e.target.value)
            audioRef.current.currentTime = newTime
            setProgress(newTime)
        }
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

    // Attach progress, metadata, and error event listeners
    useEffect(() => {
        const audio = audioRef.current
        const updateProgress = () => {
            setProgress(audio.currentTime)
            setDuration(audio.duration || 0)
            const bufferedEnd = audio.buffered.length > 0 ? audio.buffered.end(audio.buffered.length - 1) : 0
            setBuffered(bufferedEnd)
        }

        const handleError = (e: Event) => {
            console.error('Audio error during playback:', e)
            setCurrentTrackIndex({ index: -1 })
            setProgress(0)
            setDuration(0)
            setBuffered(0)
        }

        audio.addEventListener('timeupdate', updateProgress)
        audio.addEventListener('loadedmetadata', updateProgress)
        audio.addEventListener('error', handleError)

        return () => {
            audio.pause()
            audio.removeEventListener('timeupdate', updateProgress)
            audio.removeEventListener('loadedmetadata', updateProgress)
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

            const lastPlayedTrack = currentPlaylist.current[currentTrackIndex.index]

            if (lastPlayedTrack) {
                if (audioRef.current) {
                    const streamUrl = api.getStreamUrl(lastPlayedTrack.Id)
                    audioRef.current.src = streamUrl
                    audioRef.current.load()
                }
                updateMediaSessionMetadata(lastPlayedTrack)
            }
        } else if (!api.auth.token) {
            setCurrentTrackIndex({ index: -1 })
        }
    }, [api.auth.token, api.auth.serverUrl, api.auth.userId, updateMediaSessionMetadata, currentTrackIndex.index, api])

    useEffect(() => {
        if (shuffle && hasMore && loadMoreCallback.current) {
            const threshold = 5
            if (currentShuffledIndex.index >= shuffledPlaylist.current.length - threshold) {
                loadMoreCallback.current()
            }
        }
    }, [currentShuffledIndex.index, shuffle, hasMore])

    useEffect(() => {
        if (!audioRef.current) return

        const audio = audioRef.current
        const handleEnded = () => {
            if (
                !currentTrack ||
                currentTrackIndex.index === -1 ||
                !currentPlaylist.current ||
                currentPlaylist.current.length === 0
            ) {
                if (currentTrack) {
                    reportPlaybackStoppedWrapper(currentTrack, audio.currentTime)
                }
                return
            }

            reportPlaybackStoppedWrapper(currentTrack, audio.currentTime)
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
    }, [currentTrack, repeat, reportPlaybackStoppedWrapper, currentTrackIndex.index, nextTrack])

    useEffect(() => {
        if (clearOnLogout && currentTrack) {
            reportPlaybackStoppedWrapper(currentTrack, audioRef.current.currentTime)
            setCurrentTrackIndex({ index: -1 })
            setProgress(0)
            setDuration(0)
            setBuffered(0)
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.src = ''
            }
        }
    }, [clearOnLogout, currentTrack, reportPlaybackStoppedWrapper])

    const updateSort = useCallback((sortOption: string) => {
        let newSortBy: ItemSortBy
        let newSortOrder: SortOrder = SortOrder.Ascending

        switch (sortOption) {
            case 'Added':
                newSortBy = ItemSortBy.DateCreated
                newSortOrder = SortOrder.Descending
                break
            case 'Released':
                newSortBy = ItemSortBy.PremiereDate
                break
            case 'Runtime':
                newSortBy = ItemSortBy.Runtime
                break
            case 'Random':
                newSortBy = ItemSortBy.Random
                break
            default:
                newSortBy = ItemSortBy.DateCreated
                newSortOrder = SortOrder.Descending
        }

        setSortBy(newSortBy)
        setSortOrder(newSortOrder)
    }, [])

    return {
        currentTrack,
        currentTrackIndex: shuffle
            ? shuffledPlaylist.current.indexOf(currentShuffledIndex.index)
            : currentTrackIndex.index,
        isPlaying,
        togglePlayPause,
        progress,
        duration,
        buffered,
        handleSeek,
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
        toggleShuffle,
        repeat,
        toggleRepeat,
        hasMore,
        loading,
        currentPlaylistQueryKey: currentPlaylistType.current,
        currentPlaylist: currentPlaylist.current,
        setCurrentPlaylist,
        loadMore: loadMoreCallback.current,
        sessionPlayCount,
        resetSessionCount,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        updateSort,
    }
}
