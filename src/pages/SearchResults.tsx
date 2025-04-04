import { HeartFillIcon } from '@primer/octicons-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MediaItem } from '../api/jellyfin'
import Loader from '../components/Loader'
import TrackList from '../components/TrackList'
import { useJellyfinContext } from '../context/JellyfinContext'
import { usePageTitle } from '../context/PageTitleContext'
import './SearchResults.css'

interface SearchResult {
    type: 'Artist' | 'Album' | 'Playlist' | 'Song'
    id: string
    name: string
    thumbnailUrl?: string
    artists?: string[]
    totalTracks?: number
    isFavorite?: boolean
}

const SearchResults = () => {
    const api = useJellyfinContext()

    const { query } = useParams<{ query: string }>()
    const { setPageTitle } = usePageTitle()
    const [results, setResults] = useState<{
        artists: SearchResult[]
        albums: SearchResult[]
        playlists: SearchResult[]
        songs: MediaItem[]
    }>({
        artists: [],
        albums: [],
        playlists: [],
        songs: [],
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (query) {
            setPageTitle(`Search results for '${query}'`)
        }

        const fetchSearchResults = async () => {
            if (!query) return

            setLoading(true)
            setError(null)

            try {
                const artistItems = await api.searchArtistsDetailed(query, 10)
                const albumItems = await api.searchAlbumsDetailed(query, 10)
                const playlistItems = await api.searchPlaylistsDetailed(query, 10)

                const songResponse = await fetch(
                    `${api.auth.serverUrl}/Users/${api.auth.userId}/Items?searchTerm=${encodeURIComponent(
                        query
                    )}&IncludeItemTypes=Audio&Recursive=true&Limit=10&Fields=ArtistItems&api_key=${api.auth.token}`
                )
                const songData = await songResponse.json()
                const songs = songData.Items || []

                const artists = artistItems.map(artist => ({
                    type: 'Artist' as const,
                    id: artist.Id,
                    name: artist.Name,
                    thumbnailUrl: artist.ImageTags?.Primary
                        ? `${api.auth.serverUrl}/Items/${artist.Id}/Images/Primary?tag=${artist.ImageTags.Primary}&quality=100&fillWidth=36&fillHeight=36&format=webp&api_key=${api.auth.token}`
                        : '/default-thumbnail.png',
                    isFavorite: artist.UserData?.IsFavorite || false,
                }))

                const albums = albumItems.map(item => ({
                    type: 'Album' as const,
                    id: item.Id,
                    name: item.Name,
                    thumbnailUrl: item.ImageTags?.Primary
                        ? `${api.auth.serverUrl}/Items/${item.Id}/Images/Primary?tag=${item.ImageTags.Primary}&quality=100&fillWidth=46&fillHeight=46&format=webp&api_key=${api.auth.token}`
                        : item.AlbumPrimaryImageTag && item.AlbumId
                        ? `${api.auth.serverUrl}/Items/${item.AlbumId}/Images/Primary?tag=${item.AlbumPrimaryImageTag}&quality=100&fillWidth=46&fillHeight=46&format=webp&api_key=${api.auth.token}`
                        : '/default-thumbnail.png',
                    artists: [item.AlbumArtists?.[0]?.Name || item.AlbumArtist || 'Unknown Artist'],
                    isFavorite: item.UserData?.IsFavorite || false,
                }))

                const playlists = playlistItems.map(playlist => ({
                    type: 'Playlist' as const,
                    id: playlist.Id,
                    name: playlist.Name,
                    thumbnailUrl: playlist.ImageTags?.Primary
                        ? `${api.auth.serverUrl}/Items/${playlist.Id}/Images/Primary?tag=${playlist.ImageTags.Primary}&quality=100&fillWidth=46&fillHeight=46&format=webp&api_key=${api.auth.token}`
                        : '/default-thumbnail.png',
                    totalTracks: playlist.ChildCount || 0,
                    isFavorite: playlist.UserData?.IsFavorite || false,
                }))

                setResults({ artists, albums, playlists, songs })
            } catch (err) {
                console.error('Search Error:', err)
                setError('Failed to load search results')
            } finally {
                setLoading(false)
            }
        }

        fetchSearchResults()

        return () => setPageTitle('')
    }, [query, setPageTitle, api])

    if (loading) return <Loader />
    if (error) return <div>{error}</div>
    if (!query) return <div>Enter a search query to see results.</div>

    return (
        <div className="search-results-page">
            <div className="search-content">
                {results.songs.length > 0 && (
                    <div className="section songs">
                        <TrackList tracks={results.songs} showAlbumLink={false} />
                    </div>
                )}

                {results.artists.length > 0 && (
                    <div className="section artists">
                        <div className="title">Artists</div>
                        <div className="section-list noSelect">
                            {results.artists.map(artist => (
                                <Link to={`/artist/${artist.id}`} key={artist.id} className="section-item">
                                    {artist.thumbnailUrl && (
                                        <img src={artist.thumbnailUrl} alt={artist.name} className="thumbnail" />
                                    )}
                                    <div className="section-info">
                                        <div className="name">{artist.name}</div>
                                    </div>
                                    {artist.isFavorite && (
                                        <div className="favorited" title="Favorited">
                                            <HeartFillIcon size={16} />
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {results.albums.length > 0 && (
                    <div className="section albums">
                        <div className="title">Albums</div>
                        <div className="section-list noSelect">
                            {results.albums.map(album => (
                                <Link to={`/album/${album.id}`} key={album.id} className="section-item">
                                    {album.thumbnailUrl && (
                                        <img src={album.thumbnailUrl} alt={album.name} className="thumbnail" />
                                    )}
                                    <div className="section-info">
                                        <div className="name">{album.name}</div>
                                        <div className="desc album-artists">
                                            {album.artists?.[0] || 'Unknown Artist'}
                                        </div>
                                    </div>
                                    {album.isFavorite && (
                                        <div className="favorited" title="Favorited">
                                            <HeartFillIcon size={16} />
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {results.playlists.length > 0 && (
                    <div className="section playlists">
                        <div className="title">Playlists</div>
                        <div className="section-list noSelect">
                            {results.playlists.map(playlist => (
                                <Link to={`/playlist/${playlist.id}`} key={playlist.id} className="section-item">
                                    {playlist.thumbnailUrl && (
                                        <img src={playlist.thumbnailUrl} alt={playlist.name} className="thumbnail" />
                                    )}
                                    <div className="section-info">
                                        <div className="name">{playlist.name}</div>
                                        <div className="desc track-amount">{playlist.totalTracks} tracks</div>
                                    </div>
                                    {playlist.isFavorite && (
                                        <div className="favorited" title="Favorited">
                                            <HeartFillIcon size={16} />
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {results.artists.length === 0 &&
                    results.albums.length === 0 &&
                    results.playlists.length === 0 &&
                    results.songs.length === 0 && <div>No results found for '{query}'.</div>}
            </div>
        </div>
    )
}

export default SearchResults
