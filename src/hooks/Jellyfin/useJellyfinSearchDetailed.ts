import { useQuery } from '@tanstack/react-query'
import { MediaItem } from '../../api/jellyfin'
import { useAudioStorageContext } from '../../context/AudioStorageContext/AudioStorageContext'
import { useJellyfinContext } from '../../context/JellyfinContext/JellyfinContext'

interface SearchResult {
    type: 'Artist' | 'Album' | 'Playlist' | 'Song' | 'Genre'
    id: string
    name: string
    thumbnailUrl?: string
    artists?: string[]
    totalTracks?: number
    isFavorite?: boolean
    _mediaItem: MediaItem
}

interface SearchResults {
    artists: SearchResult[]
    albums: SearchResult[]
    playlists: SearchResult[]
    songs: MediaItem[]
    genres: SearchResult[]
}

export const useJellyfinSearchDetailed = (query: string | undefined) => {
    const api = useJellyfinContext()
    const audioStorage = useAudioStorageContext()

    const { data, isFetching, error } = useQuery<SearchResults, Error>({
        queryKey: ['searchDetailed', query],
        queryFn: async () => {
            if (!query) {
                return {
                    artists: [],
                    albums: [],
                    playlists: [],
                    songs: [],
                    genres: [],
                }
            }

            if (navigator.onLine) {
                const [artistItems, albumItems, playlistItems, songs, genreItems] = await Promise.all([
                    api.searchArtists(query, 10),
                    api.searchAlbumsDetailed(query, 10),
                    api.searchPlaylistsDetailed(query, 10),
                    api.fetchSongs(query, 10),
                    api.searchGenres(query, 10),
                ])

                const artists = artistItems.map(artist => ({
                    type: 'Artist' as const,
                    id: artist.Id,
                    name: artist.Name,
                    thumbnailUrl: api.getImageUrl(artist, 'Primary', { width: 36, height: 36 }),
                    isFavorite: artist.UserData?.IsFavorite || false,
                    _mediaItem: artist,
                }))

                const albums = albumItems.map(item => ({
                    type: 'Album' as const,
                    id: item.Id,
                    name: item.Name,
                    thumbnailUrl: api.getImageUrl(item, 'Primary', { width: 46, height: 46 }),
                    artists: [item.AlbumArtists?.[0]?.Name || item.AlbumArtist || 'Unknown Artist'],
                    isFavorite: item.UserData?.IsFavorite || false,
                    _mediaItem: item,
                }))

                const playlists = playlistItems.map(playlist => ({
                    type: 'Playlist' as const,
                    id: playlist.Id,
                    name: playlist.Name,
                    thumbnailUrl: api.getImageUrl(playlist, 'Primary', { width: 46, height: 46 }),
                    totalTracks: playlist.ChildCount || 0,
                    isFavorite: playlist.UserData?.IsFavorite || false,
                    _mediaItem: playlist,
                }))

                const genres = genreItems.map(genre => ({
                    type: 'Genre' as const,
                    id: genre.Name,
                    name: genre.Name,
                    _mediaItem: genre,
                }))

                return { artists, albums, playlists, songs, genres }
            } else {
                const offlineSongs = await audioStorage.searchOfflineItems(query, 50)
                return {
                    artists: [],
                    albums: [],
                    playlists: [],
                    songs: offlineSongs,
                    genres: [],
                }
            }
        },
    })

    return {
        results: data || {
            artists: [],
            albums: [],
            playlists: [],
            songs: [],
            genres: [],
        },
        loading: isFetching,
        error: error ? error.message : null,
    }
}
