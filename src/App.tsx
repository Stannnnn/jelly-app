import '@fontsource-variable/inter'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import './App.css'
import { Dropdown } from './components/Dropdown'
import { Main } from './components/Main'
import './components/MediaList.css'
import { Sidenav } from './components/Sidenav'
import { AudioStorageContextProvider } from './context/AudioStorageContext/AudioStorageContextProvider'
import { useDropdownContext } from './context/DropdownContext/DropdownContext'
import { DropdownContextProvider } from './context/DropdownContext/DropdownContextProvider'
import { HistoryContextProvider } from './context/HistoryContext/HistoryContextProvider'
import { JellyfinContextProvider } from './context/JellyfinContext/JellyfinContextProvider'
import { PageTitleProvider } from './context/PageTitleContext/PageTitleProvider'
import { PlaybackContextProvider } from './context/PlaybackContext/PlaybackContextProvider'
import { ScrollContextProvider } from './context/ScrollContext/ScrollContextProvider'
import { useSidenavContext } from './context/SidenavContext/SidenavContext'
import { SidenavContextProvider } from './context/SidenavContext/SidenavContextProvider'
import { ThemeContextProvider } from './context/ThemeContext/ThemeContextProvider'
import { useDocumentTitle } from './hooks/useDocumentTitle'
import { Album } from './pages/Album'
import { Albums } from './pages/Albums'
import { Artist } from './pages/Artist'
import { Artists } from './pages/Artists'
import { ArtistTracks } from './pages/ArtistTracks'
import { Downloads } from './pages/Downloads'
import { Favorites } from './pages/Favorites'
import { FrequentlyPlayed } from './pages/FrequentlyPlayed'
import { Genre } from './pages/Genre'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Playlist } from './pages/Playlist'
import { Queue } from './pages/Queue'
import { RecentlyPlayed } from './pages/RecentlyPlayed'
import { SearchResults } from './pages/SearchResults'
import { Settings } from './pages/Settings'
import { Tracks } from './pages/Tracks'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
        },
    },
})

const persister = createSyncStoragePersister({
    storage: window.localStorage,
})

export const App = () => {
    return (
        <>
            {window.__NPM_LIFECYCLE_EVENT__ === 'dev:nocache' ? (
                <QueryClientProvider client={queryClient}>
                    <RoutedApp />
                </QueryClientProvider>
            ) : (
                <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
                    <RoutedApp />
                </PersistQueryClientProvider>
            )}
        </>
    )
}

const RoutedApp = () => {
    const [auth, setAuth] = useState<AuthData | null>(() => {
        const savedAuth = localStorage.getItem('auth')
        return savedAuth ? JSON.parse(savedAuth) : null
    })
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const queryClient = useQueryClient()

    const handleLogin = (authData: AuthData) => {
        setAuth(authData)
        localStorage.setItem('auth', JSON.stringify(authData))
    }

    const handleLogout = () => {
        setIsLoggingOut(true)
        localStorage.removeItem('repeatMode')
        setAuth(null)
        localStorage.removeItem('auth')
        setIsLoggingOut(false)
        queryClient.clear()
    }

    useEffect(() => {
        if (!auth) {
            localStorage.removeItem('auth')
        }
    }, [auth])

    useEffect(() => {
        const isWindows = /Win/.test(navigator.userAgent)
        const isChromium = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
        const isEdge = /Edg/.test(navigator.userAgent) && /Microsoft Corporation/.test(navigator.vendor)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream // eslint-disable-line @typescript-eslint/no-explicit-any

        if (isWindows && (isChromium || isEdge)) {
            document.getElementsByTagName('html')[0].classList.add('winOS')
        } else {
            document.getElementsByTagName('html')[0].classList.add('otherOS')
        }

        if (isIOS) {
            document.getElementsByTagName('html')[0].classList.add('iOS')
        }
    }, [])

    const actualApp = (
        <div className="music-app">
            <Routes>
                <Route path="/login" element={auth ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
                <Route
                    path="/*"
                    element={
                        auth ? (
                            <JellyfinContextProvider auth={auth}>
                                <AudioStorageContextProvider>
                                    <SidenavContextProvider>
                                        <PlaybackContextProvider initialVolume={0.5} clearOnLogout={isLoggingOut}>
                                            <DropdownContextProvider>
                                                <MainLayout auth={auth} handleLogout={handleLogout} />
                                                <Dropdown />
                                            </DropdownContextProvider>
                                        </PlaybackContextProvider>
                                    </SidenavContextProvider>
                                </AudioStorageContextProvider>
                            </JellyfinContextProvider>
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />
            </Routes>
        </div>
    )

    return (
        <Router basename={import.meta.env.BASE_URL}>
            <HistoryContextProvider>
                <PageTitleProvider>
                    <ScrollContextProvider>
                        <ThemeContextProvider>{actualApp}</ThemeContextProvider>
                    </ScrollContextProvider>
                </PageTitleProvider>
            </HistoryContextProvider>
        </Router>
    )
}

interface AuthData {
    serverUrl: string
    token: string
    userId: string
    username: string
}

const MainLayout = ({ auth, handleLogout }: { auth: AuthData; handleLogout: () => void }) => {
    useDocumentTitle()

    const { showSidenav, toggleSidenav } = useSidenavContext()
    const dropdownContext = useDropdownContext()
    const isDropdownOpen = dropdownContext?.isOpen || false
    const isTouchDevice = dropdownContext?.isTouchDevice || false

    const memoSettings = useCallback(() => {
        return <Settings onLogout={handleLogout} />
    }, [handleLogout])

    return (
        <div className="interface">
            <div
                className={showSidenav || (isDropdownOpen && isTouchDevice) ? 'dimmer active' : 'dimmer'}
                onClick={showSidenav ? toggleSidenav : dropdownContext?.closeDropdown}
            />

            <Sidenav username={auth.username} />

            <Routes>
                <Route path="/" element={<Main content={Home}></Main>} />
                <Route path="/tracks" element={<Main content={Tracks} filterType={'mediaItems'} />} />
                <Route path="/albums" element={<Main content={Albums} filterType={'mediaItems'} />} />
                <Route path="/album/:albumId" element={<Main content={Album} />} />
                <Route path="/artists" element={<Main content={Artists} filterType={'mediaItems'} />} />
                <Route path="/artist/:artistId" element={<Main content={Artist} />} />
                <Route path="/artist/:artistId/tracks" element={<Main content={ArtistTracks} />} />
                <Route path="/genre/:genre" element={<Main content={Genre} filterType={'mediaItems'} />} />
                <Route path="/playlist/:playlistId" element={<Main content={Playlist} />} />
                <Route path="/queue" element={<Main content={Queue} />} />
                <Route path="/favorites" element={<Main content={Favorites} filterType={'favorites'} />} />
                <Route path="/recently" element={<Main content={RecentlyPlayed} />} />
                <Route path="/frequently" element={<Main content={FrequentlyPlayed} />} />
                <Route path="/downloads" element={<Main content={Downloads} />} />
                <Route path="/settings" element={<Main content={memoSettings} />} />
                <Route path="/search/:query" element={<Main content={SearchResults} />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </div>
    )
}
