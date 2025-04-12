import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { ApiError, MediaItem } from '../api/jellyfin'
import { useJellyfinContext } from '../context/JellyfinContext/JellyfinContext'

export const useJellyfinPlaylistData = (playlistId: string) => {
    const api = useJellyfinContext()
    const itemsPerPage = 40

    const { data: playlist, error: playlistError } = useQuery<MediaItem, ApiError>({
        queryKey: ['playlist', playlistId],
        queryFn: () => api.getPlaylist(playlistId),
    })

    const { data: totals, error: totalsError } = useQuery<
        {
            totalTrackCount: number
            totalPlaytime: number
        },
        ApiError
    >({
        queryKey: ['playlistTotals', playlistId],
        queryFn: () => api.getPlaylistTotals(playlistId),
    })

    const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<
        MediaItem[],
        ApiError
    >({
        queryKey: ['playlistTracks', playlistId],
        queryFn: async ({ pageParam = 0 }) => {
            const startIndex = (pageParam as number) * itemsPerPage
            return await api.getPlaylistTracks(playlistId, startIndex, itemsPerPage)
        },
        getNextPageParam: (lastPage, pages) => (lastPage.length === itemsPerPage ? pages.length : undefined),
        initialPageParam: 0,
    })

    useEffect(() => {
        if (
            (error || playlistError || totalsError) instanceof ApiError &&
            (error || playlistError || totalsError)?.response?.status === 401
        ) {
            localStorage.removeItem('auth')
            window.location.href = '/login'
        }
    }, [error, playlistError, totalsError])

    const seenIds = new Set<string>()
    const tracks: MediaItem[] = data
        ? data.pages.flat().filter(track => {
              if (seenIds.has(track.Id)) {
                  return false
              }
              seenIds.add(track.Id)
              return true
          })
        : []

    const loadMore = useCallback(async () => {
        if (hasNextPage && !isFetchingNextPage) {
            await fetchNextPage()
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    const totalPlaytime = totals?.totalPlaytime || 0
    const totalTrackCount = totals?.totalTrackCount || 0
    const totalPlays = tracks.reduce((sum, track) => sum + (track.UserData?.PlayCount || 0), 0)

    return {
        playlist: playlist || null,
        tracks,
        loading: isLoading || isFetchingNextPage,
        error: error ? error.message : null,
        hasMore: Boolean(hasNextPage),
        loadMore,
        totalPlaytime,
        totalTrackCount,
        totalPlays,
    }
}
