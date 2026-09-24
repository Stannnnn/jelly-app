import { useInfiniteQuery } from '@tanstack/react-query'
import { MediaItem } from '../api/jellyfin'
import { useAudioStorageContext } from '../context/AudioStorageContext/AudioStorageContext'
import { useFilterContext } from '../context/FilterContext/FilterContext'

export const useIndexedDbDownloadsData = () => {
    const audioStorage = useAudioStorageContext()
    const { jellyItemKind } = useFilterContext()
    const itemsPerPage = 40

    const { data, isFetching, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<
        MediaItem[],
        Error
    >({
        queryKey: ['downloads', jellyItemKind],
        queryFn: async ({ pageParam = 0 }) => {
            return await audioStorage.getPageFromIndexedDb(pageParam as number, jellyItemKind, itemsPerPage)
        },
        getNextPageParam: (lastPage: MediaItem[], allPages: MediaItem[][]) => {
            return lastPage.length === itemsPerPage ? allPages.length : undefined
        },
        initialPageParam: 0,
        staleTime: 0,
        retry: false,
        networkMode: 'always',
    })

    const allItems = data ? data.pages.flat() : []

    const loadMore = async () => {
        if (hasNextPage && !isFetchingNextPage) {
            await fetchNextPage()
        }
    }

    return {
        items: allItems,
        isLoading: isFetching || isPending,
        error: error ? error.message : null,
        hasNextPage,
        loadMore,
    }
}
