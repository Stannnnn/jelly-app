import { HeartFillIcon } from '@primer/octicons-react'
import { MediaItem } from '../api/jellyfin'
import { useDropdownContext } from '../context/DropdownContext/DropdownContext'
import { IMenuItems } from '../context/DropdownContext/DropdownContextProvider'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { formatDuration } from '../utils/formatDuration'
import { IReviver } from './PlaybackManager'
import { DeletingIcon, DownloadedIcon, DownloadingIcon, PlaystateAnimationTracklist } from './SvgIcons'
import './TrackList.css'

export const TrackList = ({
    tracks,
    playlist,
    showAlbum = false,
    title,
    reviver,
    hidden = {},
}: {
    tracks: MediaItem[]
    playlist?: MediaItem[]
    showAlbum?: boolean
    title: string
    reviver?: IReviver
    hidden?: IMenuItems
}) => {
    const playback = usePlaybackContext()

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
                                const tracksToPlay = playlist || tracks
                                playback.setCurrentPlaylist({ playlist: tracksToPlay, title, reviver })
                                const playIndex = playlist ? playlist.findIndex(t => t.Id === track.Id) : index
                                playback.playTrack(playIndex)
                            }
                        }}
                        onContextMenu={e => dropdown.onContextMenu(e, { item: track }, false, hidden)}
                        onTouchStart={e => dropdown.onTouchStart(e, { item: track }, false, hidden)}
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
                                {track.offlineState && (
                                    <div className="download-state">
                                        {track.offlineState === 'downloading' && (
                                            <div className="icon downloading" title="Downloading">
                                                <DownloadingIcon width={12} height={12} />
                                            </div>
                                        )}

                                        {track.offlineState === 'downloaded' && (
                                            <div className="icon downloaded" title="Downloaded">
                                                <DownloadedIcon width={12} height={12} />
                                            </div>
                                        )}

                                        {track.offlineState === 'deleting' && (
                                            <div className="icon deleting" title="Deleting">
                                                <DeletingIcon width={12} height={12} />
                                            </div>
                                        )}
                                    </div>
                                )}

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
