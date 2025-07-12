import { createContext, useContext } from 'react'
import { IFilterContext } from './FilterContextProvider'

export const FilterContext = createContext<IFilterContext>({} as IFilterContext)

export const useFilterContext = () => useContext(FilterContext)

export enum SortState {
    Added = 'Added',
    Released = 'Released',
    Runtime = 'Runtime',
    Random = 'Random',
    Name = 'Name',
    None = '',
    Inherit = 'Inherit',
}

export enum OrderState {
    Ascending = 'Ascending',
    Descending = 'Descending',
    None = '',
}

export enum KindState {
    Tracks = 'Tracks',
    Albums = 'Albums',
    Artists = 'Artists',
    None = '',
}

export const initialSortMap: Record<string, SortState> = {
    '/tracks': SortState.Added,
    '/albums': SortState.Added,
    '/genre': SortState.Added,
    '/favorites': SortState.Added,
}

export const isValidSortValue = (val: string): val is SortState => {
    return Object.values(SortState)
        .map(v => v.toLowerCase())
        .includes(val.toLowerCase())
}

export const isValidOrderValue = (val: string): val is OrderState => {
    return Object.values(OrderState)
        .map(v => v.toLowerCase())
        .includes(val.toLowerCase())
}

export const isValidKindValue = (val: string): val is KindState => {
    return Object.values(KindState)
        .map(v => v.toLowerCase())
        .includes(val.toLowerCase())
}

export type FilterState = {
    sort: string
    order: string
    kind: string
}

export const getSavedFilter = (path: string) => {
    const rememberFilters = localStorage.getItem('ui.remember-filters') === 'on'
    if (!rememberFilters) return

    const saved = localStorage.getItem(`ui.remember-filters.${path}`)
    if (!saved) return

    try {
        const parsed = JSON.parse(saved)

        return {
            sort: isValidSortValue(parsed.sort) ? parsed.sort : '',
            order: isValidOrderValue(parsed.order) ? parsed.order : '',
            kind: isValidKindValue(parsed.kind) ? parsed.kind : '',
        } as FilterState
    } catch (e) {
        console.error('Failed to parse saved filter:', e)
        return
    }
}

export const getSavedFilterPath = (path: string) => {
    return path.split('/').slice(0, 2).join('/')
}

export const buildUrlWithSavedFilters = (path: string) => {
    const savedFilterPath = getSavedFilterPath(path)
    const savedFilter = getSavedFilter(savedFilterPath)
    if (!savedFilter) return path

    const params = new URLSearchParams()
    const pathFallback = initialSortMap[path] || SortState.None
    const orderFallback =
        pathFallback === SortState.Added || pathFallback === SortState.None
            ? OrderState.Descending
            : OrderState.Ascending
    const kindFallback = KindState.Tracks

    if (pathFallback !== savedFilter.sort && savedFilter.sort) {
        params.set('sort', savedFilter.sort)
    }

    if (orderFallback !== savedFilter.order && savedFilter.order) {
        params.set('order', savedFilter.order)
    }

    if (kindFallback !== savedFilter.kind && savedFilter.kind) {
        params.set('kind', savedFilter.kind)
    }

    const queryString = params.toString()
    return queryString ? `${path}?${queryString}` : path
}
