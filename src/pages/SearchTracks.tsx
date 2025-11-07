import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader } from '../components/Loader'
import { MediaList } from '../components/MediaList'
import { usePageTitle } from '../context/PageTitleContext/PageTitleContext'
import { useJellyfinSearchTracksData } from '../hooks/Jellyfin/Infinite/useJellyfinSearchTracksData'

export const SearchTracks = () => {
    const { query } = useParams<{ query: string }>()
    const { setPageTitle } = usePageTitle()
    const { items: tracks, isLoading, error, infiniteData, loadMore, reviver } = useJellyfinSearchTracksData(query)

    useEffect(() => {
        if (query) {
            setPageTitle(`All tracks for '${query}'`)
        }

        return () => setPageTitle('')
    }, [query, setPageTitle])

    if (isLoading && tracks.length === 0) return <Loader />
    if (error) return <div>{error}</div>
    if (!query) return <div>Enter a search query to see results.</div>

    return (
        <div className="search-tracks-page">
            {tracks.length > 0 ? (
                <MediaList
                    items={tracks}
                    infiniteData={infiniteData}
                    isLoading={isLoading}
                    type="song"
                    title={`All tracks for '${query}'`}
                    loadMore={loadMore}
                    reviver={reviver}
                />
            ) : (
                <div>No tracks found for '{query}'.</div>
            )}
        </div>
    )
}
