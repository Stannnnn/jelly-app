import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader } from '../components/Loader'
import { MediaList } from '../components/MediaList'
import { usePageTitle } from '../context/PageTitleContext/PageTitleContext'
import { useJellyfinSearchArtistsData } from '../hooks/Jellyfin/Infinite/useJellyfinSearchArtistsData'

export const SearchArtists = () => {
    const { query } = useParams<{ query: string }>()
    const { setPageTitle } = usePageTitle()
    const { items: artists, isLoading, error, infiniteData, loadMore, reviver } = useJellyfinSearchArtistsData(query)

    useEffect(() => {
        if (query) {
            setPageTitle(`All artists for '${query}'`)
        }

        return () => setPageTitle('')
    }, [query, setPageTitle])

    if (isLoading && artists.length === 0) return <Loader />
    if (error) return <div>{error}</div>
    if (!query) return <div>Enter a search query to see results.</div>

    return (
        <div className="search-artists-page">
            {artists.length > 0 ? (
                <MediaList
                    items={artists}
                    infiniteData={infiniteData}
                    isLoading={isLoading}
                    type="artist"
                    title={`All artists for '${query}'`}
                    hidden={{ view_artist: true }}
                    loadMore={loadMore}
                    reviver={reviver}
                />
            ) : (
                <div>No artists found for '{query}'.</div>
            )}
        </div>
    )
}
