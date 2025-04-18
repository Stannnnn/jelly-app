import { useEffect, useRef, useState } from 'react'
import MediaList from '../components/MediaList'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { useJellyfinFrequentlyPlayedData } from '../hooks/useJellyfinFrequentlyPlayedData'

const FrequentlyPlayed = () => {
    const playback = usePlaybackContext()

    const { items, loading, error, loadMore, hasMore } = useJellyfinFrequentlyPlayedData()
    const hasPreloaded = useRef(false)
    const [isPreloading, setIsPreloading] = useState(false)

    useEffect(() => {
        if (hasPreloaded.current || isPreloading) return

        const savedIndex = localStorage.getItem('currentTrackIndex')
        if (savedIndex) {
            const index = Number(savedIndex)
            if (index >= 0 && items.length <= index && hasMore) {
                setIsPreloading(true)

                const loadAdditionalTracks = async () => {
                    if (items.length > index || !hasMore) {
                        setIsPreloading(false)
                        hasPreloaded.current = true
                        return
                    }

                    if (loading) {
                        setTimeout(loadAdditionalTracks, 100)
                        return
                    }

                    await loadMore()
                    setTimeout(loadAdditionalTracks, 100)
                }

                loadAdditionalTracks()
            } else {
                hasPreloaded.current = true
                setIsPreloading(false)
            }
        } else {
            hasPreloaded.current = true
            setIsPreloading(false)
        }
    }, [items.length, hasMore, loading, loadMore, isPreloading])

    return (
        <div className="frequently-page">
            {error && <div className="error">{error}</div>}
            <MediaList
                items={items}
                type="song"
                loading={loading}
                loadMore={loadMore}
                hasMore={hasMore}
                playTrack={index => {
                    playback.setCurrentPlaylist(items, hasMore, loadMore)
                    playback.playTrack(index)
                }}
                playlist={items}
            />
        </div>
    )
}

export default FrequentlyPlayed
