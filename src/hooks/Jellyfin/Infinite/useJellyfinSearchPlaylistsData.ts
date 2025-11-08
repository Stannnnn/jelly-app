import { ___PAGE_PARAM_INDEX___ } from '../../../components/PlaybackManager'
import { useJellyfinContext } from '../../../context/JellyfinContext/JellyfinContext'
import { useJellyfinInfiniteData } from './useJellyfinInfiniteData'

export const useJellyfinSearchPlaylistsData = (query: string | undefined) => {
    const api = useJellyfinContext()
    const itemsPerPage = 40

    return useJellyfinInfiniteData({
        queryKey: ['searchPlaylists', query],
        queryFn: async ({ pageParam = 0 }) => {
            if (!query) {
                return []
            }
            const startIndex = (pageParam as number) * itemsPerPage
            return await api.searchPlaylistsDetailed(query, itemsPerPage, startIndex)
        },
        queryFnReviver: {
            fn: 'searchPlaylistsDetailed',
            params: [query, itemsPerPage, ___PAGE_PARAM_INDEX___],
        },
        enabled: !!query,
    })
}
