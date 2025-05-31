import { QueryFunction, useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { ApiError, MediaItem } from '../../../api/jellyfin'
import { IReviver } from '../../../components/PlaybackManager'
import { getAllTracks } from '../../../utils/getAllTracks'

export type IJellyfinInfiniteProps = Parameters<typeof useJellyfinInfiniteData>[0]

export const useJellyfinInfiniteData = ({
    queryKey,
    queryFn,
    initialPageParam = 0,
    queryFnReviver,
}: {
    queryKey: unknown[]
    queryFn: QueryFunction<MediaItem[], readonly unknown[], unknown>
    initialPageParam?: number
    queryFnReviver: IReviver['queryFn']
}) => {
    const itemsPerPage = 40

    const { data, isFetching, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<
        MediaItem[],
        ApiError
    >({
        queryKey,
        queryFn,
        getNextPageParam: (lastPage, pages) => (lastPage.length >= itemsPerPage ? pages.length : undefined),
        initialPageParam,
        staleTime: Infinity,
    })

    useEffect(() => {
        if (error instanceof ApiError) {
            if (error.response?.status === 401) {
                localStorage.removeItem('auth')
                window.location.href = '/login'
            }
        }
    }, [error])

    const allTracks = useMemo(() => {
        return getAllTracks(data)
    }, [data])

    const loadMore = useCallback(async () => {
        if (hasNextPage && !isFetchingNextPage) {
            return getAllTracks((await fetchNextPage()).data)
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    return {
        items: allTracks,
        isLoading: isFetching || isPending,
        error: error ? error.message : null,
        hasNextPage,
        loadMore,
        reviver: {
            queryKey,
            queryFn: queryFnReviver,
        },
    }
}
