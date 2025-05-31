import { ArrowLeftIcon, BookmarkFillIcon, ChevronDownIcon, HeartFillIcon, NoteIcon } from '@primer/octicons-react'
import { JSX, memo, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useFilterContext } from '../context/FilterContext/FilterContext'
import { FilterContextProvider } from '../context/FilterContext/FilterContextProvider'
import { useHistoryContext } from '../context/HistoryContext/HistoryContext'
import { usePageTitle } from '../context/PageTitleContext/PageTitleContext'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { useSidenavContext } from '../context/SidenavContext/SidenavContext'
import { getPageTitle } from '../utils/titleUtils'
import { AlbumIcon, ArtistsIcon, PlaylistIcon, TracksIcon } from './SvgIcons'

export const Main = (props: Parameters<typeof MainContent>[0]) => {
    return (
        <FilterContextProvider key={(props.content as { name?: string })?.name}>
            <MainContent {...props} />
        </FilterContextProvider>
    )
}

export const MainContent = ({
    content: Content,
    filterType,
}: {
    content: () => JSX.Element
    filterType?: 'mediaItems' | 'favorites'
}) => {
    const playback = usePlaybackContext()
    const { pageTitle } = usePageTitle()
    const { goBack: previousPage } = useHistoryContext()
    const location = useLocation()
    const { toggleSidenav } = useSidenavContext()
    const { sort, setSort } = useFilterContext()

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' })
    }, [location.pathname])

    const memoHeader = useMemo(() => {
        return (
            <div className="main_header">
                <div className="primary">
                    <div onClick={previousPage} className="return_icon" title="Back">
                        <ArrowLeftIcon size={16}></ArrowLeftIcon>
                    </div>
                    <div className="container">
                        <div className="page_title">
                            <div className="text" title={getPageTitle(pageTitle, location)}>
                                {getPageTitle(pageTitle, location)}
                            </div>
                            {location.pathname.startsWith('/album/') && pageTitle && (
                                <div className="page-icon album" title="Album">
                                    <AlbumIcon width={16} height={16} />
                                </div>
                            )}
                            {pageTitle &&
                                (location.pathname.match(/^\/artist\/[^/]+\/tracks$/) ? (
                                    <div className="page-icon artist-tracks" title="Tracks">
                                        <TracksIcon width={12} height={12} />
                                    </div>
                                ) : location.pathname.startsWith('/artist/') ? (
                                    <div className="page-icon artist" title="Artist">
                                        <ArtistsIcon width={16} height={16} />
                                    </div>
                                ) : null)}
                            {location.pathname.startsWith('/genre/') && pageTitle && (
                                <div className="page-icon genre" title="Genre">
                                    <BookmarkFillIcon size={16} />
                                </div>
                            )}
                            {location.pathname.startsWith('/playlist/') && pageTitle && (
                                <div className="page-icon playlist" title="Playlist">
                                    <PlaylistIcon width={12} height={12} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="secondary">
                    {filterType === 'mediaItems' && (
                        <div className="filter">
                            <select onChange={e => setSort(e.target.value)} value={sort}>
                                <option value="Added">Added</option>
                                <option value="Released">Released</option>
                                <option value="Runtime">Runtime</option>
                                <option value="Random">Random</option>
                            </select>
                            <div className="icon">
                                <ChevronDownIcon size={12} />
                            </div>
                        </div>
                    )}

                    {filterType === 'favorites' && (
                        <div className="filter">
                            <select onChange={e => setSort(e.target.value)} value={sort}>
                                <option value="Tracks">Tracks</option>
                                <option value="Albums">Albums</option>
                                <option value="Artists">Artists</option>
                            </select>
                            <div className="icon">
                                <ChevronDownIcon size={12} />
                            </div>
                        </div>
                    )}

                    <div className="sidenav_toggle noSelect" onClick={toggleSidenav}>
                        <div className="bar"></div>
                        <div className="bar"></div>
                    </div>
                </div>
            </div>
        )
    }, [filterType, location, pageTitle, previousPage, setSort, sort, toggleSidenav])

    const memoContent = useMemo(() => {
        return (
            <div className="main_content">
                <Content />
            </div>
        )
    }, [Content])

    const memoFooter = useMemo(() => {
        return (
            <div className="main_footer">
                {playback.lyricsOpen && (
                    <div className={playback.lyricsExpanded ? 'container expanded lyrics' : 'container lyrics'}>
                        <div className="header" onClick={playback.toggleExpandLyrics}>
                            <ChevronDownIcon className="icon" size={12} />
                        </div>
                        <LyricsDisplay />
                    </div>
                )}
                <div
                    className={
                        playback.isPlaying ? 'playback playing' : playback.currentTrack ? 'playback paused' : 'playback'
                    }
                >
                    <Progressbar />

                    <div className="container">
                        <div className="track-info">
                            <div className="track-name">
                                <div className="text" title={playback.currentTrack?.Name || 'No Track Played'}>
                                    {playback.currentTrack?.Name ? (
                                        <Link to="/queue">{playback.currentTrack.Name}</Link>
                                    ) : (
                                        'No Track Played'
                                    )}
                                </div>
                                {playback.currentTrack?.UserData?.IsFavorite && (
                                    <span className="favorited" title="Favorited">
                                        <HeartFillIcon size={12}></HeartFillIcon>
                                    </span>
                                )}
                            </div>
                            <div
                                className="artist"
                                title={
                                    playback.currentTrack?.Artists?.join(', ') ||
                                    playback.currentTrack?.AlbumArtist ||
                                    'No Artist'
                                }
                            >
                                {playback.currentTrack &&
                                playback.currentTrack.ArtistItems &&
                                playback.currentTrack.ArtistItems.length > 0
                                    ? (() => {
                                          const artistItems = playback.currentTrack.ArtistItems
                                          return artistItems.map((artist, index) => (
                                              <span key={artist.Id}>
                                                  <Link to={`/artist/${artist.Id}`} className="text">
                                                      {artist.Name}
                                                  </Link>
                                                  {index < artistItems.length - 1 && ', '}
                                              </span>
                                          ))
                                      })()
                                    : playback.currentTrack?.Artists?.join(', ') ||
                                      playback.currentTrack?.AlbumArtist ||
                                      'No Artist'}
                            </div>
                            <div className="album">
                                {playback.currentTrack?.Album ? (
                                    <Link
                                        to={`/album/${playback.currentTrack.AlbumId}`}
                                        className="text"
                                        title={playback.currentTrack.Album}
                                    >
                                        {playback.currentTrack.Album}
                                    </Link>
                                ) : (
                                    <div className="text">No Album</div>
                                )}
                                <div className="album-icon" title="Album">
                                    <AlbumIcon width={12} height={12} />
                                </div>
                            </div>
                        </div>
                        <div className="controls">
                            <div className="knobs">
                                {
                                    <div
                                        className={`shuffle ${playback.lyricsOpen ? 'active' : ''}`}
                                        onClick={playback.toggleLyrics}
                                        title="Lyrics"
                                    >
                                        <NoteIcon
                                            fill={
                                                playback.lyricsOpen
                                                    ? 'var(--brand-color)'
                                                    : 'var(--font-color-secondary)'
                                            }
                                            size={16}
                                        />
                                    </div>
                                }
                                <div
                                    className={`shuffle ${playback.shuffle ? 'active' : ''}`}
                                    onClick={playback.toggleShuffle}
                                    title="Shuffle"
                                >
                                    <div className="shuffle-icon"></div>
                                </div>
                                <div className="primary">
                                    <div className="previous" onClick={playback.previousTrack} title="Previous">
                                        <div className="previous-icon"></div>
                                    </div>
                                    <div className="container">
                                        <div className="play" onClick={playback.togglePlayPause} title="Play">
                                            <div className="play-icon"></div>
                                        </div>
                                        <div className="pause" onClick={playback.togglePlayPause} title="Pause">
                                            <div className="pause-icon"></div>
                                        </div>
                                    </div>
                                    <div className="next" onClick={playback.nextTrack} title="Next">
                                        <div className="next-icon"></div>
                                    </div>
                                </div>
                                <div
                                    className={`repeat ${playback.repeat === 'off' ? '' : 'active'}`}
                                    onClick={playback.toggleRepeat}
                                    title="Repeat"
                                >
                                    <div className={`repeat-icon${playback.repeat === 'one' ? '-one' : ''}`}></div>
                                </div>
                            </div>

                            <Duration />
                        </div>
                    </div>
                </div>
            </div>
        )
    }, [
        playback.currentTrack,
        playback.isPlaying,
        playback.nextTrack,
        playback.previousTrack,
        playback.repeat,
        playback.shuffle,
        playback.togglePlayPause,
        playback.toggleRepeat,
        playback.toggleShuffle,
        playback.toggleLyrics,
        playback.toggleExpandLyrics,
        playback.lyricsOpen,
        playback.lyricsExpanded,
    ])

    return (
        <main className="main">
            {memoHeader}
            {memoContent}
            {memoFooter}
        </main>
    )
}

const LyricsDisplay = () => {
    const playback = usePlaybackContext()
    const audio = playback.audioRef.current as HTMLAudioElement | undefined

    const [currentTime, setCurrentTime] = useState<number | null>(null)

    function tickToTimeString(raw: number): string {
        const ms = raw / 10000

        const totalCs = Math.round(ms / 10)

        const cs = totalCs % 100
        const totalSeconds = Math.floor(totalCs / 100)
        const seconds = totalSeconds % 60
        const totalMinutes = Math.floor(totalSeconds / 60)
        const minutes = totalMinutes % 60
        const hours = Math.floor(totalMinutes / 60)

        const hh = hours.toString().padStart(2, '0')
        const mm = minutes.toString().padStart(2, '0')
        const ss = seconds.toString().padStart(2, '0')
        const cc = cs.toString().padStart(2, '0')

        return (hours > 0 ? `${hh}:` : '') + `${mm}:${ss}.${cc}`
    }

    const timeDiff = (startTicks: number | null, timeSecs: number | null) => {
        return (startTicks || 0) / 10000 - (timeSecs || 0) * 1000
    }

    const lyrics = playback.currentTrackLyrics?.Lyrics
    const currentLineIndex = useMemo(() => {
        if (!audio || !lyrics) return -1

        const index = lyrics.findIndex(line => timeDiff(line?.Start || 0, currentTime) > 0)

        return lyrics ? (index >= 0 ? index - 1 : lyrics.length - 1) : -1
    }, [audio, lyrics, currentTime])
    const nextLineStart = useMemo(() => {
        if (!audio || !lyrics) return -1

        if (lyrics && lyrics[currentLineIndex + 1]) return lyrics[currentLineIndex + 1]?.Start || 0
        return 0
    }, [audio, lyrics, currentLineIndex])

    // Uses timeout for precise lyrics timing
    //  - Necessary because audio time updates happen every 200ms or so; too slow
    const nextLineTimeout: RefObject<NodeJS.Timeout | null> = useRef(null)
    useEffect(() => {
        if (nextLineTimeout.current) {
            clearTimeout(nextLineTimeout.current)
            nextLineTimeout.current = null
        }
        const millis = timeDiff(nextLineStart, currentTime)
        if (millis > 0) {
            nextLineTimeout.current = setTimeout(() => {
                if (currentTime && playback.isPlaying) setCurrentTime(currentTime + millis / 1000)
                if (nextLineTimeout.current) {
                    clearTimeout(nextLineTimeout.current)
                    nextLineTimeout.current = null
                }
            }, millis)
        }
    }, [playback.isPlaying, currentTime, currentLineIndex, nextLineStart])

    useEffect(() => {
        if (!audio || !lyrics) return

        const handleTimeUpdate = () => {
            if (!audio.duration) {
                setCurrentTime(null)
                return
            }

            setCurrentTime(audio?.currentTime || 0)
        }

        const handlePlaying = () => {
            setCurrentTime(0)
        }

        audio.addEventListener('timeupdate', handleTimeUpdate)
        audio.addEventListener('playing', handlePlaying)

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate)
            audio.removeEventListener('playing', handlePlaying)
        }
    }, [audio, lyrics, currentLineIndex])

    const lineRefs = useRef<Array<HTMLDivElement | null>>([])
    const displayedLines = useMemo(() => {
        if (!lyrics) lineRefs.current = []
        return (
            lyrics?.map((line, index) => (
                <div
                    key={`lyrics-${playback.currentTrack.Id}-${index}`}
                    className={'lyrics-line' + (currentLineIndex === index ? ' active' : '')}
                    ref={el => {
                        lineRefs.current[index] = el
                    }}
                >
                    <div className="start">{line.Start && tickToTimeString(line.Start)}</div>
                    <div className="text">{line.Text}</div>
                </div>
            )) || null
        )
    }, [playback.currentTrack, lyrics, currentLineIndex])

    const lyricsContainer = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!lyrics) return
        const activeEl = lineRefs.current[currentLineIndex]
        if (lyricsContainer.current)
            lyricsContainer.current.scrollTo({
                top:
                    (activeEl?.offsetTop || 0) -
                    lyricsContainer.current.clientHeight / 2 +
                    (activeEl?.clientHeight || 0) / 2,
                behavior: 'smooth',
            })
    }, [playback.currentTrack, lyrics, currentLineIndex])

    return (
        <div
            className="scroll-container"
            ref={el => {
                lyricsContainer.current = el
            }}
        >
            <div className={'lyrics-display' + (lyrics ? ' active' : '')}>
                {(lyrics && displayedLines) || (playback.currentTrackLyricsLoading && <div>Loading...</div>) || (
                    <div style={{ textAlign: 'center' }}>No Lyrics</div>
                )}
            </div>
        </div>
    )
}

