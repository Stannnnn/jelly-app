import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader } from '../components/Loader'
import { MediaList } from '../components/MediaList'
import { usePageTitle } from '../context/PageTitleContext/PageTitleContext'
import { useJellyfinSearchAlbumsData } from '../hooks/Jellyfin/Infinite/useJellyfinSearchAlbumsData'

export const SearchAlbums = () => {
    const { query } = useParams<{ query: string }>()
    const { setPageTitle } = usePageTitle()
    const { items: albums, isLoading, error, infiniteData, loadMore, reviver } = useJellyfinSearchAlbumsData(query)

    useEffect(() => {
        if (query) {
            setPageTitle(`All albums for '${query}'`)
        }

        return () => setPageTitle('')
    }, [query, setPageTitle])

    if (isLoading && albums.length === 0) return <Loader />
    if (error) return <div>{error}</div>
    if (!query) return <div>Enter a search query to see results.</div>

    return (
        <div className="search-albums-page">
            {albums.length > 0 ? (
                <MediaList
                    items={albums}
                    infiniteData={infiniteData}
                    isLoading={isLoading}
                    type="album"
                    title={`All albums for '${query}'`}
                    albumDisplayMode="artist"
                    hidden={{ view_album: true }}
                    loadMore={loadMore}
                    reviver={reviver}
                />
            ) : (
                <div>No albums found for '{query}'.</div>
            )}
        </div>
    )
}
