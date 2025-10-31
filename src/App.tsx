import '@fontsource-variable/inter'
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import './App.css'
import { Dropdown } from './components/Dropdown'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Main } from './components/Main'
import './components/MediaList.css'
import { Sidenav } from './components/Sidenav'
import { AudioStorageContextProvider } from './context/AudioStorageContext/AudioStorageContextProvider'
import { DownloadContextProvider } from './context/DownloadContext/DownloadContextProvider'
import { useDropdownContext } from './context/DropdownContext/DropdownContext'
import { DropdownContextProvider } from './context/DropdownContext/DropdownContextProvider'
import { HistoryContextProvider } from './context/HistoryContext/HistoryContextProvider'
import { JellyfinContextProvider } from './context/JellyfinContext/JellyfinContextProvider'
import { PageTitleProvider } from './context/PageTitleContext/PageTitleProvider'
import { usePlaybackContext } from './context/PlaybackContext/PlaybackContext'
import { PlaybackContextProvider } from './context/PlaybackContext/PlaybackContextProvider'
import { ScrollContextProvider } from './context/ScrollContext/ScrollContextProvider'
import { useSidenavContext } from './context/SidenavContext/SidenavContext'
import { SidenavContextProvider } from './context/SidenavContext/SidenavContextProvider'
import { ThemeContextProvider } from './context/ThemeContext/ThemeContextProvider'
import { useDocumentTitle } from './hooks/useDocumentTitle'
import { Album } from './pages/Album'
import { AlbumArtists } from './pages/AlbumArtists'
import { Albums } from './pages/Albums'
import { Artist } from './pages/Artist'
import { Artists } from './pages/Artists'
import { ArtistTracks } from './pages/ArtistTracks'
import { Downloads } from './pages/Downloads'
import { Favorites } from './pages/Favorites'
import { FrequentlyPlayed } from './pages/FrequentlyPlayed'
import { Genre } from './pages/Genre'
import { Genres } from './pages/Genres'
import { Home } from './pages/Home'
import { InstantMix } from './pages/InstantMix'
import { Login } from './pages/Login'
import { Lyrics } from './pages/Lyrics'
import { NowPlaying } from './pages/NowPlaying'
import { NowPlayingLyrics } from './pages/NowPlayingLyrics'
import { Playlist } from './pages/Playlist'
import { Queue } from './pages/Queue'
import { RecentlyPlayed } from './pages/RecentlyPlayed'
import { SearchResults } from './pages/SearchResults'
import { Settings } from './pages/Settings'
import { Tracks } from './pages/Tracks'
import { persister, queryClient } from './queryClient'

