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
import { useJellyfinGenreTracks } from '../hooks/Jellyfin/Infinite/useJellyfinGenreTracks'
import { useJellyfinGenre } from '../hooks/Jellyfin/useJellyfinGenre'
import { formatDurationReadable } from '../utils/formatDurationReadable'
import './Genre.css'

export const Genre = () => {
    const { genre } = useParams<{ genre: string }>()
    const { items, infiniteData, isLoading, error, reviver, loadMore, totalTrackCount, totalPlaytime, totalPlays } =
        useJellyfinGenreTracks(genre!)
    const { setPageTitle } = usePageTitle()
    const playback = usePlaybackContext()
    const { isOpen, onContextMenu } = useDropdownContext()
    const { mediaItem: currentGenre, loading: currentGenreLoading } = useJellyfinGenre(genre || '')

    useEffect(() => {
        if (genre) {
            setPageTitle(decodeURIComponent(genre))
        }
        return () => {
            setPageTitle('')
        }
    }, [genre, setPageTitle])

    if (isLoading && items.length === 0) {
        return <Loader />
    }

    if (currentGenreLoading) {
        return <Loader />
    }

    if (error || !currentGenre) {
        return <div className="error">{error || 'Genre not found'}</div>
    }

    const handleMoreClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation()

        onContextMenu(
            e,
            {
                item: currentGenre,
                sourceTitle: currentGenre.Name,
                sourceUrl: `/genre/${encodeURIComponent(genre || '')}`,
            },
            true,
            {
                add_to_favorite: true,
                remove_from_favorite: true,
            }
        )
    }

    return (
        <div className="genre-page">
            {error && <div className="error">{error}</div>}

            <div className="genre-header">
                <Squircle width={80} height={80} cornerRadius={8} className="thumbnail">
                    <JellyImg item={currentGenre} type={'Primary'} width={100} height={100} />
                </Squircle>
                <div className="genre-details">
                    <div className="title">{genre ? decodeURIComponent(genre) : 'Genre'}</div>
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
                                            playlist: items,
                                            title: genre ? `Genre: ${decodeURIComponent(genre)}` : 'Genre',
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
                            <DownloadIndicators
                                offlineState={currentGenre.offlineState}
                                size={12}
                                itemId={currentGenre.Id}
                            />
                            <div className={`more ${isOpen ? 'active' : ''}`} onClick={handleMoreClick} title="More">
                                <MoreIcon width={14} height={14} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <PlaylistTrackList
                tracks={items}
                infiniteData={infiniteData}
                isLoading={isLoading}
                title={genre ? `Genre: ${decodeURIComponent(genre)}` : 'Genres'}
                reviver={reviver}
                loadMore={loadMore}
            />
        </div>
    )
}
