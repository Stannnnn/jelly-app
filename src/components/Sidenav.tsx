import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client'
import { BookmarkFillIcon, GearIcon } from '@primer/octicons-react'
import { ChangeEvent, useEffect, useRef, useState, WheelEvent } from 'react'
import { NavLink } from 'react-router-dom'
import { MediaItem } from '../api/jellyfin'
import '../App.css'
import { useDropdownContext } from '../context/DropdownContext/DropdownContext'
import { useJellyfinContext } from '../context/JellyfinContext/JellyfinContext'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { useScrollContext } from '../context/ScrollContext/ScrollContext'
import { useSidenavContext } from '../context/SidenavContext/SidenavContext'
import { useJellyfinPlaylistsList } from '../hooks/Jellyfin/useJellyfinPlaylistsList'
import { InlineLoader } from './InlineLoader'
import './Sidenav.css'
import {
    AlbumIcon,
    ArtistsIcon,
    PlaylistIcon,
    PlaystateAnimationSearch,
    SearchClearIcon,
    SearchIcon,
    TrackIcon,
} from './SvgIcons'

export const Sidenav = (props: { username: string }) => {
    const api = useJellyfinContext()
    const playback = usePlaybackContext()
    const searchInputRef = useRef<HTMLInputElement>(null)
    const { showSidenav, closeSidenav } = useSidenavContext()

    const { playlists, loading, error } = useJellyfinPlaylistsList()
    const { disabled, setDisabled } = useScrollContext()
    const [searchQuery, setSearchQuery] = useState(new URLSearchParams(location.search).get('search') || '')
    const [searchResults, setSearchResults] = useState<MediaItem[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)
    const [searchAttempted, setSearchAttempted] = useState(false)
    const dropdown = useDropdownContext()

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

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            const fetchSearchResults = async () => {
                if (!searchQuery || !api.auth.serverUrl || !api.auth.token || !api.auth.userId) {
                    setSearchResults([])
                    setSearchAttempted(false)
                    return
                }

                setSearchLoading(true)
                setSearchError(null)
                setSearchAttempted(true)

                try {
                    // Fetch artists from /Artists endpoint
                    const [artistResponse, itemsResponse, genreResponse] = await Promise.all([
                        api.searchArtists(searchQuery, 20),
                        api.searchItems(searchQuery, 40),
                        api.searchGenres(searchQuery, 20),
                    ])

                    // Fetch songs, albums, and playlists from /Items endpoint
                    const artists = artistResponse.slice(0, 4)
                    const songs = itemsResponse.filter(item => item.Type === 'Audio').slice(0, 6)
                    const albums = itemsResponse.filter(item => item.Type === 'MusicAlbum').slice(0, 4)
                    const playlists = itemsResponse.filter(item => item.Type === 'Playlist').slice(0, 4)
                    const genres = genreResponse.slice(0, 4)

                    const limitedResults = [...songs, ...artists, ...albums, ...playlists, ...genres]
                    setSearchResults(limitedResults)
                } catch (err) {
                    console.error('Search Error:', err)
                    setSearchError('Failed to load search results')
                } finally {
                    setSearchLoading(false)
                }
            }

            fetchSearchResults()
        }, 200)

        return () => clearTimeout(debounceTimer)
    }, [searchQuery, api.auth.serverUrl, api.auth.token, api.auth.userId, api])

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
    }

    const handleClearSearch = () => {
        setSearchQuery('')
        setSearchResults([])
        setSearchAttempted(false)
    }

    const handleSongClick = (song: MediaItem) => {
        if (song) {
            if (song.Id === playback.currentTrack?.Id) {
                playback.togglePlayPause()
            } else {
                playback.setCurrentPlaylist({ playlist: [song], title: 'Sidenav Track' })
                playback.playTrack(0)
            }

            closeSidenav()
        }
    }

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
                            <NavLink to="/tracks" onClick={closeSidenav}>
                                Tracks
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/albums" onClick={closeSidenav}>
                                Albums
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/artists" onClick={closeSidenav}>
                                Artists
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/favorites" onClick={closeSidenav}>
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
                                                                <div className="song-icon">
                                                                    <TrackIcon width={14} height={14} />
                                                                </div>
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
                                                                : item.Type?.toLowerCase()
                                                        }/${
                                                            item.Type === BaseItemKind.Genre
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

                                                        {item.Type === BaseItemKind.Genre && (
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
                            {loading && <div className="indicator loading">Loading playlists...</div>}
                            {error && <div className="indicator error">{error}</div>}
                            {!loading && !error && playlists.length === 0 && (
                                <div className="indicator info">No playlists found</div>
                            )}
                            <div className="container noSelect">
                                {playlists.map(playlist => (
                                    <NavLink
                                        to={`/playlist/${playlist.Id}`}
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
                        <NavLink to="/settings" className="settings" onClick={closeSidenav} title="Settings">
                            <GearIcon size={16} />
                        </NavLink>
                    </div>
                </div>
            </div>
        </aside>
    )
}
