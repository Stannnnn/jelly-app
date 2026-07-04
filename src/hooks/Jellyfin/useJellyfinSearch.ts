import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { MediaItem } from '../../api/jellyfin'
import { useAudioStorageContext } from '../../context/AudioStorageContext/AudioStorageContext'
import { useJellyfinContext } from '../../context/JellyfinContext/JellyfinContext'

export const useJellyfinSearch = (searchQuery: string) => {
    const api = useJellyfinContext()
    const audioStorage = useAudioStorageContext()
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery)

    // Debounce the search query
    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery)
        }, 200)

        return () => clearTimeout(debounceTimer)
    }, [searchQuery])

    const { data, isFetching, error } = useQuery<MediaItem[], Error>({
        queryKey: ['search', debouncedSearchQuery],
        placeholderData: keepPreviousData,
        queryFn: async () => {
            if (!debouncedSearchQuery || !api.auth.serverUrl || !api.auth.token || !api.auth.userId) {
                return []
            }

            if (navigator.onLine) {
                // Fetch each type
                const [artistResponse, albumResponse, playlistResponse, songResponse, genreResponse] =
                    await Promise.all([
                        api.searchArtists(debouncedSearchQuery, 4),
                        api.searchAlbumsDetailed(debouncedSearchQuery, 4),
                        api.searchPlaylistsDetailed(debouncedSearchQuery, 4),
                        api.fetchSongs(debouncedSearchQuery, 8),
                        api.searchGenres(debouncedSearchQuery, 4),
                    ])

                const limitedResults = [
                    ...songResponse,
                    ...artistResponse,
                    ...albumResponse,
                    ...playlistResponse,
                    ...genreResponse,
                ]
                return limitedResults
            } else {
                // Use offline search when no network
                const offlineResults = await audioStorage.searchOfflineItems(debouncedSearchQuery, 12)
                return offlineResults
            }
        },
    })

    return {
        searchResults: data || [],
        searchLoading: isFetching || debouncedSearchQuery !== searchQuery,
        searchError: error ? error.message : null,
        searchAttempted: searchQuery.length > 0,
    }
}
