import { InfiniteData, Query, useQueryClient } from '@tanstack/react-query'
import { MediaItem } from '../api/jellyfin'

const isPages = (data: object): data is InfiniteData<MediaItem[], unknown> => {
    return 'pages' in data && !!data.pages
}

export const isMediaItem = (data: object): data is MediaItem => {
    return 'Id' in data && !!data.Id
}

const isObject = (data: unknown): data is { [x: string]: unknown } => {
    return typeof data === 'object'
}

const patchData = (data: unknown, itemIds: string[], patch: IPatch): unknown => {
    if (!data) return data

    if (Array.isArray(data)) {
        return data.map(item => patchData(item, itemIds, patch))
    }

    if (isObject(data)) {
        if (isMediaItem(data) && itemIds.includes(data.Id)) {
            return patch(data)
        }

        if (isPages(data)) {
            return {
                ...data,
                pages: data.pages.map(page => patchData(page, itemIds, patch)),
            }
        }

        // Fallback for objects that are not MediaItem or InfiniteData, e.g. album data
        const newData: { [x: string]: unknown } = {}

        for (const key in data) {
            newData[key] = patchData(data[key], itemIds, patch)
        }

        return newData
    }

    return data
}

type IPatch = (item: MediaItem) => MediaItem

export const usePatchQueries = () => {
    const queryClient = useQueryClient()

    const setQueryData = (query: Query<unknown, Error, unknown, readonly unknown[]>, patch: (data: object) => void) => {
        const data = query.state.data

        if (!data) return

        // If the query is currently fetching, wait until it finishes before patching to avoid overwriting with stale server data
        if (query.state.fetchStatus === 'fetching') {
            console.warn(`Query "${query.queryKey}" is currently fetching, patch will be applied after it finishes`)

            query.promise?.then(freshData => {
                if (!freshData) return
                patch(freshData)
            })

            return
        }

        patch(data)
    }

    const patchMediaItems = (mediaItemIds: string[], patch: IPatch) => {
        const allQueries = queryClient.getQueryCache().findAll()

        for (const query of allQueries) {
            setQueryData(query, data => {
                query.setData(patchData(data, mediaItemIds, patch))
            })
        }
    }

    return {
        patchMediaItem: (mediaItemId: string, patch: IPatch) => {
            return patchMediaItems([mediaItemId], patch)
        },
        patchMediaItems,
        prependItemsToQueryData: (queryKey: string[], items: MediaItem[]) => {
            const allQueries = queryClient.getQueryCache().findAll()

            for (const query of allQueries) {
                // check if the query.queryKey starts with the queryKey
                if (query.queryKey.slice(0, queryKey.length).join(',') !== queryKey.join(',')) continue

                setQueryData(query, data => {
                    if (isPages(data)) {
                        const [first, ...pages] = data.pages

                        query.setData({
                            ...data,
                            pages: [[...items, ...first], ...pages],
                        })
                    } else {
                        query.setData([...items, ...(data as MediaItem[])])
                    }
                })
            }
        },
        removeItemFromQueryData: (queryKey: string[], itemId: string) => {
            const allQueries = queryClient.getQueryCache().findAll()

            for (const query of allQueries) {
                // check if the query.queryKey starts with the queryKey
                if (query.queryKey.slice(0, queryKey.length).join(',') !== queryKey.join(',')) continue

                setQueryData(query, data => {
                    if (isPages(data)) {
                        query.setData({
                            ...data,
                            pages: data.pages.map(page => page.filter((item: MediaItem) => item.Id !== itemId)),
                        })
                    } else {
                        query.setData((data as MediaItem[]).filter(item => item.Id !== itemId))
                    }
                })
            }
        },
    }
}
