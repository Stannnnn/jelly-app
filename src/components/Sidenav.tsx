import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client'
import { BookmarkFillIcon, GearIcon, HeartFillIcon } from '@primer/octicons-react'
import { ChangeEvent, useEffect, useRef, useState, WheelEvent } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { MediaItem } from '../api/jellyfin'
import '../App.css'
import { useDownloadContext } from '../context/DownloadContext/DownloadContext'
import { useDropdownContext } from '../context/DropdownContext/DropdownContext'
import { buildUrlWithSavedFilters } from '../context/FilterContext/FilterContext'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { useScrollContext } from '../context/ScrollContext/ScrollContext'
import { useSidenavContext } from '../context/SidenavContext/SidenavContext'
import { useJellyfinPlaylistsList } from '../hooks/Jellyfin/useJellyfinPlaylistsList'
import { useJellyfinSearch } from '../hooks/Jellyfin/useJellyfinSearch'
import { formatFileSize } from '../utils/formatFileSize'
import { InlineLoader } from './InlineLoader'
import './Sidenav.css'
import {
    AlbumIcon,
    ArtistsIcon,
    DownloadingIcon,
    LyricsIcon,
    PlaylistIcon,
    PlaystateAnimationSearch,
    SearchClearIcon,
    SearchIcon,
    TrackIcon,
} from './SvgIcons'

