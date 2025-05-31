import { ___PAGE_PARAM_INDEX___ } from '../../../components/PlaybackManager'
import { useFilterContext } from '../../../context/FilterContext/FilterContext'
import { useJellyfinContext } from '../../../context/JellyfinContext/JellyfinContext'
import { useJellyfinInfiniteData } from './useJellyfinInfiniteData'

export const useJellyfinArtistsData = () => {
    const api = useJellyfinContext()
    const itemsPerPage = 40
    const { jellySort } = useFilterContext()

    return useJellyfinInfiniteData({
        queryKey: ['artists', jellySort.sortBy, jellySort.sortOrder],
        queryFn: async ({ pageParam = 0 }) => {
            const startIndex = (pageParam as number) * itemsPerPage
            return await api.getAllArtists(startIndex, itemsPerPage, jellySort.sortBy, jellySort.sortOrder)
        },
        queryFnReviver: {
            fn: 'getAllArtists',
            params: [___PAGE_PARAM_INDEX___, itemsPerPage, jellySort.sortBy, jellySort.sortOrder],
        },
    })
}
