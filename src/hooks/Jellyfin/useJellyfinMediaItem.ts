import { useQuery } from '@tanstack/react-query'
import { useAudioStorageContext } from '../../context/AudioStorageContext/AudioStorageContext'
import { useJellyfinContext } from '../../context/JellyfinContext/JellyfinContext'

export const useJellyfinMediaItem = (itemId: string | undefined) => {
    const api = useJellyfinContext()
    const audioStorage = useAudioStorageContext()

    const { data, isFetching, isPending, error } = useQuery({
        queryKey: ['mediaItem', itemId],
        queryFn: async () => {
            if (!itemId) throw new Error('Item ID is required')
            if (!navigator.onLine) {
                const track = await audioStorage.getTrack(itemId)
                if (!track) throw new Error('No offline data available')
                return track.mediaItem
            }
            return await api.getMediaItem(itemId)
        },
        enabled: !!itemId,
        networkMode: 'always',
    })

    return {
        mediaItem: data,
        loading: isFetching || isPending,
        error: error ? error.message : null,
    }
}
