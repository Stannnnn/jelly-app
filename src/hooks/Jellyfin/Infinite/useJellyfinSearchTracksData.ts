import { ___PAGE_PARAM_INDEX___ } from '../../../components/PlaybackManager'
import { useJellyfinContext } from '../../../context/JellyfinContext/JellyfinContext'
import { useJellyfinInfiniteData } from './useJellyfinInfiniteData'

export const useJellyfinSearchTracksData = (query: string | undefined) => {
    const api = useJellyfinContext()
    const itemsPerPage = 40

    return useJellyfinInfiniteData({
        queryKey: ['searchTracks', query],
        queryFn: async ({ pageParam = 0 }) => {
            if (!query) {
                return []
            }
            const startIndex = (pageParam as number) * itemsPerPage
            return await api.fetchSongs(query, itemsPerPage, startIndex)
        },
        queryFnReviver: {
            fn: 'fetchSongs',
            params: [query, itemsPerPage, ___PAGE_PARAM_INDEX___],
        },
        enabled: !!query,
    })
}
