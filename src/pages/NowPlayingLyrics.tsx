import { ArrowLeftIcon, HeartFillIcon, HeartIcon } from '@primer/octicons-react'
import { JellyImg } from '../components/JellyImg'
import { Progressbar } from '../components/Main'
import { DownloadIndicators } from '../components/MediaList'
import { Squircle } from '../components/Squircle'
import { MoreIcon, TracksIcon } from '../components/SvgIcons'
import { TrackBitrate } from '../components/TrackBitrate'
import { useDropdownContext } from '../context/DropdownContext/DropdownContext'
import { useHistoryContext } from '../context/HistoryContext/HistoryContext'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { useDuration } from '../hooks/useDuration'
import { useFavorites } from '../hooks/useFavorites'
import { Lyrics } from './Lyrics'
import './NowPlaying.css'

export const NowPlayingLyrics = () => {
    const { goBack: previousPage } = useHistoryContext()
    const { currentTrack, bitrate } = usePlaybackContext()

    const playback = usePlaybackContext()
    const duration = useDuration()
    const { isOpen, selectedItem, onContextMenu } = useDropdownContext()
    const { addToFavorites, removeFromFavorites } = useFavorites()

    const handleMoreClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!currentTrack) {
            return
        }

        e.stopPropagation()
        onContextMenu(e, { item: currentTrack }, true, { add_to_favorite: true, remove_from_favorite: true })
    }

    return (
        <>
            <div className="now-playing-dimmer noSelect" />
            <div
                className={
                    playback.isPlaying
                        ? 'now-playing-lyrics playing'
                        : playback.currentTrack
                        ? 'now-playing-lyrics paused'
                        : 'now-playing-lyrics'
                }
            >
                <div className="ui">
                    <div className="playing-header main_header">
                        <div className="wrapper">
                            <div className="inner">
                                <div className="primary">
                                    <div onClick={previousPage} className="return_icon" title="Back">
                                        <ArrowLeftIcon size={16}></ArrowLeftIcon>
                                    </div>
                                    <Squircle width={40} height={40} cornerRadius={6} className="thumbnail">
                                        {currentTrack && (
                                            <JellyImg item={currentTrack} type={'Primary'} width={40} height={40} />
                                        )}
                                        {!currentTrack && (
                                            <div className="fallback-thumbnail">
                                                <TracksIcon width="50%" height="50%" />
                                            </div>
                                        )}
                                        <div className="shadow-border" />
                                    </Squircle>
                                </div>
                                <div className="secondary">
                                    <div
                                        className="artist"
                                        title={
                                            currentTrack?.Artists && currentTrack.Artists.length > 0
                                                ? currentTrack.Artists.join(', ')
                                                : 'No Artist'
                                        }
                                    >
                                        {currentTrack?.Artists && currentTrack.Artists.length > 0
                                            ? currentTrack.Artists.join(', ')
                                            : 'No Artist'}
                                    </div>
                                    <div className="song-name" title={currentTrack?.Name || 'No Track Played'}>
                                        {currentTrack?.Name || 'No Track Played'}
                                    </div>
                                </div>
                                <div className="tertiary">
                                    <div
                                        className="favorite-state"
                                        title={
                                            currentTrack?.UserData?.IsFavorite
                                                ? 'Remove from favorites'
                                                : 'Add to favorites'
                                        }
                                        onClick={async () => {
                                            if (currentTrack?.Id) {
                                                try {
                                                    if (currentTrack?.UserData?.IsFavorite) {
                                                        await removeFromFavorites(currentTrack)
                                                    } else {
                                                        await addToFavorites(currentTrack)
                                                    }
                                                } catch (error) {
                                                    console.error('Failed to update favorite status:', error)
                                                }
                                            }
                                        }}
                                    >
                                        {currentTrack?.UserData?.IsFavorite ? (
                                            <HeartFillIcon size={16} />
                                        ) : (
                                            <HeartIcon size={16} />
                                        )}
                                    </div>
                                    <div
                                        className={`more ${
                                            isOpen && selectedItem?.Id === currentTrack?.Id ? 'active' : ''
                                        }`}
                                        onClick={handleMoreClick}
                                        title="More"
                                    >
                                        <MoreIcon width={14} height={14} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="playing-content">
                        <Lyrics />
                    </div>

                    <div className="playing-footer main_footer">
                        <div className="wrapper">
                            <div className="inner">
                                <div className="playing-progress noSelect">
                                    <div className="info">
                                        <div className="duration">{playback.formatTime(duration.progress)}</div>
                                        <div className="quality">
                                            <div className="text">
                                                {bitrate === 320000
                                                    ? 'High'
                                                    : bitrate === 256000
                                                    ? 'Medium'
                                                    : bitrate === 192000
                                                    ? 'Low'
                                                    : bitrate === 128000
                                                    ? 'Minimal'
                                                    : 'Source'}
                                            </div>
                                            <div className="divider" />
                                            <div className="bitrate">
                                                <span className="number">
                                                    {bitrate === 320000 ? (
                                                        '320'
                                                    ) : bitrate === 256000 ? (
                                                        '256'
                                                    ) : bitrate === 192000 ? (
                                                        '192'
                                                    ) : bitrate === 128000 ? (
                                                        '128'
                                                    ) : (
                                                        <TrackBitrate currentTrack={currentTrack} />
                                                    )}
                                                </span>{' '}
                                                kbps
                                            </div>

                                            <DownloadIndicators
                                                offlineState={currentTrack?.offlineState}
                                                size={12}
                                                itemId={currentTrack?.Id}
                                            />
                                        </div>
                                        <div className="duration">{playback.formatTime(duration.duration)}</div>
                                    </div>
                                    <Progressbar />
                                </div>
                                <div className="playing-controls">
                                    <div
                                        className={`shuffle ${playback.shuffle ? 'active' : ''}`}
                                        onClick={playback.toggleShuffle}
                                        title="Shuffle"
                                    >
                                        <div className="shuffle-icon"></div>
                                    </div>
                                    <div className="primary">
                                        <div className="previous" onClick={playback.previousTrack} title="Previous">
                                            <div className="previous-icon"></div>
                                        </div>
                                        <div className="container">
                                            <div className="play" onClick={playback.togglePlayPause} title="Play">
                                                <div className="play-icon"></div>
                                            </div>
                                            <div className="pause" onClick={playback.togglePlayPause} title="Pause">
                                                <div className="pause-icon"></div>
                                            </div>
                                        </div>
                                        <div className="next" onClick={playback.nextTrack} title="Next">
                                            <div className="next-icon"></div>
                                        </div>
                                    </div>
                                    <div
                                        className={`repeat ${playback.repeat === 'off' ? '' : 'active'}`}
                                        onClick={playback.toggleRepeat}
                                        title="Repeat"
                                    >
                                        <div className={`repeat-icon${playback.repeat === 'one' ? '-one' : ''}`}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="background-artwork noSelect">
                    {currentTrack && <JellyImg item={currentTrack} type={'Primary'} width={360} height={360} />}
                </div>
            </div>
        </>
    )
}
