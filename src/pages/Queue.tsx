import { useEffect } from 'react'
import { MediaList } from '../components/MediaList'
import { usePageTitle } from '../context/PageTitleContext/PageTitleContext'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import './Queue.css'

export const Queue = () => {
    const { setPageTitle } = usePageTitle()
    const { currentTrack, currentPlaylist, currentTrackIndex, playlistTitle, isLoading, loadMore } =
        usePlaybackContext()

    useEffect(() => {
        setPageTitle('Queue')
        return () => setPageTitle('')
    }, [setPageTitle])

    if (!currentTrack || currentPlaylist.length === 0) {
        return <div className="empty-queue">Queue is currently empty</div>
    }

    const queueTracks = currentPlaylist.slice(currentTrackIndex + 1)

    return (
        <div className="queue-page">
            <div className="queue-header">
                <MediaList items={[currentTrack]} isLoading={false} type="song" title={'Current Track - Queue'} />
            </div>
            {queueTracks.length > 0 && (
                <>
                    <div className="queue-title">Playing Next</div>
                    <div className="queue-desc">
                        <span className="text">
                            From <span className="highlight">{playlistTitle}</span>
                        </span>
                    </div>
                    <MediaList
                        items={queueTracks}
                        isLoading={isLoading}
                        type="song"
                        loadMore={loadMore}
                        title={'Next Up - Queue'}
                    />
                </>
            )}
        </div>
    )
}
