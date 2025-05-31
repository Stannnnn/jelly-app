import { Location } from 'react-router-dom'

export const getPageTitle = (pageTitle: string, location: Location): string => {
    // Return pageTitle if set (e.g., by SearchResults), otherwise fallback to defaults
    if (pageTitle) return pageTitle

    if (location.pathname.startsWith('/album/')) return 'Album'
    if (location.pathname.startsWith('/artist/')) {
        if (location.pathname.includes('/tracks')) return 'Tracks'
        return 'Artist'
    }
    if (location.pathname.startsWith('/genre/')) return 'Genre'
    if (location.pathname.startsWith('/playlist/')) return 'Playlist'
    if (location.pathname.startsWith('/search/')) {
        const query = decodeURIComponent(location.pathname.split('/search/')[1])
        return `Search results for '${query}'`
    }

    switch (location.pathname) {
        case '/':
            return 'Home'
        case '/tracks':
            return 'Tracks'
        case '/albums':
            return 'Albums'
        case '/artists':
            return 'Artists'
        case '/favorites':
            return 'Favorites'
        case '/settings':
            return 'Settings'
        case '/downloads':
            return 'Downloads'
        case '/recently':
            return 'Recently Played'
        case '/frequently':
            return 'Frequently Played'
        default:
            return 'Home'
    }
}
