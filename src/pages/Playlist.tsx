import { HeartFillIcon, HeartIcon } from '@primer/octicons-react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { JellyImg } from '../components/JellyImg'
import { Loader } from '../components/Loader'
import { DownloadIndicators } from '../components/MediaList'
import { PlaylistTrackList } from '../components/PlaylistTrackList'
import { Squircle } from '../components/Squircle'
import { MoreIcon } from '../components/SvgIcons'
import { useDropdownContext } from '../context/DropdownContext/DropdownContext'
import { usePageTitle } from '../context/PageTitleContext/PageTitleContext'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { useJellyfinPlaylistData } from '../hooks/Jellyfin/Infinite/useJellyfinPlaylistData'
import { useFavorites } from '../hooks/useFavorites'
import { formatDate } from '../utils/formatDate'
import { formatDurationReadable } from '../utils/formatDurationReadable'
import './Playlist.css'

export const Playlist = () => {
    const playback = usePlaybackContext()
    const { addToFavorites, removeFromFavorites } = useFavorites()

    const { playlistId } = useParams<{ playlistId: string }>()
    const {
        playlistData,
        items: tracks,
        infiniteData,
        isLoading,
        error,
        totalPlaytime,
        totalTrackCount,
        totalPlays,
        reviver,
        loadMore,
    } = useJellyfinPlaylistData(playlistId!)

    const { setPageTitle } = usePageTitle()
    const { isOpen, selectedItem, onContextMenu } = useDropdownContext()

    useEffect(() => {
        if (playlistData) {
            setPageTitle(playlistData.Name)
        }
        return () => {
            setPageTitle('')
        }
    }, [playlistData, setPageTitle])

    if (isLoading && tracks.length === 0) {
        return <Loader />
    }

    if (error) {
        return <div className="error">{error || 'Playlist not found'}</div>
    }

    if (!playlistData) {
        return <div className="error">No tracks were found</div>
    }

    const handleMoreClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation()
        onContextMenu(
            e,
            { item: playlistData, sourceTitle: playlistData.Name, sourceUrl: `/playlist/${playlistId}` },
            true,
            { add_to_favorite: true, remove_from_favorite: true }
        )
    }

    return (
        <div className="playlist-page">
            <div className="playlist-header">
                <Squircle width={100} height={100} cornerRadius={8} className="thumbnail">
                    <JellyImg item={playlistData} type={'Primary'} width={100} height={100} />
                </Squircle>
                <div className="playlist-details">
                    <div className="title">{playlistData.Name}</div>
                    <div className="date">{formatDate(playlistData.DateCreated)}</div>
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
                                className="play-playlist"
                                onClick={() => {
                                    if (
                                        playback.setCurrentPlaylistSimple({
                                            playlist: tracks,
                                            title: playlistData.Name,
                                        })
                                    ) {
                                        playback.playTrack(0)
                                    }
                                }}
                            >
                                <div className="play-icon" />
                                <div className="text">Play</div>
                            </div>
                            <div
                                className="favorite-state"
                                title={playlistData.UserData?.IsFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                onClick={async () => {
                                    if (playlistData?.Id) {
                                        try {
                                            if (playlistData.UserData?.IsFavorite) {
                                                await removeFromFavorites(playlistData)
                                            } else {
                                                await addToFavorites(playlistData)
                                            }
                                        } catch (error) {
                                            console.error('Failed to update favorite status:', error)
                                        }
                                    }
                                }}
                            >
                                {playlistData.UserData?.IsFavorite ? (
                                    <HeartFillIcon size={16} />
                                ) : (
                                    <HeartIcon size={16} />
                                )}
                            </div>
                        </div>
                        <div className="secondary">
                            <DownloadIndicators
                                offlineState={playlistData.offlineState}
                                size={16}
                                itemId={playlistData.Id}
                            />
                            <div
                                className={`more ${isOpen && selectedItem?.Id === playlistData?.Id ? 'active' : ''}`}
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
                tracks={tracks}
                infiniteData={infiniteData}
                isLoading={isLoading}
                showType="artist"
                playlistId={playlistId}
                title={playlistData ? playlistData.Name : 'Playlist'}
                reviver={reviver}
                loadMore={loadMore}
            />
        </div>
    )
}
