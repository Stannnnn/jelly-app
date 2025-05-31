import { HeartFillIcon } from '@primer/octicons-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Virtuoso } from 'react-virtuoso'
import { MediaItem } from '../api/jellyfin'
import { useDropdownContext } from '../context/DropdownContext/DropdownContext'
import { IMenuItems } from '../context/DropdownContext/DropdownContextProvider'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { useDisplayItems } from '../hooks/useDisplayItems'
import { JellyImg } from './JellyImg'
import { Loader } from './Loader'
import { IReviver } from './PlaybackManager'
import { Skeleton } from './Skeleton'
import { DeletingIcon, DownloadedIcon, DownloadingIcon, PlaystateAnimationMedalist } from './SvgIcons'

export const MediaList = ({
    items = [],
    isLoading,
    type,
    title,
    reviver,
    loadMore,
    hidden = {},
}: {
    items: MediaItem[] | undefined
    isLoading: boolean
    type: 'song' | 'album' | 'artist'
    title: string
    reviver?: IReviver
    loadMore?: () => void
    hidden?: IMenuItems
}) => {
    const playback = usePlaybackContext()
    const navigate = useNavigate()
    const location = useLocation()
    const { displayItems, setRowRefs } = useDisplayItems(items, isLoading)

    const dropdown = useDropdownContext()

    const handleSongClick = (item: MediaItem, index: number) => {
        if (type === 'song') {
            if (playback.currentTrack?.Id === item.Id) {
                playback.togglePlayPause()
            } else {
                playback.setCurrentPlaylist({ playlist: items, title, reviver })
                playback.playTrack(index)
            }
        }
    }

    const renderItem = (index: number, item: MediaItem | { isPlaceholder: true }) => {
        if ('isPlaceholder' in item) {
            if (type === 'album') {
                return (
                    <div className="media-item album-item" ref={el => setRowRefs(index, el)}>
                        <Skeleton type="album" />
                    </div>
                )
            } else if (type === 'artist') {
                return (
                    <div className="media-item artist-item" ref={el => setRowRefs(index, el)}>
                        <Skeleton type="artist" />
                    </div>
                )
            } else {
                return (
                    <li className="media-item song-item" ref={el => setRowRefs(index, el)}>
                        <Skeleton type="song" />
                    </li>
                )
            }
        }

        const isActive = dropdown.selectedItem?.Id === item.Id && dropdown.isOpen

        const itemClass = [
            type === 'song' && playback.currentTrack?.Id === item.Id ? (playback.isPlaying ? 'playing' : 'paused') : '',
            isActive ? 'active' : '',
        ]
            .filter(Boolean)
            .join(' ')

        if (type === 'album') {
            return (
                <div
                    className={`media-item album-item ${itemClass}`}
                    key={item.Id}
                    onClick={() => navigate(`/album/${item.Id}`)}
                    ref={el => setRowRefs(index, el)}
                    onContextMenu={e => dropdown.onContextMenu(e, { item })}
                    onTouchStart={e => dropdown.onTouchStart(e, { item })}
                    onTouchMove={dropdown.onTouchClear}
                    onTouchEnd={dropdown.onTouchClear}
                >
                    <div className="media-state">
                        <JellyImg item={item} type={'Primary'} width={46} height={46} />
                    </div>
                    <div className="media-details">
                        <span className="song-name">{item.Name}</span>
                        <div className="container">
                            <div className="artist">{item.AlbumArtist || 'Unknown Artist'}</div>
                        </div>
                    </div>
                    <div className="media-indicators">
                        {item.offlineState && (
                            <div className="download-state">
                                {item.offlineState === 'downloading' && (
                                    <div className="icon downloading" title="Downloading">
                                        <DownloadingIcon width={16} height={16} />
                                    </div>
                                )}

                                {item.offlineState === 'downloaded' && (
                                    <div className="icon downloaded" title="Downloaded">
                                        <DownloadedIcon width={16} height={16} />
                                    </div>
                                )}

                                {item.offlineState === 'deleting' && (
                                    <div className="icon deleting" title="Deleting">
                                        <DeletingIcon width={16} height={16} />
                                    </div>
                                )}
                            </div>
                        )}
                        {item.UserData?.IsFavorite && location.pathname !== '/favorites' && (
                            <div className="favorited" title="Favorited">
                                <HeartFillIcon size={16} />
                            </div>
                        )}
                    </div>
                </div>
            )
        } else if (type === 'artist') {
            return (
                <div
                    className={`media-item artist-item ${itemClass}`}
                    key={item.Id}
                    onClick={() => navigate(`/artist/${item.Id}`)}
                    ref={el => setRowRefs(index, el)}
                    onContextMenu={e => dropdown.onContextMenu(e, { item })}
                    onTouchStart={e => dropdown.onTouchStart(e, { item })}
                    onTouchMove={dropdown.onTouchClear}
                    onTouchEnd={dropdown.onTouchClear}
                >
                    <div className="media-state">
                        <JellyImg item={item} type={'Primary'} width={36} height={36} />
                    </div>
                    <div className="media-details">
                        <div className="song-name">{item.Name || 'Unknown Artist'}</div>
                    </div>
                    <div className="media-indicators">
                        {item.offlineState && (
                            <div className="download-state">
                                {item.offlineState === 'downloading' && (
                                    <div className="icon downloading" title="Downloading">
                                        <DownloadingIcon width={16} height={16} />
                                    </div>
                                )}

                                {item.offlineState === 'downloaded' && (
                                    <div className="icon downloaded" title="Downloaded">
                                        <DownloadedIcon width={16} height={16} />
                                    </div>
                                )}

                                {item.offlineState === 'deleting' && (
                                    <div className="icon deleting" title="Deleting">
                                        <DeletingIcon width={16} height={16} />
                                    </div>
                                )}
                            </div>
                        )}
                        {item.UserData?.IsFavorite && location.pathname !== '/favorites' && (
                            <div className="favorited" title="Favorited">
                                <HeartFillIcon size={16} />
                            </div>
                        )}
                    </div>
                </div>
            )
        } else {
            return (
                <li
                    className={`media-item song-item ${itemClass}`}
                    onClick={() => handleSongClick(item, index)}
                    key={item.Id}
                    ref={el => setRowRefs(index, el)}
                    onContextMenu={e => dropdown.onContextMenu(e, { item }, false, hidden)}
                    onTouchStart={e => dropdown.onTouchStart(e, { item }, false, hidden)}
                    onTouchMove={dropdown.onTouchClear}
                    onTouchEnd={dropdown.onTouchClear}
                >
                    <div className="media-state">
                        <JellyImg item={item} type={'Primary'} width={46} height={46} />

                        <div className="overlay">
                            <div className="container">
                                <div className="play">
                                    <div className="play-icon"></div>
                                </div>
                                <div className="pause">
                                    <div className="pause-icon"></div>
                                </div>
                            </div>
                            <div className="play-state-animation">
                                <PlaystateAnimationMedalist width={28} height={20} className="sound-bars" />
                            </div>
                        </div>
                    </div>
                    <div className="media-details">
                        <span className="song-name">{item.Name}</span>
                        <div className="container">
                            <div className="artist">
                                {item.Artists && item.Artists.length > 0 ? item.Artists.join(', ') : 'Unknown Artist'}
                            </div>
                            <>
                                <div className="divider"></div>
                                <div className="album">{item.Album || 'Unknown Album'}</div>
                            </>
                        </div>
                    </div>
                    <div className="media-indicators">
                        {item.offlineState && (
                            <div className="download-state">
                                {item.offlineState === 'downloading' && (
                                    <div className="icon downloading" title="Downloading">
                                        <DownloadingIcon width={16} height={16} />
                                    </div>
                                )}

                                {item.offlineState === 'downloaded' && (
                                    <div className="icon downloaded" title="Downloaded">
                                        <DownloadedIcon width={16} height={16} />
                                    </div>
                                )}

                                {item.offlineState === 'deleting' && (
                                    <div className="icon deleting" title="Deleting">
                                        <DeletingIcon width={16} height={16} />
                                    </div>
                                )}
                            </div>
                        )}
                        {item.UserData?.IsFavorite && location.pathname !== '/favorites' && (
                            <div className="favorited" title="Favorited">
                                <HeartFillIcon size={16} />
                            </div>
                        )}
                    </div>
                </li>
            )
        }
    }

    if (isLoading && items.length === 0) {
        return <Loader />
    }

    if (items.length === 0 && !isLoading) {
        return (
            <div className="empty">
                {type === 'song'
                    ? 'No tracks were found'
                    : type === 'album'
                    ? 'No albums were found'
                    : 'No artists were found'}
            </div>
        )
    }

    return (
        <ul className="media-list noSelect">
            <Virtuoso
                data={displayItems}
                useWindowScroll
                itemContent={renderItem}
                endReached={loadMore}
                overscan={800}
            />
        </ul>
    )
}
