import { Jellyfin } from '@jellyfin/sdk'
import {
    InstantMixApi,
    LyricsApi,
    MediaInfoApi,
    MusicGenresApi,
    PlaylistsApi,
} from '@jellyfin/sdk/lib/generated-client'
import { ArtistsApi } from '@jellyfin/sdk/lib/generated-client/api/artists-api'
import { ItemsApi } from '@jellyfin/sdk/lib/generated-client/api/items-api'
import { PlaystateApi } from '@jellyfin/sdk/lib/generated-client/api/playstate-api'
import { SessionApi } from '@jellyfin/sdk/lib/generated-client/api/session-api'
import { SystemApi } from '@jellyfin/sdk/lib/generated-client/api/system-api'
import { UserApi } from '@jellyfin/sdk/lib/generated-client/api/user-api'
import { UserLibraryApi } from '@jellyfin/sdk/lib/generated-client/api/user-library-api'
import { BaseItemDto, BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models'
import { ItemFilter } from '@jellyfin/sdk/lib/generated-client/models/item-filter'
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by'
import { PlayMethod } from '@jellyfin/sdk/lib/generated-client/models/play-method'
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order'
import { syncDownloads, syncDownloadsById, unsyncDownloadsById } from '../context/DownloadContext/DownloadContext'

export class ApiError extends Error {
    constructor(message: string, public response: Response) {
        super(message)
        this.response = response
    }
}

const generateDeviceId = () => {
    const storedDeviceId = localStorage.getItem('deviceId')
    if (storedDeviceId) return storedDeviceId
    const newDeviceId = Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('deviceId', newDeviceId)
    return newDeviceId
}

const deviceId = generateDeviceId()

interface AuthResponse {
    AccessToken: string
    User: { Id: string; Name: string }
}

export type MediaItem = BaseItemDto & {
    Id: string
    Name: string
    pageIndex?: number
    offlineState?: 'downloading' | 'downloaded' | 'deleting'
    queueId?: string
    manuallyAdded?: boolean
    downloadedImageUrl?: string
}

export type IJellyfinAuth = Parameters<typeof initJellyfinApi>[0]

export const loginToJellyfin = async (serverUrl: string, username: string, password: string) => {
    try {
        const response = await fetch(`${serverUrl}/Users/AuthenticateByName`, {
            method: 'POST',
            headers: {
                'X-Emby-Authorization': `MediaBrowser Client="Jelly Music App", Device="Web", DeviceId="${deviceId}", Version="${__VERSION__}"`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ Username: username, Pw: password }),
            signal: AbortSignal.timeout(20000),
        })
        if (!response.ok) {
            throw new ApiError(`HTTP error! status: ${response.status}`, response)
        }
        const data: AuthResponse = await response.json()
        return {
            token: data.AccessToken,
            userId: data.User.Id,
            username: data.User.Name,
        }
    } catch (error) {
        throw new Error('Login failed: ' + (error as Error).message)
    }
}

export const JELLYFIN_MAX_LIMIT = 2000 // Safety fallback upper limit for API calls

