import { BaseItemKind, ItemSortBy, SortOrder } from '@jellyfin/sdk/lib/generated-client'
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { FilterContext } from './FilterContext'

export type IFilterContext = ReturnType<typeof useInitialState>

enum SortState {
    Added = 'Added',
    Released = 'Released',
    Runtime = 'Runtime',
    Random = 'Random',
    Name = 'Name',
    None = '',
}

enum OrderState {
    Ascending = 'Ascending',
    Descending = 'Descending',
    None = '',
}

enum KindState {
    Tracks = 'Tracks',
    Albums = 'Albums',
    Artists = 'Artists',
    None = '',
}

const initialSortMap: Record<string, SortState> = {
    '/tracks': SortState.Added,
    '/albums': SortState.Added,
    '/genre': SortState.Added,
    '/favorites': SortState.Added,
}

const isValidSortValue = (val: string): val is SortState => {
    return Object.values(SortState)
        .map(v => v.toLowerCase())
        .includes(val.toLowerCase())
}

const isValidOrderValue = (val: string): val is OrderState => {
    return Object.values(OrderState)
        .map(v => v.toLowerCase())
        .includes(val.toLowerCase())
}

const isValidKindValue = (val: string): val is KindState => {
    return Object.values(KindState)
        .map(v => v.toLowerCase())
        .includes(val.toLowerCase())
}

type FilterState = {
    sort: string
    order: string
    kind: string
}

const useInitialState = () => {
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()
    const querySort = searchParams.get('sort')
    const queryOrder = searchParams.get('order')
    const queryKind = searchParams.get('kind')

    const filterFromQuery =
        querySort && isValidSortValue(querySort)
            ? (Object.values(SortState).find(v => v.toLowerCase() === querySort.toLowerCase()) as SortState)
            : null

    const orderFromQuery =
        queryOrder && isValidOrderValue(queryOrder)
            ? (Object.values(OrderState).find(v => v.toLowerCase() === queryOrder.toLowerCase()) as OrderState)
            : null

    const kindFromQuery =
        queryKind && isValidKindValue(queryKind)
            ? (Object.values(KindState).find(v => v.toLowerCase() === queryKind.toLowerCase()) as KindState)
            : null

    const pathFallback = initialSortMap[location.pathname] || SortState.None

    const orderFallback =
        pathFallback === SortState.Added || pathFallback === SortState.None
            ? OrderState.Descending
            : OrderState.Ascending

    const kindFallback = KindState.Tracks

    const [filter, _setFilter] = useState<FilterState>({
        sort: (filterFromQuery || pathFallback) as SortState,
        order: (orderFromQuery || orderFallback) as OrderState,
        kind: (kindFromQuery || kindFallback) as KindState,
    })

    const setFilter = useCallback(
        (updater: (prev: FilterState) => FilterState) => {
            const newState = updater(filter)

            const params = new URLSearchParams()

            if (initialSortMap[location.pathname] !== newState.sort && newState.sort) {
                params.set('sort', newState.sort)
            }

            if (orderFallback !== newState.order && newState.order) {
                params.set('order', newState.order)
            }

            if (kindFallback !== newState.kind && newState.kind) {
                params.set('kind', newState.kind)
            }

            setSearchParams(params)
            _setFilter(newState)
        },
        [filter, location.pathname, orderFallback, setSearchParams, kindFallback]
    )

    useEffect(() => {
        const currentSort = searchParams.get('sort') || pathFallback
        const currentOrder = searchParams.get('order') || orderFallback
        const currentKind = searchParams.get('kind') || kindFallback

        _setFilter({
            sort: isValidSortValue(currentSort) ? (currentSort as SortState) : SortState.None,
            order: isValidOrderValue(currentOrder) ? (currentOrder as OrderState) : OrderState.None,
            kind: isValidKindValue(currentKind) ? (currentKind as KindState) : KindState.None,
        })
    }, [searchParams, pathFallback, orderFallback, kindFallback])

    const jellySort = useMemo(() => {
        let newSortBy: ItemSortBy[]

        switch (filter.sort) {
            case SortState.Added:
                newSortBy = [ItemSortBy.DateCreated]
                break
            case SortState.Released:
                newSortBy = [ItemSortBy.PremiereDate]
                break
            case SortState.Runtime:
                newSortBy = [ItemSortBy.Runtime]
                break
            case SortState.Random:
                newSortBy = [ItemSortBy.Random]
                break
            case SortState.Name:
                newSortBy = [ItemSortBy.Name]
                break
            default:
                newSortBy = [ItemSortBy.DateCreated]
        }

        const newSortOrder = filter.order === OrderState.Ascending ? [SortOrder.Ascending] : [SortOrder.Descending]

        return { sortBy: newSortBy, sortOrder: newSortOrder }
    }, [filter.order, filter.sort])

    const jellyItemKind = useMemo(() => {
        switch (filter.kind) {
            case KindState.Artists:
                return BaseItemKind.MusicArtist
            case KindState.Albums:
                return BaseItemKind.MusicAlbum
            default:
                return BaseItemKind.Audio
        }
    }, [filter.kind])

    return {
        filter,
        setFilter,
        jellySort,
        jellyItemKind,
    }
}

export const FilterContextProvider = ({ children }: { children: ReactNode }) => {
    const initialState = useInitialState()

    return <FilterContext.Provider value={initialState}>{children}</FilterContext.Provider>
}
