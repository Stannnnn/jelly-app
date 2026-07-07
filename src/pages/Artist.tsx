import { HeartFillIcon, HeartIcon } from '@primer/octicons-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { JellyImg } from '../components/JellyImg'
import { Loader } from '../components/Loader'
import { DownloadIndicators, MediaList } from '../components/MediaList'
import { Skeleton } from '../components/Skeleton'
import { Squircle } from '../components/Squircle'
import { MoreIcon } from '../components/SvgIcons'
import { TrackList } from '../components/TrackList'
import { useDropdownContext } from '../context/DropdownContext/DropdownContext'
import { usePageTitle } from '../context/PageTitleContext/PageTitleContext'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { useJellyfinArtistData } from '../hooks/Jellyfin/useJellyfinArtistData'
import { useJellyfinPlaylistsFeaturingArtist } from '../hooks/Jellyfin/useJellyfinPlaylistsFeaturingArtist'
import { useFavorites } from '../hooks/useFavorites'
import { formatDurationReadable } from '../utils/formatDurationReadable'
import './Artist.css'

export const Artist = () => {
    const playback = usePlaybackContext()
    const { artistId } = useParams<{ artistId: string }>()
    const {
        artist,
        tracks,
        albums,
        appearsInAlbums,
        totalTrackCount,
        totalPlaytime,
        totalPlays,
        totalAlbumCount,
        loading,
        statsLoading,
        error,
    } = useJellyfinArtistData(artistId!)
    const {
        playlists,
        loading: playlistsLoading,
        error: playlistsError,
    } = useJellyfinPlaylistsFeaturingArtist(artistId!)
    const { setPageTitle } = usePageTitle()
    const { isOpen, selectedItem, onContextMenu } = useDropdownContext()
    const { addToFavorites, removeFromFavorites } = useFavorites()

    useEffect(() => {
        if (artist) {
            setPageTitle(artist.Name)
        }
        return () => {
            setPageTitle('')
        }
    }, [artist, setPageTitle])

    if (loading) {
        return <Loader />
    }

    if (error || !artist) {
        return <div className="error">{error || 'Artist not found'}</div>
    }

    const topSongs = tracks.slice(0, 5)
    const genres = artist.Genres || []

    const handleMoreClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation()
        onContextMenu(e, { item: artist }, true, { add_to_favorite: true, remove_from_favorite: true })
    }

    return (
        <div className="artist-page">
            <div className="artist-header">
                <Squircle width={100} height={100} cornerRadius={8} className="thumbnail">
                    <JellyImg item={artist} type={'Primary'} width={100} height={100} />
                </Squircle>
                <div className="artist-details">
                    <div className="artist">{artist.Name}</div>
                    {genres.length > 0 && (
                        <div className="genres">
                            {genres.slice(0, 6).map((genre, index) => (
                                <span key={genre}>
                                    <Link to={`/genre/${encodeURIComponent(genre)}`}>{genre}</Link>
                                    {index < genres.slice(0, 6).length - 1 && ', '}
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="stats">
                        <div className="track-amount">
                            <span className="number">{totalTrackCount}</span>{' '}
                            <span>{totalTrackCount === 1 ? 'Track' : 'Tracks'}</span>
                        </div>
                        <div className="divider"></div>
                        <div className="album-amount">
                            <span className="number">{totalAlbumCount}</span>{' '}
                            <span>{totalAlbumCount === 1 ? 'Album' : 'Albums'}</span>
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
                                    if (playback.setCurrentPlaylistSimple({ playlist: tracks, title: artist.Name })) {
                                        playback.playTrack(0)
                                    }
                                }}
                            >
                                <div className="play-icon" />
                                <div className="text">Play</div>
                            </div>
                            <div
                                className="favorite-state"
                                title={artist.UserData?.IsFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                onClick={async () => {
                                    if (artist?.Id) {
                                        try {
                                            if (artist.UserData?.IsFavorite) {
                                                await removeFromFavorites(artist)
                                            } else {
                                                await addToFavorites(artist)
                                            }
                                        } catch (error) {
                                            console.error('Failed to update favorite status:', error)
                                        }
                                    }
                                }}
                            >
                                {artist.UserData?.IsFavorite ? <HeartFillIcon size={16} /> : <HeartIcon size={16} />}
                            </div>
                        </div>
                        <div className="secondary">
                            <DownloadIndicators offlineState={artist.offlineState} size={16} itemId={artist.Id} />
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

            <div className="artist-content">
                {topSongs.length > 0 && (
                    <div className="section top-songs">
                        <TrackList
                            tracks={topSongs}
                            showAlbum={true}
                            title={artist.Name}
                            hidden={{ view_artist: true, view_artists: true }}
                        />
                        {(totalTrackCount || 0) > 5 && (
                            <div className="all-tracks">
                                <Link to={`/artist/${artistId}/tracks`} className="textlink">
                                    View all tracks
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {(statsLoading || playlistsLoading) && albums.length === 0 && playlists.length === 0 ? (
                    <>
                        <div className="section skeleton-bottom">
                            <div className="skeleton-effect skeleton-title" />
                            <div className="skeleton-effect skeleton-desc" />
                            {Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="media-item album-item">
                                    <Skeleton type="album" />
                                </div>
                            ))}
                        </div>
                        <div className="section skeleton-bottom">
                            <div className="skeleton-effect skeleton-title" />
                            <div className="skeleton-effect skeleton-desc" />
                            {Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="media-item album-item">
                                    <Skeleton type="album" />
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        {albums.length > 0 && (
                            <div className="section albums">
                                <div className="title">Albums</div>
                                <div className="desc">Complete discography</div>
                                <MediaList
                                    items={albums}
                                    infiniteData={{ pageParams: [1], pages: [albums] }}
                                    isLoading={loading}
                                    type="album"
                                    albumDisplayMode="year"
                                    title={artist.Name ? `${artist.Name} Albums` : 'Albums'}
                                    hidden={{ view_album: true, view_artist: true }}
                                />
                            </div>
                        )}

                        {appearsInAlbums.length > 0 && (
                            <div className="section appears-in">
                                <div className="title">Appears In</div>
                                <div className="desc">Additional recordings</div>
                                <MediaList
                                    items={appearsInAlbums}
                                    infiniteData={{ pageParams: [1], pages: [appearsInAlbums] }}
                                    isLoading={loading}
                                    type="album"
                                    albumDisplayMode="both"
                                    title={artist.Name ? `${artist.Name} Albums` : 'Albums'}
                                    hidden={{ view_album: true }}
                                />
                            </div>
                        )}

                        {playlists.length > 0 && (
                            <div className="section playlists">
                                <div className="title">Playlists</div>
                                <div className="desc">Included in curated collections</div>
                                <MediaList
                                    items={playlists}
                                    infiniteData={{ pageParams: [1], pages: [playlists] }}
                                    isLoading={playlistsLoading}
                                    type="playlist"
                                    title={artist.Name ? `${artist.Name} Playlists` : 'Playlists'}
                                />
                                {playlistsError && <div className="error">{playlistsError}</div>}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
