import { useQuery } from '@tanstack/react-query'
import { MediaItem } from '../../api/jellyfin'
import { useJellyfinContext } from '../../context/JellyfinContext/JellyfinContext'

export const useJellyfinArtistData = (artistId: string, trackLimit = 5) => {
    const api = useJellyfinContext()

    // Fetch artist details and top tracks
    const {
        data: artistData,
        isFetching: artistFetching,
        isPending: artistPending,
        error: artistError,
    } = useQuery<{ artist: MediaItem; tracks: MediaItem[] }, Error>({
        queryKey: ['artistDetails', artistId, trackLimit],
        queryFn: () => api.getArtistDetails(artistId, trackLimit),
    })

    // Fetch stats
    const { data: statsData, error: statsError } = useQuery<
        {
            albums: MediaItem[]
            appearsInAlbums: MediaItem[]
            totalTrackCount: number
            totalPlaytime: number
            totalAlbumCount: number
            totalPlays: number
        },
        Error
    >({
        queryKey: ['artistStats', artistId],
        queryFn: async () => {
            const stats = await api.getArtistStats(artistId, artistData?.artist.Name || '')
            const allTracks = await api.fetchAllTracks(artistId)
            const totalPlays = allTracks.reduce(
                (sum: number, track: MediaItem) => sum + (track.UserData?.PlayCount || 0),
                0
            )
            const totalAlbumCount = stats.albums.length
            return { ...stats, totalPlays, totalAlbumCount }
        },
        enabled: !!artistData?.artist,
    })

    return {
        artist: artistData?.artist || null,
        tracks: artistData?.tracks || [],
        albums: statsData?.albums || [],
        appearsInAlbums: statsData?.appearsInAlbums || [],
        totalTrackCount: statsData?.totalTrackCount || 0,
        totalPlaytime: statsData?.totalPlaytime || 0,
        totalPlays: statsData?.totalPlays || 0,
        totalAlbumCount: statsData?.totalAlbumCount || 0,
        loading: artistFetching || artistPending,
        error: artistError?.message || statsError?.message || null,
    }
}
