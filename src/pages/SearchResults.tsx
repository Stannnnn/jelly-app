import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loader } from '../components/Loader'
import { MediaList } from '../components/MediaList'
import { TrackList } from '../components/TrackList'
import { usePageTitle } from '../context/PageTitleContext/PageTitleContext'
import { useJellyfinSearchDetailed } from '../hooks/Jellyfin/useJellyfinSearchDetailed'
import './SearchResults.css'

export const SearchResults = () => {
    const { query } = useParams<{ query: string }>()
    const { setPageTitle } = usePageTitle()
    const { results, loading, error } = useJellyfinSearchDetailed(query)

    useEffect(() => {
        if (query) {
            setPageTitle(`Search results for '${query}'`)
        }

        return () => setPageTitle('')
    }, [query, setPageTitle])

    if (loading) return <Loader />
    if (error) return <div>{error}</div>
    if (!query) return <div>Enter a search query to see results.</div>

    return (
        <div className="search-results-page">
            <div className="search-content">
                {results.songs.length > 0 && (
                    <div className="section songs">
                        <TrackList tracks={results.songs.slice(0, 10)} title={`Search results for '${query}'`} />
                        {results.songs.length > 10 && (
                            <div className="all-tracks">
                                <Link to={`/search/${encodeURIComponent(query)}/tracks`} className="textlink">
                                    View all tracks
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {results.artists.length > 0 && (
                    <div className="section artists">
                        <div className="title">Artists</div>
                        <MediaList
                            items={results.artists.map(artist => artist._mediaItem)}
                            infiniteData={{
                                pageParams: [1],
                                pages: [results.artists.map(artist => artist._mediaItem)],
                            }}
                            isLoading={loading}
                            type="artist"
                            title={`Artists for '${query}'`}
                            hidden={{ view_artist: true }}
                        />
                    </div>
                )}

                {results.albums.length > 0 && (
                    <div className="section albums">
                        <div className="title">Albums</div>
                        <MediaList
                            items={results.albums.map(album => album._mediaItem)}
                            infiniteData={{ pageParams: [1], pages: [results.albums.map(album => album._mediaItem)] }}
                            isLoading={loading}
                            type="album"
                            title={`Albums for '${query}'`}
                            albumDisplayMode="artist"
                            hidden={{ view_album: true }}
                        />
                    </div>
                )}

                {results.playlists.length > 0 && (
                    <div className="section playlists">
                        <div className="title">Playlists</div>
                        <MediaList
                            items={results.playlists.map(playlist => playlist._mediaItem)}
                            infiniteData={{
                                pageParams: [1],
                                pages: [results.playlists.map(playlist => playlist._mediaItem)],
                            }}
                            isLoading={loading}
                            type="playlist"
                            title={`Playlists for '${query}'`}
                            // hidden={{ view_album: true }}
                        />
                    </div>
                )}

                {results.genres.length > 0 && (
                    <div className="section genres">
                        <div className="title">Genres</div>
                        <MediaList
                            items={results.genres.map(genre => genre._mediaItem)}
                            infiniteData={{
                                pageParams: [1],
                                pages: [results.genres.map(genre => genre._mediaItem)],
                            }}
                            isLoading={loading}
                            type="genre"
                            title={`Genres for '${query}'`}
                        />
                    </div>
                )}

                {results.artists.length === 0 &&
                    results.albums.length === 0 &&
                    results.playlists.length === 0 &&
                    results.songs.length === 0 &&
                    results.genres.length === 0 && <div>No results found for '{query}'.</div>}
            </div>
        </div>
    )
}