export const App = () => {
    return (
        <ErrorBoundary>
            {window.__NPM_LIFECYCLE_EVENT__ === 'dev:nocache' ? (
                <QueryClientProvider client={queryClient}>
                    <RoutedApp />
                </QueryClientProvider>
            ) : (
                <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
                    <RoutedApp />
                </PersistQueryClientProvider>
            )}
        </ErrorBoundary>
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

    const handleLogout = async () => {
        setIsLoggingOut(true)
        localStorage.removeItem('repeatMode')
        setAuth(null)
        localStorage.removeItem('auth')
        setIsLoggingOut(false)
        queryClient.clear()
        await persister.removeClient()
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
        const isAndroidPWA =
            /Android/.test(navigator.userAgent) &&
            (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) // eslint-disable-line @typescript-eslint/no-explicit-any

        if (isWindows && (isChromium || isEdge)) {
            document.getElementsByTagName('html')[0].classList.add('winOS')
        }

        if (isIOS) {
            document.getElementsByTagName('html')[0].classList.add('iOS')
        }

        // env safe area inset not supported or unreliable in android pwa?
        if (isAndroidPWA) {
            document.getElementsByTagName('html')[0].classList.add('safeAreaFallback')
        }

        // Needed for iOS, else you need to refresh page after changing orientation mode
        const updateOrientation = () => {
            const isIOSSafariNonPWA =
                isIOS &&
                !window.matchMedia('(display-mode: standalone)').matches &&
                !(navigator as any).standalone && // eslint-disable-line @typescript-eslint/no-explicit-any
                !window.matchMedia('(orientation: landscape)').matches
            const htmlElement = document.getElementsByTagName('html')[0]

            if (isIOS) {
                if (isIOSSafariNonPWA) {
                    htmlElement.classList.add('safeAreaFallback')
                } else {
                    htmlElement.classList.remove('safeAreaFallback')
                }
            }
        }

        updateOrientation()
        window.matchMedia('(orientation: landscape)').addEventListener('change', updateOrientation)

        return () => {
            window.matchMedia('(orientation: landscape)').removeEventListener('change', updateOrientation)
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
                                            <DownloadContextProvider>
                                                <DropdownContextProvider>
                                                    <MainLayout auth={auth} handleLogout={handleLogout} />
                                                    <Dropdown />
                                                </DropdownContextProvider>
                                            </DownloadContextProvider>
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
    const { maxWidth } = usePlaybackContext()
    const isDropdownOpen = dropdownContext?.isOpen || false
    const isTouchDevice = dropdownContext?.isTouchDevice || false
    const isInteractionBlocked = dropdownContext?.isInteractionBlocked || false

    useEffect(() => {
        const root = document.documentElement
        if (maxWidth === 'wide') {
            root.style.setProperty('--interface-max-width', '100%')
        } else {
            root.style.setProperty('--interface-max-width', `${maxWidth}px`)
        }
    }, [maxWidth])

    const memoSettings = useCallback(() => {
        return <Settings onLogout={handleLogout} />
    }, [handleLogout])

    return (
        <Routes>
            <Route path="/nowplaying" element={<NowPlaying />} />
            <Route path="/nowplaying/lyrics" element={<NowPlayingLyrics />} />

            <Route
                path="*"
                element={
                    <div className={`interface` + (isInteractionBlocked ? ' touchBlocked' : '')}>
                        <div
                            className={
                                showSidenav || (isDropdownOpen && isTouchDevice)
                                    ? 'dimmer active noSelect'
                                    : 'dimmer noSelect'
                            }
                            onClick={showSidenav ? toggleSidenav : dropdownContext?.closeDropdown}
                        />

                        <Sidenav username={auth.username} />

                        <Routes>
                            <Route path="/" element={<Main content={Home}></Main>} />
                            <Route path="/tracks" element={<Main content={Tracks} filterType={'mediaItems'} />} />
                            <Route path="/lyrics" element={<Main content={Lyrics} />} />
                            <Route path="/albums" element={<Main content={Albums} filterType={'mediaItems'} />} />
                            <Route path="/album/:albumId" element={<Main content={Album} />} />
                            <Route path="/artists" element={<Main content={Artists} filterType={'mediaItems'} />} />
                            <Route path="/artist/:artistId" element={<Main content={Artist} />} />
                            <Route path="/artist/:artistId/tracks" element={<Main content={ArtistTracks} />} />
                            <Route
                                path="/albumartists"
                                element={<Main content={AlbumArtists} filterType={'mediaItems'} />}
                            />
                            <Route path="/genre/:genre" element={<Main content={Genre} filterType={'mediaItems'} />} />
                            <Route path="/genres" element={<Main content={Genres} filterType={'mediaItems'} />} />
                            <Route
                                path="/playlist/:playlistId"
                                element={<Main content={Playlist} filterType={'mediaItemsPlaylist'} />}
                            />
                            <Route path="/queue" element={<Main content={Queue} />} />
                            <Route path="/favorites" element={<Main content={Favorites} filterType={'favorites'} />} />
                            <Route path="/recently" element={<Main content={RecentlyPlayed} />} />
                            <Route path="/frequently" element={<Main content={FrequentlyPlayed} />} />
                            <Route path="/synced" element={<Main content={Downloads} filterType={'kind'} />} />
                            <Route path="/settings" element={<Main content={memoSettings} />} />
                            <Route path="/instantmix/:songId" element={<Main content={InstantMix} />} />
                            <Route path="/search/:query" element={<Main content={SearchResults} />} />
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </div>
                }
            />
        </Routes>
    )
}
