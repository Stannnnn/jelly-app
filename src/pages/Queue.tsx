import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MediaList } from '../components/MediaList'
import { usePageTitle } from '../context/PageTitleContext/PageTitleContext'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import './Queue.css'

export const Queue = () => {
    const { setPageTitle } = usePageTitle()
    const { currentTrack, currentPlaylist, currentTrackIndex, isLoading, loadMore } = usePlaybackContext()

    useEffect(() => {
        setPageTitle('Queue')
        return () => setPageTitle('')
    }, [setPageTitle])

    if (!currentTrack) {
        return <div className="empty-queue">Queue is currently empty</div>
    }

    const queueTracks = currentPlaylist.slice(currentTrackIndex + 1)

    return (
        <div className="queue-page">
            <div className="queue-header">
                <MediaList
                    items={[currentTrack]}
                    infiniteData={{ pageParams: [1], pages: [[currentTrack]] }}
                    isLoading={false}
                    type="song"
                    title={'Current Track - Queue'}
                    hidden={{ add_to_queue: true, remove_from_queue: true }}
                />
            </div>

            {(queueTracks.length > 0 || isLoading) && (
                <>
                    <div className="queue-title">Playing Next</div>
                    <div className="queue-desc">
                        <span className="text">
                            From{' '}
                            {currentTrack?.originUrl ? (
                                <Link to={currentTrack.originUrl} className="textlink">
                                    {currentTrack.originTitle}
                                </Link>
                            ) : (
                                <span className="highlight">{currentTrack?.originTitle}</span>
                            )}
                        </span>
                    </div>
                    <MediaList
                        items={queueTracks}
                        infiniteData={{ pageParams: [1], pages: [queueTracks] }}
                        indexOffset={currentTrackIndex + 1}
                        isLoading={isLoading}
                        type="song"
                        loadMore={loadMore}
                        title={'Next Up - Queue'}
                        hidden={{ add_to_queue: true }}
                        reviver={'persistAll'}
                        isDraggable={true}
                    />
                </>
            )}
        </div>
    )
}
