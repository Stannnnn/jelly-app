import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader } from '../components/Loader'
import { MediaList } from '../components/MediaList'
import { usePageTitle } from '../context/PageTitleContext/PageTitleContext'
import { useJellyfinSearchGenresData } from '../hooks/Jellyfin/Infinite/useJellyfinSearchGenresData'

export const SearchGenres = () => {
    const { query } = useParams<{ query: string }>()
    const { setPageTitle } = usePageTitle()
    const { items: genres, isLoading, error, infiniteData, loadMore, reviver } = useJellyfinSearchGenresData(query)

    useEffect(() => {
        if (query) {
            setPageTitle(`All genres for '${query}'`)
        }

        return () => setPageTitle('')
    }, [query, setPageTitle])

    if (isLoading && genres.length === 0) return <Loader />
    if (error) return <div>{error}</div>
    if (!query) return <div>Enter a search query to see results.</div>

    return (
        <div className="search-genres-page">
            {genres.length > 0 ? (
                <MediaList
                    items={genres}
                    infiniteData={infiniteData}
                    isLoading={isLoading}
                    type="genre"
                    title={`All genres for '${query}'`}
                    loadMore={loadMore}
                    reviver={reviver}
                />
            ) : (
                <div>No genres found for '{query}'.</div>
            )}
        </div>
    )
}
