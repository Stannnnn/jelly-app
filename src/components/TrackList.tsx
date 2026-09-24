import { HeartFillIcon } from '@primer/octicons-react'
import { useLocation } from 'react-router-dom'
import { MediaItem } from '../api/jellyfin'
import { useDropdownContext } from '../context/DropdownContext/DropdownContext'
import { IMenuItems } from '../context/DropdownContext/DropdownContextProvider'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { formatDuration } from '../utils/formatDuration'
import { DownloadIndicators } from './MediaList'
import { PlaystateAnimationTracklist } from './SvgIcons'
import './TrackList.css'

export const TrackList = ({
    tracks,
    playlistItems,
    showAlbum = false,
    title,
    hidden = {},
}: {
    tracks: MediaItem[]
    playlistItems?: MediaItem[]
    showAlbum?: boolean
    title: string
    hidden?: IMenuItems
}) => {
    const playback = usePlaybackContext()
    const location = useLocation()

    const MIN_PLAY_COUNT = 5
    const mostPlayedTracks = tracks
        .map(track => ({
            ...track,
            playCount: track.UserData?.PlayCount || 0,
        }))
        .filter(track => track.playCount >= MIN_PLAY_COUNT)
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 3)
        .map(track => track.Id)

    const dropdown = useDropdownContext()

    return (
        <ul className="tracklist noSelect">
            {tracks.map((track, index) => {
                const isCurrentTrack = playback.currentTrack?.Id === track.Id
                const isMostPlayed = mostPlayedTracks.includes(track.Id)
                const isActive = dropdown.selectedItem?.Id === track.Id && dropdown.isOpen
                const itemClass = [
                    isCurrentTrack ? (playback.isPlaying ? 'playing' : 'paused') : '',
                    isMostPlayed ? 'most-played' : '',
                    isActive ? 'active' : '',
                ]
                    .filter(Boolean)
                    .join(' ')

                return (
                    <li
                        key={track.Id}
                        className={`track-item ${itemClass}`}
                        onClick={() => {
                            if (isCurrentTrack) {
                                playback.togglePlayPause()
                            } else {
                                if (
                                    playback.setCurrentPlaylistSimple({
                                        playlist: playlistItems || tracks || [],
                                        title,
                                    })
                                ) {
                                    const playIndex = playlistItems
                                        ? playlistItems.findIndex(t => t.Id === track.Id)
                                        : index

                                    playback.playTrack(playIndex)
                                }
                            }
                        }}
                        onContextMenu={e =>
                            dropdown.onContextMenu(
                                e,
                                { item: track, sourceTitle: title, sourceUrl: location.pathname },
                                false,
                                hidden
                            )
                        }
                        onTouchStart={e =>
                            dropdown.onTouchStart(
                                e,
                                { item: track, sourceTitle: title, sourceUrl: location.pathname },
                                false,
                                hidden
                            )
                        }
                        onTouchMove={dropdown.onTouchClear}
                        onTouchEnd={dropdown.onTouchClear}
                    >
                        <div className="track-indicator">
                            <div className="track-number">{index + 1}</div>
                            <div className="track-state">
                                <div className="play">
                                    <div className="play-icon"></div>
                                </div>
                                <div className="pause">
                                    <div className="pause-icon"></div>
                                </div>
                                <div className="play-state-animation">
                                    <PlaystateAnimationTracklist width={18} height={18} className="sound-bars" />
                                </div>
                            </div>
                        </div>
                        <div className="track-details">
                            <div className="container">
                                <div className="name">
                                    <div className="text">{track.Name}</div>
                                </div>
                                {showAlbum ? (
                                    <div className="album">
                                        <div className="text">{track.Album || 'Unknown Album'}</div>
                                    </div>
                                ) : (
                                    <div className="artist">
                                        {track.Artists && track.Artists.length > 0
                                            ? track.Artists.join(', ')
                                            : 'Unknown Artist'}
                                    </div>
                                )}
                            </div>
                            <div className="track-indicators">
                                <DownloadIndicators offlineState={track.offlineState} size={12} itemId={track.Id} />

                                {track.UserData?.IsFavorite && (
                                    <div className="favorited" title="Favorited">
                                        <HeartFillIcon size={12} />
                                    </div>
                                )}
                            </div>
                            <div className="duration">{formatDuration(track.RunTimeTicks)}</div>
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}
