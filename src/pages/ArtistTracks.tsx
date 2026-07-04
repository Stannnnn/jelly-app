import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { JELLYFIN_MAX_LIMIT } from '../api/jellyfin'
import { InlineLoader } from '../components/InlineLoader'
import { JellyImg } from '../components/JellyImg'
import { Loader } from '../components/Loader'
import { DownloadIndicators } from '../components/MediaList'
import { PlaylistTrackList } from '../components/PlaylistTrackList'
import { Squircle } from '../components/Squircle'
import { MoreIcon, SearchClearIcon, SearchIcon } from '../components/SvgIcons'
import { useDropdownContext } from '../context/DropdownContext/DropdownContext'
import { usePageTitle } from '../context/PageTitleContext/PageTitleContext'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { useJellyfinArtistTracksData } from '../hooks/Jellyfin/Infinite/useJellyfinArtistTracksData'
import { useJellyfinArtistData } from '../hooks/Jellyfin/useJellyfinArtistData'
import { useJellyfinSearch } from '../hooks/Jellyfin/useJellyfinSearch'
import { formatDurationReadable } from '../utils/formatDurationReadable'
import './ArtistTracks.css'

export const ArtistTracks = () => {
    const playback = usePlaybackContext()
    const { artistId } = useParams<{ artistId: string }>()
    const { artist, totalTrackCount, totalPlaytime, totalPlays } = useJellyfinArtistData(artistId!)
    const {
        items: allTracks,
        infiniteData,
        isLoading,
        error,
        reviver,
        loadMore,
    } = useJellyfinArtistTracksData(artistId!)
    const { setPageTitle } = usePageTitle()
    const { isOpen, selectedItem, onContextMenu } = useDropdownContext()

    const [searchQuery, setSearchQuery] = useState('')
    const { searchResults, searchLoading } = useJellyfinSearch(searchQuery)

    const filteredTracks = searchQuery
        ? searchResults.length > 0
            ? searchResults.filter(
                  item =>
                      item.Type === 'Audio' &&
                      (item.ArtistItems?.some(a => a.Id === artistId) || item.AlbumArtists?.some(a => a.Id === artistId))
              )
            : allTracks
        : allTracks

    const handleClearSearch = () => {
        setSearchQuery('')
    }

    useEffect(() => {
        if (artist) {
            setPageTitle(`${artist.Name}'s Tracks`)
        }
        return () => {
            setPageTitle('')
        }
    }, [artist, setPageTitle])

    if (isLoading && allTracks.length === 0) {
        return <Loader />
    }

    if (!artist) {
        return <div className="error">Artist not found</div>
    }

    const handleMoreClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation()
        onContextMenu(
            e,
            {
                item: artist!,
                opt: { limit: JELLYFIN_MAX_LIMIT },
            },
            true,
            {
                add_to_favorite: true,
                remove_from_favorite: true,
            }
        )
    }

    return (
        <div className="artist-tracks-page">
            {error && <div className="error">{error}</div>}

            <div className="artist-header">
                <Squircle width={80} height={80} cornerRadius={8} className="thumbnail">
                    <JellyImg item={artist} type={'Primary'} width={80} height={80} />
                </Squircle>
                <div className="artist-details">
                    <Link to={`/artist/${artistId}`} className="title">
                        {artist.Name}
                    </Link>
                    <div className="stats">
                        <div className="track-amount">
                            <span className="number">{totalTrackCount}</span>{' '}
                            <span>{totalTrackCount === 1 ? 'Track' : 'Tracks'}</span>
                        </div>
                        <div className="divider"></div>
                        <div className="length">
                            <span className="number">{formatDurationReadable(totalPlaytime)}</span> <span>Total</span>
                        </div>
                        {totalPlays > 0 && (
                            <>
                                <div className="divider"></div>
                                <div className="plays">
                                    <span className="number">{totalPlays}</span> {totalPlays === 1 ? 'Play' : 'Plays'}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="actions noSelect">
                        <div className="primary">
                            <div
                                className="play-artist"
                                onClick={() => {
                                    const tracksToPlay = searchQuery ? filteredTracks : allTracks
                                    if (
                                        playback.setCurrentPlaylistSimple({
                                            playlist: tracksToPlay,
                                            title: artist.Name,
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
                                <DownloadIndicators offlineState={artist.offlineState} size={12} itemId={artist.Id} />
                            </div>
                            <div
                                className={`more ${isOpen && selectedItem?.Id === artist?.Id ? 'active' : ''}`}
                                onClick={handleMoreClick}
                                title="More"
                            >
                                <MoreIcon width={14} height={14} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <PlaylistTrackList
                tracks={filteredTracks}
                infiniteData={searchQuery ? undefined : infiniteData}
                isLoading={searchQuery ? (searchLoading && searchResults.length === 0 && allTracks.length === 0) : isLoading}
                showType="album"
                title={artist ? `${artist.Name}'s Tracks` : 'Artist Tracks'}
                reviver={reviver}
                loadMore={searchQuery ? undefined : loadMore}
            />
        </div>
    )
}
