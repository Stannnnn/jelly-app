import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { ApiError, MediaItem } from '../../api/jellyfin'
import { useJellyfinContext } from '../../context/JellyfinContext/JellyfinContext'
import { usePlaybackContext } from '../../context/PlaybackContext/PlaybackContext'
import { getAllTracks } from '../../utils/getAllTracks'

export const useJellyfinRecentlyPlayedData = () => {
    const api = useJellyfinContext()
    const itemsPerPage = 40
    const playback = usePlaybackContext()

    const { data, isLoading, isFetched, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<
        MediaItem[],
        ApiError
    >({
        queryKey: ['recentlyPlayed'],
        queryFn: async ({ pageParam = 0 }) => {
            const startIndex = (pageParam as number) * itemsPerPage
            return await api.fetchRecentlyPlayed(startIndex, itemsPerPage)
        },
        getNextPageParam: (lastPage, pages) => (lastPage.length === itemsPerPage ? pages.length : undefined),
        initialPageParam: 0,
    })

    useEffect(() => {
        if (error instanceof ApiError && error.response?.status === 401) {
            localStorage.removeItem('auth')
            window.location.href = '/login'
        }
    }, [error])

    const loadMore = useCallback(async () => {
        if (hasNextPage && !isFetchingNextPage) {
            return getAllTracks((await fetchNextPage()).data)
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    const allTracks = useMemo(() => {
        return getAllTracks(data)
    }, [data])

    useEffect(() => {
        if (!isFetched) {
            return
        }

        if (playback.currentPlaylistQueryKey && playback.currentPlaylistQueryKey !== 'recentlyPlayed') {
            return
        }

        playback.setCurrentPlaylist({
            type: 'recentlyPlayed',
            playlist: allTracks,
            hasMore: Boolean(hasNextPage),
            loadMore,
        })
    }, [
        allTracks,
        hasNextPage,
        isFetched,
        isFetchingNextPage,
        isLoading,
        loadMore,
        playback,
        playback.setCurrentPlaylist,
    ])

    return {
        items: allTracks,
        loading: isLoading || isFetchingNextPage,
        error: error ? error.message : null,
    }
}