export const initJellyfinApi = ({ serverUrl, userId, token }: { serverUrl: string; userId: string; token: string }) => {
    const jellyfin = new Jellyfin({
        clientInfo: {
            name: 'Jelly Music App',
            version: __VERSION__,
        },
        deviceInfo: {
            name: 'Web',
            id: deviceId,
        },
    })

    const parseItemDto = async (item: BaseItemDto) => {
        const isDownloaded = item.Id ? await window.audioStorage.hasTrack(item.Id) : false
        const downloadState = item.Id ? window.getDownloadState(item.Id) : undefined

        return {
            ...item,
            Id: item.Id || '',
            Name: item.Name || '',
            offlineState: downloadState || (isDownloaded ? 'downloaded' : undefined),
        } as MediaItem
    }

    const parseItemDtos = async (items: BaseItemDto[] | undefined) => {
        return (await Promise.all((items || []).map(parseItemDto))) as MediaItem[]
    }

    // Helper function to create fake MediaItem for custom containers
    const createCustomContainerMediaItem = async (customContainer: string, customContainerTitle?: string) => {
        const id = `JMA_CUSTOM_${customContainer.toUpperCase()}`

        return await parseItemDto({
            Id: id,
            Name: customContainerTitle || id,
        })
    }

    const api = jellyfin.createApi(serverUrl, token)

    const searchItems = async (searchTerm: string, limit = 40) => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                searchTerm,
                includeItemTypes: [BaseItemKind.MusicAlbum, BaseItemKind.Playlist, BaseItemKind.Audio],
                recursive: true,
                limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const searchArtists = async (searchTerm: string, limit = 20) => {
        const artistsApi = new ArtistsApi(api.configuration)
        const response = await artistsApi.getArtists(
            {
                userId,
                searchTerm,
                limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const searchAlbumsDetailed = async (searchTerm: string, limit = 50) => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                searchTerm,
                includeItemTypes: [BaseItemKind.MusicAlbum],
                recursive: true,
                limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const searchPlaylistsDetailed = async (searchTerm: string, limit = 50) => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                searchTerm,
                includeItemTypes: [BaseItemKind.Playlist],
                recursive: true,
                limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const searchGenres = async (searchTerm: string, limit = 20) => {
        const genresApi = new MusicGenresApi(api.configuration)
        const response = await genresApi.getMusicGenres(
            {
                userId,
                searchTerm,
                includeItemTypes: [BaseItemKind.Audio],
                limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const getRecentlyPlayed = async () => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                sortBy: [ItemSortBy.DatePlayed],
                sortOrder: [SortOrder.Descending],
                includeItemTypes: [BaseItemKind.Audio],
                recursive: true,
                limit: Math.min(12, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const getFrequentlyPlayed = async () => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                sortBy: [ItemSortBy.PlayCount],
                sortOrder: [SortOrder.Descending],
                includeItemTypes: [BaseItemKind.Audio],
                recursive: true,
                limit: Math.min(12, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const getRecentlyAdded = async () => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                sortBy: [ItemSortBy.DateCreated],
                sortOrder: [SortOrder.Descending],
                includeItemTypes: [BaseItemKind.MusicAlbum],
                recursive: true,
                limit: Math.min(12, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const getRecentGenres = async () => {
        const genresApi = new MusicGenresApi(api.configuration)
        const response = await genresApi.getMusicGenres(
            {
                userId,
                sortBy: [ItemSortBy.DateCreated],
                sortOrder: [SortOrder.Descending],
                includeItemTypes: [BaseItemKind.Audio],
                limit: Math.min(12, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const fetchRecentlyPlayed = async (
        startIndex: number,
        limit: number,
        sortBy: ItemSortBy[] = [ItemSortBy.DatePlayed],
        sortOrder: SortOrder[] = [SortOrder.Descending]
    ) => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                sortBy,
                sortOrder,
                includeItemTypes: [BaseItemKind.Audio],
                filters: [ItemFilter.IsPlayed],
                recursive: true,
                startIndex,
                limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const fetchFrequentlyPlayed = async (
        startIndex: number,
        limit: number,
        sortBy: ItemSortBy[] = [ItemSortBy.PlayCount],
        sortOrder: SortOrder[] = [SortOrder.Descending]
    ) => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                sortBy,
                sortOrder,
                includeItemTypes: [BaseItemKind.Audio],
                filters: [ItemFilter.IsPlayed],
                recursive: true,
                startIndex,
                limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const getAllAlbums = async (
        startIndex = 0,
        limit = 40,
        sortBy: ItemSortBy[] = [ItemSortBy.DateCreated],
        sortOrder: SortOrder[] = [SortOrder.Descending]
    ) => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                sortBy,
                sortOrder,
                includeItemTypes: [BaseItemKind.MusicAlbum],
                recursive: true,
                startIndex,
                limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const getAllArtists = async (
        startIndex = 0,
        limit = 40,
        sortBy: ItemSortBy[] = [ItemSortBy.DateCreated],
        sortOrder: SortOrder[] = [SortOrder.Descending]
    ) => {
        const artistsApi = new ArtistsApi(api.configuration)
        const response = await artistsApi.getArtists(
            {
                userId,
                sortBy,
                sortOrder,
                startIndex,
                limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const getAllAlbumArtists = async (
        startIndex = 0,
        limit = 40,
        sortBy: ItemSortBy[] = [ItemSortBy.DateCreated],
        sortOrder: SortOrder[] = [SortOrder.Descending]
    ) => {
        const artistsApi = new ArtistsApi(api.configuration)

        const response = await artistsApi.getAlbumArtists(
            {
                userId,
                sortBy,
                sortOrder,
                startIndex,
                limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )

        return await parseItemDtos(response.data.Items)
    }

    const getAllGenres = async (
        startIndex = 0,
        limit = 40,
        sortBy: ItemSortBy[] = [ItemSortBy.SortName],
        sortOrder: SortOrder[] = [SortOrder.Ascending]
    ) => {
        const genresApi = new MusicGenresApi(api.configuration)
        const response = await genresApi.getMusicGenres(
            {
                userId,
                sortBy,
                sortOrder,
                includeItemTypes: [BaseItemKind.Audio],
                startIndex,
                limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const getAllTracks = async (
        startIndex = 0,
        limit = 40,
        sortBy: ItemSortBy[] = [ItemSortBy.DateCreated],
        sortOrder: SortOrder[] = [SortOrder.Descending]
    ) => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                sortBy,
                sortOrder,
                includeItemTypes: [BaseItemKind.Audio],
                recursive: true,
                startIndex,
                limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const getInstantMixFromSong = async (songId: string) => {
        const itemsApi = new InstantMixApi(api.configuration)
        const response = await itemsApi.getInstantMixFromItem(
            {
                userId,
                itemId: songId,
                limit: JELLYFIN_MAX_LIMIT,
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const getFavoriteTracks = async (
        startIndex = 0,
        limit = 40,
        sortBy: ItemSortBy[] = [ItemSortBy.DateCreated],
        sortOrder: SortOrder[] = [SortOrder.Descending],
        itemKind: BaseItemKind = BaseItemKind.Audio
    ) => {
        if (itemKind === BaseItemKind.MusicArtist) {
            const artistsApi = new ArtistsApi(api.configuration)
            const response = await artistsApi.getArtists(
                {
                    userId,
                    isFavorite: true,
                    startIndex,
                    limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
                    sortBy,
                    sortOrder,
                },
                { signal: AbortSignal.timeout(20000) }
            )
            return await parseItemDtos(response.data.Items)
        }

        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                filters: [ItemFilter.IsFavorite],
                includeItemTypes: [itemKind],
                recursive: true,
                sortBy,
                sortOrder,
                startIndex,
                limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )

        const items = await parseItemDtos(response.data.Items)

        await syncDownloadsById('JMA_CUSTOM_FAVORITES', items)

        return items
    }

    const getAlbumDetails = async (albumId: string) => {
        const userLibraryApi = new UserLibraryApi(api.configuration)
        const itemsApi = new ItemsApi(api.configuration)

        const [albumResponse, tracksResponse] = await Promise.all([
            userLibraryApi.getItem(
                {
                    userId,
                    itemId: albumId,
                },
                { signal: AbortSignal.timeout(20000) }
            ),
            itemsApi.getItems(
                {
                    userId,
                    parentId: albumId,
                    includeItemTypes: [BaseItemKind.Audio],
                    sortBy: [ItemSortBy.IndexNumber],
                    sortOrder: [SortOrder.Ascending],
                    limit: JELLYFIN_MAX_LIMIT,
                },
                { signal: AbortSignal.timeout(20000) }
            ),
        ])

        const album = await parseItemDto(albumResponse.data)
        const tracks = await parseItemDtos(tracksResponse.data.Items)

        syncDownloads(album, tracks)

        return { album, tracks }
    }

    const getArtistDetails = async (artistId: string, trackLimit = 5) => {
        const userLibraryApi = new UserLibraryApi(api.configuration)
        const itemsApi = new ItemsApi(api.configuration)

        const [artistResponse, tracksResponse] = await Promise.all([
            userLibraryApi.getItem(
                {
                    userId,
                    itemId: artistId,
                },
                { signal: AbortSignal.timeout(20000) }
            ),
            itemsApi.getItems(
                {
                    userId,
                    artistIds: [artistId],
                    includeItemTypes: [BaseItemKind.Audio],
                    recursive: true,
                    sortBy: [ItemSortBy.PlayCount, ItemSortBy.SortName],
                    sortOrder: [SortOrder.Descending, SortOrder.Ascending],
                    limit: Math.min(trackLimit, JELLYFIN_MAX_LIMIT),
                },
                { signal: AbortSignal.timeout(20000) }
            ),
        ])

        const artist = await parseItemDto(artistResponse.data)
        const tracks = await parseItemDtos(tracksResponse.data.Items)

        syncDownloads(artist, tracks)

        return { artist, tracks }
    }

    const getArtistStats = async (artistId: string, artistName: string) => {
        const itemsApi = new ItemsApi(api.configuration)

        // Fetch total track count and playtime
        const [totalTracksResponse, fullTracksResponse, artistAlbumsResponse, contributingAlbumsResponse] =
            await Promise.all([
                itemsApi.getItems(
                    {
                        userId,
                        artistIds: [artistId],
                        includeItemTypes: [BaseItemKind.Audio],
                        recursive: true,
                        limit: 0, // No items, just metadata
                    },
                    { signal: AbortSignal.timeout(20000) }
                ),
                itemsApi.getItems(
                    {
                        userId,
                        artistIds: [artistId],
                        includeItemTypes: [BaseItemKind.Audio],
                        recursive: true,
                        limit: JELLYFIN_MAX_LIMIT,
                    },
                    { signal: AbortSignal.timeout(20000) }
                ),
                itemsApi.getItems(
                    {
                        userId,
                        artistIds: [artistId],
                        includeItemTypes: [BaseItemKind.MusicAlbum],
                        recursive: true,
                        sortBy: [ItemSortBy.PremiereDate, ItemSortBy.ProductionYear, ItemSortBy.SortName],
                        sortOrder: [SortOrder.Descending],
                        limit: JELLYFIN_MAX_LIMIT,
                    },
                    { signal: AbortSignal.timeout(20000) }
                ),
                itemsApi.getItems(
                    {
                        userId,
                        contributingArtistIds: [artistId],
                        includeItemTypes: [BaseItemKind.MusicAlbum],
                        recursive: true,
                        sortBy: [ItemSortBy.PremiereDate, ItemSortBy.ProductionYear, ItemSortBy.SortName],
                        sortOrder: [SortOrder.Descending],
                        limit: JELLYFIN_MAX_LIMIT,
                    },
                    { signal: AbortSignal.timeout(20000) }
                ),
            ])

        const totalTrackCount = totalTracksResponse.data.TotalRecordCount || 0
        const totalPlaytime = (await parseItemDtos(fullTracksResponse.data.Items)).reduce(
            (sum, track) => sum + (track.RunTimeTicks || 0),
            0
        )

        const artistAlbums = await parseItemDtos(artistAlbumsResponse.data.Items)
        const contributingAlbums = await parseItemDtos(contributingAlbumsResponse.data.Items)

        // Deduplicate albums
        const allAlbumsMap = new Map<string, MediaItem>()
        artistAlbums.forEach(album => allAlbumsMap.set(album.Id, album))
        contributingAlbums.forEach(album => allAlbumsMap.set(album.Id, album))
        const allAlbums = Array.from(allAlbumsMap.values())

        // Split into albums and appearsInAlbums
        const albums: MediaItem[] = []
        const appearsInAlbums: MediaItem[] = []
        allAlbums.forEach(album => {
            const primaryAlbumArtist = album.AlbumArtists?.[0]?.Name || album.AlbumArtist || 'Unknown Artist'
            if (primaryAlbumArtist === artistName) {
                albums.push(album)
            } else {
                appearsInAlbums.push(album)
            }
        })

        const totalAlbumCount = albums.length + appearsInAlbums.length

        return { albums, appearsInAlbums, totalTrackCount, totalPlaytime, totalAlbumCount }
    }

    const getArtistTracks = async (
        artistId: string,
        startIndex = 0,
        limit = 40,
        sortBy: ItemSortBy[] = [ItemSortBy.PlayCount, ItemSortBy.SortName],
        sortOrder: SortOrder[] = [SortOrder.Descending, SortOrder.Ascending]
    ) => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                artistIds: [artistId],
                includeItemTypes: [BaseItemKind.Audio],
                sortBy,
                sortOrder,
                recursive: true,
                startIndex,
                limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return {
            Items: await parseItemDtos(response.data.Items),
            TotalRecordCount: response.data.TotalRecordCount || 0,
        }
    }

    const getPlaylistsFeaturingArtist = async (artistId: string) => {
        const itemsApi = new ItemsApi(api.configuration)
        const playlistsResponse = await itemsApi.getItems(
            {
                userId,
                includeItemTypes: [BaseItemKind.Playlist],
                recursive: true,
                limit: JELLYFIN_MAX_LIMIT,
            },
            { signal: AbortSignal.timeout(20000) }
        )
        const playlists = await parseItemDtos(playlistsResponse.data.Items)

        const playlistsWithArtist: MediaItem[] = []
        const batchSize = 5

        if (playlists?.length) {
            for (let i = 0; i < playlists.length; i += batchSize) {
                const batch = playlists.slice(i, i + batchSize)
                const batchPromises = batch.map(async playlist => {
                    let startIndex = 0
                    const limit = 100
                    while (true) {
                        const tracksResponse = await itemsApi.getItems(
                            {
                                userId,
                                parentId: playlist.Id,
                                includeItemTypes: [BaseItemKind.Audio],
                                startIndex,
                                limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
                            },
                            { signal: AbortSignal.timeout(20000) }
                        )
                        const tracks = await parseItemDtos(tracksResponse.data.Items)
                        const hasArtist = tracks.some(track => track.ArtistItems?.some(a => a.Id === artistId))
                        if (hasArtist) {
                            return playlist
                        }
                        if (startIndex + limit >= (tracksResponse.data.TotalRecordCount || 0)) {
                            break
                        }
                        startIndex += limit
                    }
                    return null
                })
                const results = await Promise.all(batchPromises)
                playlistsWithArtist.push(...results.filter((result): result is MediaItem => result !== null))
            }
        }

        return playlistsWithArtist
    }

    const getGenreTracks = async (
        genre: string,
        startIndex = 0,
        limit = 40,
        sortBy: ItemSortBy[] = [ItemSortBy.DateCreated],
        sortOrder: SortOrder[] = [SortOrder.Descending]
    ) => {
        const itemsApi = new ItemsApi(api.configuration)
        const [genreResponse, genresResponse] = await Promise.all([
            getGenreByName(genre),
            itemsApi.getItems(
                {
                    userId,
                    sortBy,
                    sortOrder,
                    includeItemTypes: [BaseItemKind.Audio],
                    recursive: true,
                    genres: [genre],
                    startIndex,
                    limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
                },
                { signal: AbortSignal.timeout(20000) }
            ),
        ])

        const items = await parseItemDtos(genresResponse.data.Items)

        syncDownloads(genreResponse, items)

        return items
    }

    const getPlaylist = async (playlistId: string) => {
        const userLibraryApi = new UserLibraryApi(api.configuration)
        const response = await userLibraryApi.getItem(
            {
                userId,
                itemId: playlistId,
            },
            { signal: AbortSignal.timeout(20000) }
        )

        return await parseItemDto(response.data)
    }

    const getPlaylistTotals = async (playlistId: string) => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                parentId: playlistId,
                includeItemTypes: [BaseItemKind.Audio],
                recursive: true,
                limit: 0, // No items, just metadata
            },
            { signal: AbortSignal.timeout(20000) }
        )
        const totalTrackCount = response.data.TotalRecordCount || 0

        // Fetch total playtime (requires items for RunTimeTicks)
        let totalPlaytime = 0
        let totalPlays = 0

        if (totalTrackCount > 0) {
            const fullResponse = await itemsApi.getItems(
                {
                    userId,
                    parentId: playlistId,
                    includeItemTypes: [BaseItemKind.Audio],
                    recursive: true,
                    limit: JELLYFIN_MAX_LIMIT,
                },
                { signal: AbortSignal.timeout(20000) }
            )

            const parsedItems = await parseItemDtos(fullResponse.data.Items)

            totalPlaytime = parsedItems.reduce((sum, track) => sum + (track.RunTimeTicks || 0), 0)
            totalPlays = parsedItems.reduce((sum, track) => sum + (track.UserData?.PlayCount || 0), 0)
        }

        return { totalTrackCount, totalPlaytime, totalPlays }
    }

    const getFavoritesTotals = async (itemKind: BaseItemKind = BaseItemKind.Audio) => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                filters: [ItemFilter.IsFavorite],
                includeItemTypes: [itemKind],
                recursive: true,
                limit: 0, // No items, just metadata
            },
            { signal: AbortSignal.timeout(20000) }
        )
        const totalTrackCount = response.data.TotalRecordCount || 0

        // Fetch total playtime and plays (requires items for RunTimeTicks and PlayCount)
        let totalPlaytime = 0
        let totalPlays = 0

        if (totalTrackCount > 0) {
            const fullResponse = await itemsApi.getItems(
                {
                    userId,
                    filters: [ItemFilter.IsFavorite],
                    includeItemTypes: [itemKind],
                    recursive: true,
                    limit: JELLYFIN_MAX_LIMIT,
                },
                { signal: AbortSignal.timeout(20000) }
            )

            const parsedItems = await parseItemDtos(fullResponse.data.Items)

            totalPlaytime = parsedItems.reduce((sum, track) => sum + (track.RunTimeTicks || 0), 0)
            totalPlays = parsedItems.reduce((sum, track) => sum + (track.UserData?.PlayCount || 0), 0)
        }

        return { totalTrackCount, totalPlaytime, totalPlays }
    }

    const getGenreTotals = async (genre: string) => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                includeItemTypes: [BaseItemKind.Audio],
                recursive: true,
                genres: [genre],
                limit: 0, // No items, just metadata
            },
            { signal: AbortSignal.timeout(20000) }
        )
        const totalTrackCount = response.data.TotalRecordCount || 0

        // Fetch total playtime (requires items for RunTimeTicks)
        let totalPlaytime = 0
        let totalPlays = 0

        if (totalTrackCount > 0) {
            const fullResponse = await itemsApi.getItems(
                {
                    userId,
                    includeItemTypes: [BaseItemKind.Audio],
                    recursive: true,
                    genres: [genre],
                    limit: JELLYFIN_MAX_LIMIT,
                },
                { signal: AbortSignal.timeout(20000) }
            )

            const parsedItems = await parseItemDtos(fullResponse.data.Items)

            totalPlaytime = parsedItems.reduce((sum, track) => sum + (track.RunTimeTicks || 0), 0)
            totalPlays = parsedItems.reduce((sum, track) => sum + (track.UserData?.PlayCount || 0), 0)
        }

        return { totalTrackCount, totalPlaytime, totalPlays }
    }

    // Same as getPlaylistTotals but returns all tracks instead of just metadata, yes its not very efficient but it be what it be
    const getPlaylistAllTracks = async (playlistId: string) => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                parentId: playlistId,
                includeItemTypes: [BaseItemKind.Audio],
                sortBy: [ItemSortBy.DateCreated],
                sortOrder: [SortOrder.Descending],
                recursive: true,
                limit: JELLYFIN_MAX_LIMIT,
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const getPlaylistTracks = async (
        playlistId: string,
        startIndex = 0,
        limit = 40,
        sortBy: 'Inherit' | ItemSortBy[] = [ItemSortBy.DateCreated],
        sortOrder: SortOrder[] = [SortOrder.Descending]
    ) => {
        const itemsApi = new ItemsApi(api.configuration)
        const playlistsApi = new PlaylistsApi(api.configuration)

        const response =
            sortBy === 'Inherit'
                ? await playlistsApi.getPlaylistItems(
                      {
                          userId,
                          playlistId,
                          startIndex,
                          limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
                      },
                      { signal: AbortSignal.timeout(20000) }
                  )
                : await itemsApi.getItems(
                      {
                          userId,
                          parentId: playlistId,
                          includeItemTypes: [BaseItemKind.Audio],
                          sortBy,
                          sortOrder,
                          startIndex,
                          limit: Math.min(limit, JELLYFIN_MAX_LIMIT),
                      },
                      { signal: AbortSignal.timeout(20000) }
                  )

        const items = await parseItemDtos(response.data.Items)

        await syncDownloadsById(playlistId, items)

        return items
    }

    const getAllPlaylists = async () => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                sortBy: [ItemSortBy.SortName],
                sortOrder: [SortOrder.Ascending],
                userId,
                includeItemTypes: [BaseItemKind.Playlist],
                recursive: true,
                limit: JELLYFIN_MAX_LIMIT,
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const getTrackLyrics = async (trackId: string) => {
        const lyricsApi = new LyricsApi(api.configuration)
        const response = await lyricsApi.getLyrics({
            itemId: trackId,
        })

        return response.data
    }

    const fetchAllTracks = async (artistId: string) => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems(
            {
                userId,
                artistIds: [artistId],
                includeItemTypes: [BaseItemKind.Audio],
                recursive: true,
                limit: JELLYFIN_MAX_LIMIT,
            },
            { signal: AbortSignal.timeout(20000) }
        )
        return await parseItemDtos(response.data.Items)
    }

    const fetchUserInfo = async () => {
        const usersApi = new UserApi(api.configuration)
        const response = await usersApi.getUserById({ userId })
        return response.data
    }

    const fetchClientIp = async () => {
        const sessionsApi = new SessionApi(api.configuration)
        const response = await sessionsApi.getSessions({})
        const sessions = response.data
        return sessions.find(s => s.UserId === userId)?.RemoteEndPoint || null
    }

    const measureLatency = async () => {
        const startTime = performance.now()
        const systemApi = new SystemApi(api.configuration)
        await systemApi.getPingSystem({})
        return Math.round(performance.now() - startTime)
    }

    const fetchServerInfo = async () => {
        const systemApi = new SystemApi(api.configuration)
        const response = await systemApi.getSystemInfo()
        return response.data
    }

    const fetchPlayCount = async () => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems({
            userId,
            recursive: true,
            includeItemTypes: [BaseItemKind.Audio],
            filters: [ItemFilter.IsPlayed],
            limit: JELLYFIN_MAX_LIMIT,
        })
        return response.data.TotalRecordCount || null
    }

    const fetchSongs = async (query: string) => {
        const itemsApi = new ItemsApi(api.configuration)
        const response = await itemsApi.getItems({
            userId,
            searchTerm: query,
            includeItemTypes: [BaseItemKind.Audio],
            recursive: true,
            limit: Math.min(80, JELLYFIN_MAX_LIMIT),
        })
        return await parseItemDtos(response.data.Items)
    }

    const reportPlaybackStart = async (trackId: string, signal: AbortSignal) => {
        const sessionsApi = new PlaystateApi(api.configuration)
        await sessionsApi.reportPlaybackStart(
            {
                playbackStartInfo: {
                    ItemId: trackId,
                    PlayMethod: PlayMethod.DirectStream,
                    PositionTicks: 0,
                    IsPaused: false,
                    CanSeek: true,
                    MediaSourceId: trackId,
                    AudioStreamIndex: 1,
                },
            },
            { signal }
        )
    }

    let lastProgress = new AbortController()

    const reportPlaybackProgress = async (trackId: string, position: number, isPaused: boolean) => {
        if (lastProgress) {
            lastProgress.abort()
            lastProgress = new AbortController()
        }

        const sessionsApi = new PlaystateApi(api.configuration)
        await sessionsApi.reportPlaybackProgress(
            {
                playbackProgressInfo: {
                    ItemId: trackId,
                    PositionTicks: Math.floor(position * 10000000),
                    IsPaused: isPaused,
                    PlayMethod: PlayMethod.DirectStream,
                    MediaSourceId: trackId,
                    AudioStreamIndex: 1,
                },
            },
            { signal: lastProgress.signal }
        )
    }

    const reportPlaybackStopped = async (trackId: string, position: number, signal?: AbortSignal) => {
        const sessionsApi = new PlaystateApi(api.configuration)
        await sessionsApi.reportPlaybackStopped(
            {
                playbackStopInfo: {
                    ItemId: trackId,
                    PositionTicks: Math.floor(position * 10000000),
                    MediaSourceId: trackId,
                },
            },
            { signal }
        )
    }

    const getImageUrl = (item: MediaItem, type: 'Primary' | 'Backdrop', size: { width: number; height: number }) => {
        if (item.ImageTags?.[type]) {
            return `${serverUrl}/Items/${item.Id}/Images/${type}?tag=${item.ImageTags[type]}&quality=100&fillWidth=${size.width}&fillHeight=${size.height}&format=webp&api_key=${token}`
        }

        if (item.AlbumId) {
            return `${serverUrl}/Items/${item.AlbumId}/Images/${type}?quality=100&fillWidth=${size.width}&fillHeight=${size.height}&format=webp&api_key=${token}`
        }

        return undefined
    }

    const getStreamUrl = (trackId: string, bitrate: number) => {
        return `${serverUrl}/Audio/${trackId}/universal?UserId=${userId}&api_key=${token}&Container=opus,webm|opus,mp3,aac,m4a|aac,m4a|alac,m4b|aac,flac,webma,webm|webma,wav,ogg&TranscodingContainer=ts&TranscodingProtocol=hls&AudioCodec=aac&MaxStreamingBitrate=${
            bitrate || 140000000
        }&StartTimeTicks=0&EnableRedirection=true&EnableRemoteMedia=false`
    }

    const addToFavorites = async (item: MediaItem) => {
        const userLibraryApi = new UserLibraryApi(api.configuration)

        const r = await userLibraryApi.markFavoriteItem(
            { itemId: item.Id, userId },
            { signal: AbortSignal.timeout(20000) }
        )

        await syncDownloadsById('JMA_CUSTOM_FAVORITES', [item])

        return r
    }

    const removeFromFavorites = async (item: MediaItem) => {
        const userLibraryApi = new UserLibraryApi(api.configuration)

        const r = await userLibraryApi.unmarkFavoriteItem(
            { itemId: item.Id, userId },
            { signal: AbortSignal.timeout(20000) }
        )

        await unsyncDownloadsById('JMA_CUSTOM_FAVORITES', [item])

        return r
    }

    const addToPlaylist = async (playlistId: string, items: MediaItem[]) => {
        const playlistApi = new PlaylistsApi(api.configuration)
        const batchSize = 200

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize)
            await playlistApi.addItemToPlaylist(
                {
                    userId,
                    playlistId,
                    ids: batch.map(item => item.Id),
                },
                { signal: AbortSignal.timeout(20000) }
            )
        }

        await syncDownloadsById(playlistId, items)

        return true
    }

    const removeFromPlaylist = async (playlistId: string, item: MediaItem) => {
        const playlistApi = new PlaylistsApi(api.configuration)

        const response = await playlistApi.removeItemFromPlaylist(
            {
                playlistId,
                entryIds: [item.Id],
            },
            { signal: AbortSignal.timeout(20000) }
        )

        await unsyncDownloadsById(playlistId, [item])

        return response.data
    }

    const createPlaylist = async (name: string) => {
        const playlistApi = new PlaylistsApi(api.configuration)

        const response = await playlistApi.createPlaylist(
            {
                // Seems to be bugged, need to pass both
                createPlaylistDto: {
                    Name: name,
                    IsPublic: false,
                },
                name,
            },
            { signal: AbortSignal.timeout(20000) }
        )

        return response.data
    }

    const renamePlaylist = async (playlistId: string, newName: string) => {
        const playlistApi = new PlaylistsApi(api.configuration)

        const response = await playlistApi.updatePlaylist({
            playlistId,
            // Seems to be bugged, need to pass both
            updatePlaylistDto: {
                Name: newName,
                IsPublic: false,
            },
        })

        return response.data
    }

    const deletePlaylist = async (playlistId: string) => {
        const response = await fetch(`${serverUrl}/Items/${playlistId}`, {
            method: 'DELETE',
            headers: {
                'X-Emby-Authorization': `MediaBrowser Client="Jelly Music App", Device="Web", DeviceId="${deviceId}", Version="${__VERSION__}"`,
                'Content-Type': 'application/json',
                'X-Emby-Token': token,
            },
            signal: AbortSignal.timeout(20000),
        })

        if (!response.ok) {
            throw new ApiError(`HTTP error! status: ${response.status}`, response)
        }

        return response.ok
    }

    const getTrackInfo = async (trackId: string) => {
        const mediaInfoApi = new MediaInfoApi(api.configuration)
        const response = await mediaInfoApi.getPlaybackInfo(
            {
                userId,
                itemId: trackId,
            },
            { signal: AbortSignal.timeout(20000) }
        )

        return response.data
    }

    const getMediaItem = async (itemId: string) => {
        const userLibraryApi = new UserLibraryApi(api.configuration)
        const response = await userLibraryApi.getItem(
            {
                userId,
                itemId,
            },
            { signal: AbortSignal.timeout(20000) }
        )

        return parseItemDto(response.data)
    }

    const getGenreByName = async (genreName: string) => {
        const genresApi = new MusicGenresApi(api.configuration)

        try {
            const response = await genresApi.getMusicGenre(
                {
                    userId,
                    genreName,
                },
                { signal: AbortSignal.timeout(20000) }
            )
            if (response.data) {
                return await parseItemDto(response.data)
            }
        } catch (error) {
            console.error('Failed to get genre by name, trying search fallback:', error)
        }

        // Fallback to searchGenres
        const genres = await searchGenres(genreName, 1)

        if (genres.length > 0) {
            return genres[0]
        }

        throw new Error(`Genre "${genreName}" not found`)
    }

    return {
        loginToJellyfin,
        searchItems,
        searchArtists,
        searchAlbumsDetailed,
        searchPlaylistsDetailed,
        searchGenres,
        getRecentlyPlayed,
        getFrequentlyPlayed,
        getRecentlyAdded,
        getAllAlbums,
        getAllArtists,
        getAllAlbumArtists,
        getAllGenres,
        getAllTracks,
        getFavoriteTracks,
        getFavoritesTotals,
        getAlbumDetails,
        getArtistDetails,
        getArtistStats,
        getArtistTracks,
        getPlaylistsFeaturingArtist,
        getGenreTracks,
        getGenreTotals,
        getPlaylist,
        getPlaylistTotals,
        getPlaylistAllTracks,
        getPlaylistTracks,
        getAllPlaylists,
        getTrackLyrics,
        fetchAllTracks,
        fetchRecentlyPlayed,
        fetchFrequentlyPlayed,
        fetchUserInfo,
        fetchClientIp,
        measureLatency,
        fetchServerInfo,
        fetchPlayCount,
        fetchSongs,
        reportPlaybackStart,
        reportPlaybackProgress,
        reportPlaybackStopped,
        getImageUrl,
        getStreamUrl,
        addToFavorites,
        removeFromFavorites,
        getInstantMixFromSong,
        addToPlaylist,
        removeFromPlaylist,
        createPlaylist,
        renamePlaylist,
        deletePlaylist,
        getTrackInfo,
        getMediaItem,
        createCustomContainerMediaItem,
        getRecentGenres,
        getGenreByName,
    }
}
