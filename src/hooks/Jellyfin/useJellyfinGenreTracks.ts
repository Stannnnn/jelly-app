import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { ApiError, MediaItem } from '../../api/jellyfin'
import { useJellyfinContext } from '../../context/JellyfinContext/JellyfinContext'
import { usePlaybackContext } from '../../context/PlaybackContext/PlaybackContext'
import { getAllTracks } from '../../utils/getAllTracks'

export const useJellyfinGenreTracks = (genre: string) => {
    const api = useJellyfinContext()
    const itemsPerPage = 40
    const playback = usePlaybackContext()

    const { data, isLoading, isFetched, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<
        MediaItem[],
        ApiError
    >({
        queryKey: ['genreTracks', genre],
        queryFn: async ({ pageParam = 0 }) => {
            const startIndex = (pageParam as number) * itemsPerPage
            return await api.getGenreTracks(genre, startIndex, itemsPerPage)
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

    const tracks = useMemo(() => {
        return getAllTracks(data)
    }, [data])

    const loadMore = useCallback(async () => {
        if (hasNextPage && !isFetchingNextPage) {
            return getAllTracks((await fetchNextPage()).data)
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    useEffect(() => {
        if (!isFetched) {
            return
        }

        if (playback.currentPlaylistQueryKey && playback.currentPlaylistQueryKey !== 'genreTracks') {
            return
        }

        playback.setCurrentPlaylist({
            type: 'genreTracks',
            playlist: tracks,
            hasMore: Boolean(hasNextPage),
            loadMore,
        })
    }, [tracks, hasNextPage, isFetchingNextPage, isLoading, loadMore, playback, isFetched, playback.setCurrentPlaylist])

    return {
        items: tracks,
        loading: isLoading || isFetchingNextPage,
        error: error ? error.message : null,
    }
}