export const Sidenav = (props: { username: string }) => {
    const playback = usePlaybackContext()
    const navigate = useNavigate()
    const searchInputRef = useRef<HTMLInputElement>(null)
    const { showSidenav, closeSidenav } = useSidenavContext()

    const { playlists, loading, error } = useJellyfinPlaylistsList()
    const { disabled, setDisabled } = useScrollContext()
    const [searchQuery, setSearchQuery] = useState(new URLSearchParams(location.search).get('search') || '')
    const { searchResults, searchLoading, searchError, searchAttempted } = useJellyfinSearch(searchQuery)
    const dropdown = useDropdownContext()
    const { storageStats, queueCount } = useDownloadContext()

    const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value)
        playback.setVolume(newVolume)
    }

    const handleVolumeScroll = (e: WheelEvent<HTMLInputElement>) => {
        e.stopPropagation()
        const step = e.deltaY > 0 ? -0.02 : 0.02
        const newVolume = Math.max(0, Math.min(1, playback.volume + step))
        playback.setVolume(newVolume)
    }

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
    }

    const handleClearSearch = () => {
        setSearchQuery('')
    }

    const handleSongClick = (song: MediaItem) => {
        if (song) {
            if (song.Id === playback.currentTrack?.Id) {
                playback.togglePlayPause()
            } else {
                if (playback.setCurrentPlaylistSimple({ playlist: [song], title: 'Sidenav Track', disableUrl: true })) {
                    playback.playTrack(0)
                }
            }

            closeSidenav()
        }
    }

    // Debounced URL update for search query
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            const params = new URLSearchParams(location.search)

            if (searchQuery) {
                params.set('search', searchQuery)
            } else {
                params.delete('search')
            }

            const newSearch = params.toString()
            const newUrl = newSearch ? `?${newSearch}` : location.pathname
            const currentUrl = location.search || location.pathname

            if (newUrl !== currentUrl) {
                navigate(newUrl, { replace: true })
            }
        }, 200)

        return () => clearTimeout(debounceTimer)
    }, [searchQuery, navigate])

    useEffect(() => {
        const focusSearch = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
        }
        window.addEventListener('keydown', focusSearch)
        return () => window.removeEventListener('keydown', focusSearch)
    }, [])

    return (
        <aside className="sidenav">
            <div className={'sidenav_wrapper' + (showSidenav ? ' active' : '') + (disabled ? ' lockscroll' : '')}>
                <div className="sidenav_header">
                    <NavLink to="/" onClick={closeSidenav} className="logo"></NavLink>
                </div>
                <nav className="sidenav_content">
                    <ul className="links noSelect">
                        <li>
                            <NavLink to="/" onClick={closeSidenav}>
                                Home
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to={buildUrlWithSavedFilters('/tracks')} onClick={closeSidenav}>
                                Tracks
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to={buildUrlWithSavedFilters('/albums')} onClick={closeSidenav}>
                                Albums
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to={buildUrlWithSavedFilters('/artists')} onClick={closeSidenav}>
                                Artists
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to={buildUrlWithSavedFilters('/favorites')} onClick={closeSidenav}>
                                Favorites
                            </NavLink>
                        </li>
                    </ul>

                    <div className="search">
                        <div className="search_header">
                            <div className={`input_container ${searchQuery ? 'active' : ''}`}>
                                <div className="search-icon noSelect">
                                    <SearchIcon width={13} height={13} />
                                </div>
                                <input
                                    type="search"
                                    placeholder="Search"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    ref={searchInputRef}
                                />
                                {!searchLoading && (
                                    <div className="search-clear" onClick={handleClearSearch}>
                                        <SearchClearIcon width={13} height={13} />
                                    </div>
                                )}
                                {searchLoading && (
                                    <div className="search-loading noSelect">
                                        <InlineLoader />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="search_results">
                            {searchQuery && (
                                <>
                                    {searchError && <div className="indicator error">{searchError}</div>}
                                    {!searchLoading &&
                                        searchAttempted &&
                                        !searchError &&
                                        searchResults.length === 0 && (
                                            <div className="empty">
                                                Search for <span className="keyword">'{searchQuery}'</span> yields no
                                                results
                                            </div>
                                        )}
                                    {!searchLoading && !searchError && searchResults.length > 0 && (
                                        <div className="results noSelect">
                                            {searchResults.map(item => {
                                                const isActive =
                                                    dropdown.selectedItem?.Id === item.Id && dropdown.isOpen

                                                const itemClass = [
                                                    item.Type === 'Audio' && playback.currentTrack?.Id === item.Id
                                                        ? playback.isPlaying
                                                            ? 'playing'
                                                            : 'paused'
                                                        : '',
                                                    isActive ? 'active' : '',
                                                ]
                                                    .filter(Boolean)
                                                    .join(' ')

                                                return item.Type === 'Audio' ? (
                                                    <div
                                                        key={`${item.Type}-${item.Id}`}
                                                        onClick={() => handleSongClick(item)}
                                                        className={`result ${itemClass}`}
                                                        onContextMenu={e => dropdown.onContextMenu(e, { item })}
                                                        onTouchStart={e => dropdown.onTouchStart(e, { item })}
                                                        onTouchMove={dropdown.onTouchClear}
                                                        onTouchEnd={dropdown.onTouchClear}
                                                    >
                                                        <div className="type song">
                                                            <div className="icon" title="Track">
                                                                {item.UserData?.IsFavorite ? (
                                                                    <div
                                                                        className="song-icon favorite-indicator"
                                                                        title="Favorited"
                                                                    >
                                                                        <HeartFillIcon size={13} />
                                                                    </div>
                                                                ) : (
                                                                    <div className="song-icon">
                                                                        <TrackIcon width={14} height={14} />
                                                                    </div>
                                                                )}
                                                                <div className="play-icon" />
                                                                <div className="pause-icon" />
                                                                <div className="play-state-animation">
                                                                    <PlaystateAnimationSearch
                                                                        width={14}
                                                                        height={14}
                                                                        className="sound-bars"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="text">
                                                                {item.Name}{' '}
                                                                <span className="artist">
                                                                    (
                                                                    {item.ArtistItems?.[0]?.Name ||
                                                                        item.Artists?.[0] ||
                                                                        'Unknown Artist'}
                                                                    )
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <NavLink
                                                        key={`${item.Type}-${item.Id}`}
                                                        to={`/${
                                                            item.Type === BaseItemKind.MusicArtist
                                                                ? 'artist'
                                                                : item.Type === BaseItemKind.MusicAlbum
                                                                ? 'album'
                                                                : item.Type === BaseItemKind.MusicGenre
                                                                ? 'genre'
                                                                : item.Type?.toLowerCase()
                                                        }/${
                                                            item.Type === BaseItemKind.MusicGenre
                                                                ? encodeURIComponent(item.Name)
                                                                : item.Id
                                                        }`}
                                                        onClick={closeSidenav}
                                                        className={`result ${itemClass}`}
                                                        onContextMenu={e => dropdown.onContextMenu(e, { item: item })}
                                                        onTouchStart={e => dropdown.onTouchStart(e, { item })}
                                                        onTouchMove={dropdown.onTouchClear}
                                                        onTouchEnd={dropdown.onTouchClear}
                                                    >
                                                        {item.Type === BaseItemKind.MusicArtist && (
                                                            <div className="type artist">
                                                                <div className="icon" title="Artist">
                                                                    <ArtistsIcon width={14} height={14} />
                                                                </div>
                                                                <div className="text">{item.Name}</div>
                                                            </div>
                                                        )}

                                                        {item.Type === BaseItemKind.MusicAlbum && (
                                                            <div className="type album">
                                                                <div className="icon" title="Album">
                                                                    <AlbumIcon width={14} height={14} />
                                                                </div>
                                                                <div className="text">{item.Name}</div>
                                                            </div>
                                                        )}

                                                        {item.Type === BaseItemKind.Playlist && (
                                                            <div className="type playlist">
                                                                <div className="icon" title="Playlist">
                                                                    <PlaylistIcon width={14} height={14} />
                                                                </div>
                                                                <div className="text">{item.Name}</div>
                                                            </div>
                                                        )}

                                                        {item.Type === BaseItemKind.MusicGenre && (
                                                            <div className="type genre">
                                                                <div className="icon" title="Genre">
                                                                    <BookmarkFillIcon size={14} />
                                                                </div>
                                                                <div className="text">{item.Name}</div>
                                                            </div>
                                                        )}
                                                    </NavLink>
                                                )
                                            })}
                                            <div className="additional">
                                                <NavLink
                                                    to={`/search/${encodeURIComponent(searchQuery)}`}
                                                    onClick={closeSidenav}
                                                    className="textlink"
                                                >
                                                    See more results
                                                </NavLink>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {!searchQuery && (
                        <div className="playlists">
                            {loading && playlists.length === 0 && (
                                <div className="indicator loading">Loading playlists...</div>
                            )}
                            {error && <div className="indicator error">{error}</div>}
                            {!loading && !error && playlists.length === 0 && (
                                <div className="indicator info">No playlists found</div>
                            )}
                            <div className="container noSelect">
                                {playlists.map(playlist => (
                                    <NavLink
                                        to={buildUrlWithSavedFilters(`/playlist/${playlist.Id}`)}
                                        key={playlist.Id}
                                        onClick={closeSidenav}
                                        className={({ isActive }) => (isActive ? 'playlist active' : 'playlist')}
                                    >
                                        {playlist.Name}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    )}
                </nav>
                <div className="sidenav_footer">
                    <div className="volume">
                        <div className="indicator">Volume: {(playback.volume * 100).toFixed(0)}%</div>
                        <div className="control">
                            <input
                                type="range"
                                id="volume"
                                name="volume"
                                min="0"
                                max="1"
                                step="0.02"
                                value={playback.volume}
                                onChange={handleVolumeChange}
                                onWheel={handleVolumeScroll}
                                onMouseEnter={() => setDisabled(true)}
                                onMouseLeave={() => setDisabled(false)}
                            />
                        </div>
                    </div>
                    <div className="account">
                        <div className="status">
                            <div className="indicator">Connected</div>
                            <div className="username" title={props.username}>
                                {props.username}
                            </div>
                        </div>
                        <div className="actions">
                            {(playback.currentTrackLyrics?.Lyrics?.length || 0) > 0 && (
                                <NavLink to="/lyrics" className="icon lyrics" title="Lyrics">
                                    <LyricsIcon width={16} height={16} />
                                </NavLink>
                            )}

                            {(storageStats.trackCount > 0 || queueCount > 0) && (
                                <NavLink
                                    to="/synced"
                                    className={`icon synced ${queueCount > 0 ? 'active-sync' : ''}`}
                                    onClick={closeSidenav}
                                    title={`Synced - ${storageStats.trackCount} Track${
                                        storageStats.trackCount === 1 ? '' : 's'
                                    }${
                                        queueCount > 0
                                            ? ` (${queueCount} track${queueCount === 1 ? '' : 's'} in queue)`
                                            : ''
                                    } / ${formatFileSize(
                                        storageStats.trackCount === 0 ? 0 : storageStats?.indexedDB || 0
                                    )} Used`}
                                >
                                    <DownloadingIcon width={16} height={16} />
                                </NavLink>
                            )}

                            <NavLink to="/settings" className="icon settings" onClick={closeSidenav} title="Settings">
                                <GearIcon size={16} />
                            </NavLink>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    )
}