const Progressbar = () => {
    const playback = usePlaybackContext()
    const audio = playback.audioRef.current as HTMLAudioElement | undefined
    const progressRef = useRef<HTMLInputElement>(null)
    const bufferRef = useRef(false)

    const calcDuration = useCallback(() => {
        return audio?.duration || 0
    }, [audio])

    const calcProgress = useCallback(() => {
        if (!audio) return 0

        const d = calcDuration()
        const t = audio.currentTime || 0

        if (d > 0) {
            return (t / d) * 100
        }

        return 0
    }, [audio, calcDuration])

    const restoreProgress = useCallback(() => {
        if (bufferRef.current) {
            return
        }

        progressRef.current?.style.setProperty('--transition-duration', `0s`)
        progressRef.current?.style.setProperty('--progress-width', `${calcProgress()}%`)

        if (playback.isPlaying) {
            void progressRef.current?.offsetWidth // Trigger reflow

            progressRef.current?.style.setProperty(
                '--transition-duration',
                `${calcDuration() - (audio?.currentTime || 0)}s`
            )
            progressRef.current?.style.setProperty('--progress-width', `100%`)
        }
    }, [audio?.currentTime, calcDuration, calcProgress, playback.isPlaying])

    const calcBuffered = useCallback(() => {
        if (!audio) return 0

        if (audio.buffered.length > 0) {
            const end = audio.buffered.end(audio.buffered.length - 1)
            return (end / (audio.duration || 1)) * 100
        }

        return 0
    }, [audio])

    useEffect(() => {
        if (!audio) return

        progressRef.current?.style.setProperty('--progress-width', `${calcProgress()}%`)
        progressRef.current?.style.setProperty('--transition-duration', `${calcDuration()}s`)
    }, [audio, calcDuration, calcProgress])

    useEffect(() => {
        if (!audio) return

        if (playback.isPlaying) {
            restoreProgress()
        } else {
            progressRef.current?.style.setProperty('--progress-width', `${calcProgress()}%`)
            progressRef.current?.style.setProperty('--transition-duration', `0s`)
        }
    }, [audio, audio?.src, calcProgress, playback.isPlaying, restoreProgress])

    useEffect(() => {
        if (!audio) return

        const handleTimeUpdate = () => {
            if (!audio.duration) {
                return
            }

            restoreProgress()
        }

        const handleBuffered = () => {
            progressRef.current?.style.setProperty('--buffered-width', `${calcBuffered()}%`)
        }

        const handleEmptied = () => {
            progressRef.current?.style.setProperty('--buffered-width', `0%`)
            progressRef.current?.style.setProperty('--progress-width', `0%`)
            progressRef.current?.style.setProperty('--transition-duration', `0s`)

            void progressRef.current?.offsetWidth // Trigger reflow
        }

        const handleChange = () => {
            progressRef.current?.style.setProperty('--progress-width', `${calcProgress()}%`)
            progressRef.current?.style.setProperty('--transition-duration', `${calcDuration()}s`)
        }

        const handleWaiting = () => {
            bufferRef.current = true
            progressRef.current?.classList.add('loading')
            progressRef.current?.style.setProperty('--transition-duration', `0s`)
            progressRef.current?.style.setProperty('--progress-width', `${calcProgress()}%`)
        }

        const handlePlaying = () => {
            bufferRef.current = false
            progressRef.current?.classList.remove('loading')

            restoreProgress()
        }

        audio.addEventListener('timeupdate', handleTimeUpdate)
        audio.addEventListener('emptied', handleEmptied)
        audio.addEventListener('progress', handleBuffered)
        audio.addEventListener('loadedmetadata', handleChange)
        audio.addEventListener('waiting', handleWaiting)
        audio.addEventListener('playing', handlePlaying)

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate)
            audio.removeEventListener('emptied', handleEmptied)
            audio.removeEventListener('progress', handleBuffered)
            audio.removeEventListener('loadedmetadata', handleChange)
            audio.removeEventListener('waiting', handleWaiting)
            audio.removeEventListener('playing', handlePlaying)
        }
    }, [audio, calcBuffered, calcDuration, calcProgress, restoreProgress])

    return (
        <div className="progress">
            <input
                ref={progressRef}
                type="range"
                id="track-progress"
                name="track-progress"
                step="0.01"
                min="0"
                max={audio?.duration || 0}
                style={
                    {
                        '--progress-width': `${calcProgress()}%`,
                        '--buffered-width': `${calcBuffered()}%`,
                        '--transition-duration': `${calcDuration()}s`,
                    } as React.CSSProperties
                }
                onChange={e => {
                    if (!audio) return
                    const t = parseFloat(e.currentTarget.value)
                    audio.currentTime = t
                    restoreProgress()
                }}
            />
        </div>
    )
}

const Duration = memo(() => {
    const playback = usePlaybackContext()
    const audio = playback.audioRef.current

    const [progress, setProgress] = useState(audio.currentTime || 0)
    const [duration, setDuration] = useState(audio.duration || 0)

    useEffect(() => {
        if (!audio) return

        const updateProgress = () => {
            setProgress(audio.currentTime)
            setDuration(audio.duration)
        }

        audio.addEventListener('timeupdate', updateProgress)
        audio.addEventListener('loadedmetadata', updateProgress)

        return () => {
            audio.removeEventListener('timeupdate', updateProgress)
            audio.removeEventListener('loadedmetadata', updateProgress)
        }
    }, [audio])

    return (
        <div className="duration noSelect">
            <div className="current">{playback.formatTime(progress)}</div>
            <div className="divider">/</div>
            <div className="total">{playback.formatTime(duration)}</div>
        </div>
    )
})
