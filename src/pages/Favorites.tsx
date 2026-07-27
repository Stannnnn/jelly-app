import { HeartFillIcon } from '@primer/octicons-react'
import { useState } from 'react'
import { InlineLoader } from '../components/InlineLoader'
import { DownloadIndicators, MediaList } from '../components/MediaList'
import { PlaylistTrackList } from '../components/PlaylistTrackList'
import { Squircle } from '../components/Squircle'
import { MoreIcon, SearchClearIcon, SearchIcon } from '../components/SvgIcons'
import { useDropdownContext } from '../context/DropdownContext/DropdownContext'
import { useFilterContext } from '../context/FilterContext/FilterContext'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { useJellyfinFavoritesData } from '../hooks/Jellyfin/Infinite/useJellyfinFavoritesData'
import { useJellyfinCustomContainerItem } from '../hooks/Jellyfin/useJellyfinCustomContainerItem'
import { useJellyfinSearch } from '../hooks/Jellyfin/useJellyfinSearch'
import { formatDurationReadable } from '../utils/formatDurationReadable'
import './Favorites.css'

export const Favorites = () => {
    const { items, infiniteData, isLoading, error, reviver, loadMore, totalTrackCount, totalPlaytime, totalPlays } =
        useJellyfinFavoritesData()
    const { jellyItemKind } = useFilterContext()
    const playback = usePlaybackContext()
    const { isOpen, onContextMenu } = useDropdownContext()
    const { customItem: favoritesCustomItem } = useJellyfinCustomContainerItem('favorites', 'Favorite Songs')

    const [searchQuery, setSearchQuery] = useState('')
    const { searchResults, searchLoading } = useJellyfinSearch(searchQuery)

    const filteredTracks = searchQuery
        ? searchResults.length > 0
            ? searchResults.filter(item => item.Type === 'Audio' && item.UserData?.IsFavorite === true)
            : items
        : items

    const handleClearSearch = () => {
        setSearchQuery('')
    }

    const handleMoreClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation()

        if (!favoritesCustomItem) {
            console.warn('Favorites custom item not ready yet')
            return
        }

        onContextMenu(e, { item: favoritesCustomItem, opt: { customContainer: 'favorites' } }, true, {
            instant_mix: true,
            add_to_favorite: true,
            remove_from_favorite: true,
        })
    }

    return (
        <div className="favorites-page">
            {error && <div className="error">{error}</div>}

            {jellyItemKind === 'Audio' && (
                <div className="favorites-header">
                    <Squircle width={80} height={80} cornerRadius={8} className="thumbnail">
                        <div className="fallback-thumbnail">
                            <HeartFillIcon size={28} />
                        </div>
                    </Squircle>
                    <div className="favorites-details">
                        <div className="title">Favorite Tracks</div>
                        <div className="stats">
                            <div className="track-amount">
                                <span className="number">{totalTrackCount}</span>{' '}
                                <span>{totalTrackCount === 1 ? 'Track' : 'Tracks'}</span>
                            </div>
                            {totalPlaytime > 0 && (
                                <>
                                    <div className="divider"></div>
                                    <div className="length">
                                        <span className="number">{formatDurationReadable(totalPlaytime)}</span>{' '}
                                        <span>Total</span>
                                    </div>
                                </>
                            )}
                            {totalPlays > 0 && (
                                <>
                                    <div className="divider"></div>
                                    <div className="plays">
                                        <span className="number">{totalPlays}</span>{' '}
                                        <span>{totalPlays === 1 ? 'Play' : 'Plays'}</span>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="actions noSelect">
                            <div className="primary">
                                <div
                                    className="play-playlist"
                                    onClick={() => {
                                        const tracksToPlay = searchQuery ? filteredTracks : items
                                        if (
                                            playback.setCurrentPlaylistSimple({
                                                playlist: tracksToPlay,
                                                title: 'Favorites',
                                            })
                                        ) {
                                            playback.playTrack(0)
                                        }
                                    }}
                                >
                                    <div className="play-icon" />
                                    <div className="text">Play</div>
                                </div>
                            </div>
                            <div className="secondary">
                                <div className="input_container">
                                    {!searchLoading && !searchQuery && (
                                        <div className="search-icon noSelect">
                                            <SearchIcon width={12} height={12} />
                                        </div>
                                    )}

                                    {searchLoading && (
                                        <div className="search-loading noSelect">
                                            <InlineLoader />
                                        </div>
                                    )}

                                    {!searchLoading && searchQuery && (
                                        <div className="search-clear" onClick={handleClearSearch}>
                                            <SearchClearIcon width={12} height={12} />
                                        </div>
                                    )}

                                    <input
                                        type="search"
                                        placeholder="Filter tracks"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        //onChange={handleSearchChange}
                                        //ref={searchInputRef}
                                    />
                                    <DownloadIndicators
                                        offlineState={favoritesCustomItem?.offlineState}
                                        size={12}
                                        itemId={favoritesCustomItem?.Id}
                                    />
                                </div>
                                <div
                                    className={`more ${isOpen ? 'active' : ''}`}
                                    onClick={handleMoreClick}
                                    title="More"
                                >
                                    <MoreIcon width={14} height={14} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {jellyItemKind === 'Audio' && (
                <PlaylistTrackList
                    tracks={filteredTracks}
                    infiniteData={searchQuery ? undefined : infiniteData}
                    isLoading={searchQuery ? (searchLoading && searchResults.length === 0 && items.length === 0) : isLoading}
                    reviver={reviver}
                    loadMore={searchQuery ? undefined : loadMore}
                    title={'Favorites'}
                />
            )}

            {jellyItemKind !== 'Audio' && (
                <MediaList
                    items={items}
                    infiniteData={infiniteData}
                    isLoading={isLoading}
                    type={
                        jellyItemKind === 'MusicAlbum' ? 'album' : jellyItemKind === 'Playlist' ? 'playlist' : 'artist'
                    }
                    reviver={reviver}
                    loadMore={loadMore}
                    title={'Favorites'}
                />
            )}
        </div>
    )
}
