import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, getFavoriteTracks, MediaItem } from '../api/jellyfin'

interface JellyfinFavoritesData {
    allFavorites: MediaItem[]
    loading: boolean
    error: string | null
    hasMore: boolean
}

export const useJellyfinFavoritesData = (serverUrl: string, userId: string, token: string) => {
    const [data, setData] = useState<JellyfinFavoritesData>({
        allFavorites: [],
        loading: true,
        error: null,
        hasMore: true,
    })
    const [page, setPage] = useState(0)
    const itemsPerPage = 40
    const seenIds = useRef(new Set<string>())
    const isInitialMount = useRef(true)
    const isLoadingMore = useRef(false)

    useEffect(() => {
        if (isInitialMount.current) {
            setPage(0)
            seenIds.current.clear()
            setData(prev => ({ ...prev, allFavorites: [], hasMore: true }))
            isInitialMount.current = false
        }
    }, [serverUrl, userId, token])

    useEffect(() => {
        if (!serverUrl || !token) {
            setData(prev => ({ ...prev, loading: true, error: 'No serverUrl or token' }))
            return
        }

        const fetchData = async () => {
            setData(prev => ({ ...prev, loading: true, error: null }))
            try {
                const startIndex = page * itemsPerPage
                const favorites = await getFavoriteTracks(serverUrl, userId, token, startIndex, itemsPerPage)

                const newFavorites = favorites.filter(favorite => {
                    if (seenIds.current.has(favorite.Id)) {
                        return false
                    }
                    seenIds.current.add(favorite.Id)
                    return true
                })

                setData(prev => ({
                    allFavorites: [...prev.allFavorites, ...newFavorites],
                    loading: false,
                    error: null,
                    hasMore: favorites.length === itemsPerPage,
                }))
            } catch (err) {
                console.error('Failed to fetch favorites data:', err)
                if (err instanceof ApiError && err.response?.status === 401) {
                    localStorage.removeItem('auth')
                    window.location.href = '/login'
                } else {
                    setData(prev => ({ ...prev, loading: false, error: 'Failed to fetch favorites data' }))
                }
            }
        }

        fetchData()
    }, [serverUrl, userId, token, page])

    const loadMore = useCallback(() => {
        if (isLoadingMore.current) {
            return
        }

        if (!data.loading && data.hasMore) {
            isLoadingMore.current = true
            setPage(prev => prev + 1)
        }
    }, [data.loading, data.hasMore])

    useEffect(() => {
        if (!data.loading) {
            isLoadingMore.current = false
        }
    }, [data.loading])

    return { ...data, loadMore }
}
