import { MediaItem } from '../api/jellyfin'
import { useJellyfinContext } from '../context/JellyfinContext/JellyfinContext'
import { usePatchQueries } from './usePatchQueries'

export const usePlaylists = () => {
    const api = useJellyfinContext()
    const { prependItemsToQueryData, removeItemFromQueryData, patchMediaItem } = usePatchQueries()

    return {
        addToPlaylist: async (item: MediaItem, playlistId: string) => {
            await api.addToPlaylist(playlistId, [item])
            prependItemsToQueryData(['playlistTracks', playlistId], [item])
        },
        addItemsToPlaylist: async (items: MediaItem[], playlistId: string) => {
            await api.addToPlaylist(playlistId, items)
            prependItemsToQueryData(['playlistTracks', playlistId], items)
        },
        removeFromPlaylist: async (item: MediaItem, playlistId: string) => {
            await api.removeFromPlaylist(playlistId, item)
            removeItemFromQueryData(['playlistTracks', playlistId], item.Id)
        },
        createPlaylist: async (name: string) => {
            const res = await api.createPlaylist(name)
            const playlist = await api.getPlaylist(res.Id!)
            prependItemsToQueryData(['playlists'], [playlist])
            return playlist
        },
        renamePlaylist: async (playlistId: string, newName: string) => {
            await api.renamePlaylist(playlistId, newName)
            patchMediaItem(playlistId, item => ({ ...item, Name: newName }))
        },
        deletePlaylist: async (playlistId: string) => {
            await api.deletePlaylist(playlistId)
            removeItemFromQueryData(['playlists'], playlistId)
        },
    }
}
