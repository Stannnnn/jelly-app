import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader } from '../components/Loader'
import { MediaList } from '../components/MediaList'
import { usePageTitle } from '../context/PageTitleContext/PageTitleContext'
import { useJellyfinSearchPlaylistsData } from '../hooks/Jellyfin/Infinite/useJellyfinSearchPlaylistsData'

export const SearchPlaylists = () => {
    const { query } = useParams<{ query: string }>()
    const { setPageTitle } = usePageTitle()
    const {
        items: playlists,
        isLoading,
        error,
        infiniteData,
        loadMore,
        reviver,
    } = useJellyfinSearchPlaylistsData(query)

    useEffect(() => {
        if (query) {
            setPageTitle(`All playlists for '${query}'`)
        }

        return () => setPageTitle('')
    }, [query, setPageTitle])

    if (isLoading && playlists.length === 0) return <Loader />
    if (error) return <div>{error}</div>
    if (!query) return <div>Enter a search query to see results.</div>

    return (
        <div className="search-playlists-page">
            {playlists.length > 0 ? (
                <MediaList
                    items={playlists}
                    infiniteData={infiniteData}
                    isLoading={isLoading}
                    type="playlist"
                    title={`All playlists for '${query}'`}
                    loadMore={loadMore}
                    reviver={reviver}
                />
            ) : (
                <div>No playlists found for '{query}'.</div>
            )}
        </div>
    )
}
