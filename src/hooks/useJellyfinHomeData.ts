import { useEffect, useState } from 'react'
import { ApiError, getFrequentlyPlayed, getRecentlyAdded, getRecentlyPlayed, MediaItem } from '../api/jellyfin'

interface JellyfinHomeData {
    recentlyPlayed: MediaItem[]
    frequentlyPlayed: MediaItem[]
    recentlyAdded: MediaItem[]
    loading: boolean
    error: string | null
}

export const useJellyfinHomeData = (serverUrl: string, userId: string, token: string) => {
    const [data, setData] = useState<JellyfinHomeData>({
        recentlyPlayed: [],
        frequentlyPlayed: [],
        recentlyAdded: [],
        loading: true,
        error: null,
    })

    useEffect(() => {
        if (!serverUrl || !token) {
            setData(prev => ({ ...prev, loading: true, error: 'No serverUrl or token' }))
            return
        }

        const fetchData = async () => {
            setData(prev => ({ ...prev, loading: true, error: null }))
            try {
                const [played, frequent, added] = await Promise.all([
                    getRecentlyPlayed(serverUrl, userId, token),
                    getFrequentlyPlayed(serverUrl, userId, token),
                    getRecentlyAdded(serverUrl, userId, token),
                ])

                setData({
                    recentlyPlayed: played.filter(item => item.Type === 'Audio'),
                    frequentlyPlayed: frequent.filter(item => item.Type === 'Audio'),
                    recentlyAdded: added.filter(item => item.Type === 'MusicAlbum'),
                    loading: false,
                    error: null,
                })
            } catch (err) {
                console.error('Failed to fetch home data:', err)
                if (err instanceof ApiError && err.response?.status === 401) {
                    localStorage.removeItem('auth')
                    window.location.href = '/login'
                } else {
                    setData(prev => ({ ...prev, loading: false, error: 'Failed to fetch home data' }))
                }
            }
        }

        fetchData()
    }, [serverUrl, userId, token])

    return data
}
