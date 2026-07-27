import { ArrowLeftIcon, BookmarkFillIcon, ChevronDownIcon, HeartFillIcon } from '@primer/octicons-react'
import { JSX, memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useFilterContext } from '../context/FilterContext/FilterContext'
import { FilterContextProvider } from '../context/FilterContext/FilterContextProvider'
import { useHistoryContext } from '../context/HistoryContext/HistoryContext'
import { usePageTitle } from '../context/PageTitleContext/PageTitleContext'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { useSidenavContext } from '../context/SidenavContext/SidenavContext'
import { useDuration } from '../hooks/useDuration'
import { getPageTitle } from '../utils/titleUtils'
import { JellyImg } from './JellyImg'
import { Squircle } from './Squircle'
import { AlbumIcon, ArtistsIcon, ExpandIcon, PlaylistIcon, SortingIcon, TrackIcon, TracksIcon } from './SvgIcons'

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
    filterType?: 'mediaItems' | 'favorites' | 'kind' | 'mediaItemsPlaylist'
}) => {
    const playback = usePlaybackContext()
    const { pageTitle } = usePageTitle()
    const { goBack: previousPage } = useHistoryContext()
    const location = useLocation()
    const { toggleSidenav } = useSidenavContext()
    const { filter, setFilter } = useFilterContext()
    const { currentTrack } = usePlaybackContext()

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
                <div className="secondary noSelect">
                    {(filterType === 'mediaItems' || filterType === 'mediaItemsPlaylist') && (
                        <div className="sorting">
                            <div className="filter">
                                <select
                                    onChange={e => setFilter(c => ({ ...c, sort: e.target.value }))}
                                    value={filter.sort}
                                >
                                    <option value="Added">Added</option>
                                    <option value="Released">Released</option>
                                    <option value="Runtime">Runtime</option>
                                    <option value="Random">Random</option>
                                    <option value="Name">Name</option>
                                    {filterType === 'mediaItemsPlaylist' && <option value="Inherit">Inherit</option>}
                                </select>
                                <div className="icon">
                                    <ChevronDownIcon size={12} />
                                </div>
                            </div>

                            {filter.sort !== 'Inherit' && (
                                <div
                                    className="sort"
                                    onClick={() => {
                                        setFilter(c => ({
                                            ...c,
                                            order: c.order === 'Ascending' ? 'Descending' : 'Ascending',
                                        }))
                                    }}
                                    title={filter.order === 'Ascending' ? 'Ascending' : 'Descending'}
                                >
                                    <div className={'icon' + (filter.order === 'Ascending' ? ' active' : '')}>
                                        <SortingIcon width={12} height={12} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {(filterType === 'favorites' || filterType === 'kind') && (
                        <>
                            <div className="sorting links">
                                <div className="filter">
                                    <div className="responsive-icon">
                                        {filter.kind === 'Tracks' && (
                                            <TrackIcon width="12" height="12" className="track" />
                                        )}

                                        {filter.kind === 'Albums' && (
                                            <AlbumIcon width="14" height="14" className="album" />
                                        )}

                                        {filter.kind === 'Artists' && (
                                            <ArtistsIcon width="14" height="14" className="artist" />
                                        )}
                                        {filter.kind === 'Playlists' && (
                                            <PlaylistIcon width="14" height="14" className="playlist" />
                                        )}
                                    </div>
                                    <select
                                        onChange={e => setFilter(c => ({ ...c, kind: e.target.value }))}
                                        value={filter.kind}
                                    >
                                        <option value="Tracks">Tracks</option>
                                        <option value="Albums">Albums</option>
                                        <option value="Artists">Artists</option>
                                        <option value="Playlists">Playlists</option>
                                    </select>
                                    <div className="icon">
                                        <ChevronDownIcon size={12} />
                                    </div>
                                </div>
                            </div>

                            {filterType === 'favorites' && (
                                <div className="sorting">
                                    <div className="filter">
                                        <select
                                            onChange={e => setFilter(c => ({ ...c, sort: e.target.value }))}
                                            value={filter.sort}
                                        >
                                            <option value="Added">Added</option>
                                            <option value="Released">Released</option>
                                            <option value="Runtime">Runtime</option>
                                            <option value="Random">Random</option>
                                            <option value="Name">Name</option>
                                        </select>
                                        <div className="icon">
                                            <ChevronDownIcon size={12} />
                                        </div>
                                    </div>
                                    <div
                                        className="sort"
                                        onClick={() => {
                                            setFilter(c => ({
                                                ...c,
                                                order: c.order === 'Ascending' ? 'Descending' : 'Ascending',
                                            }))
                                        }}
                                        title={filter.order === 'Ascending' ? 'Ascending' : 'Descending'}
                                    >
                                        <div className={'icon' + (filter.order === 'Ascending' ? ' active' : '')}>
                                            <SortingIcon width={12} height={12} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div className="sidenav_toggle" onClick={toggleSidenav}>
                        <div className="bar"></div>
                        <div className="bar"></div>
                    </div>
                </div>
            </div>
        )
    }, [
        filter.kind,
        filter.order,
        filter.sort,
        filterType,
        location,
        pageTitle,
        previousPage,
        setFilter,
        toggleSidenav,
    ])

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
                        <Link to="/nowplaying" className="artwork noSelect" title="Now Playing">
                            <Squircle width={50} height={50} cornerRadius={8} className="thumbnail">
                                {currentTrack && (
                                    <JellyImg item={currentTrack} type={'Primary'} width={50} height={50} />
                                )}
                                {!currentTrack && (
                                    <div className="fallback-thumbnail">
                                        <TracksIcon width="50%" height="50%" />
                                    </div>
                                )}
                                <div className="overlay">
                                    <ExpandIcon width={18} height={18} className="icon" />
                                </div>
                            </Squircle>
                        </Link>
                    </div>
                </div>
            </div>
        )
    }, [
        currentTrack,
        playback.currentTrack,
        playback.isPlaying,
        playback.nextTrack,
        playback.previousTrack,
        playback.repeat,
        playback.shuffle,
        playback.togglePlayPause,
        playback.toggleRepeat,
        playback.toggleShuffle,
    ])

    return (
        <main className="main">
            {memoHeader}
            {memoContent}
            {memoFooter}
        </main>
    )
}

export const Progressbar = () => {
    const playback = usePlaybackContext()
    const audio = playback.audioRef as HTMLAudioElement | undefined
    const progressRef = useRef<HTMLInputElement>(null)
    const trackRef = useRef<HTMLDivElement>(null)
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

        if (playback.isPlaying && audio?.currentTime) {
            void progressRef.current?.offsetWidth // Trigger reflow

            progressRef.current?.style.setProperty('--transition-duration', `${calcDuration() - audio.currentTime}s`)
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

    // better progress bar support iOS
    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault()
        if (!audio || !progressRef.current || !trackRef.current) return
        const rect = trackRef.current.getBoundingClientRect()
        const percent = Math.min(Math.max((e.touches[0].clientX - rect.left) / rect.width, 0), 1)
        const newTime = percent * calcDuration()
        audio.currentTime = newTime
        progressRef.current.value = newTime.toString()
        restoreProgress()
    }

    return (
        <div className="progress" ref={trackRef} onTouchMove={handleTouchMove}>
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
    const duration = useDuration()

    return (
        <div className="duration noSelect">
            <div className="current">{playback.formatTime(duration.progress)}</div>
            <div className="divider">/</div>
            <div className="total">{playback.formatTime(duration.duration)}</div>
        </div>
    )
})
