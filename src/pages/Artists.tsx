import { MediaList } from '../components/MediaList'
import { useJellyfinArtistsData } from '../hooks/Jellyfin/Infinite/useJellyfinArtistsData'

export const Artists = () => {
    const { items, isLoading, error, reviver, loadMore } = useJellyfinArtistsData()

    return (
        <div className="artists-page">
            <MediaList
                items={items}
                isLoading={isLoading}
                type="artist"
                title={'Artists'}
                reviver={reviver}
                loadMore={loadMore}
                hidden={{ view_artist: true }}
            />
            {error && <div className="error">{error}</div>}
        </div>
    )
}
