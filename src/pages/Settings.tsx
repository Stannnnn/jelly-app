import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJellyfinContext } from '../context/JellyfinContext'
import { useThemeContext } from '../context/ThemeContext'
import './Settings.css'

interface SettingsProps {
    onLogout: () => void
}

const Settings = ({ onLogout }: SettingsProps) => {
    const navigate = useNavigate()
    const api = useJellyfinContext()

    const { theme, toggleTheme } = useThemeContext()

    const [lastLogin, setLastLogin] = useState<string | null>(null)
    const [clientIp, setClientIp] = useState<string | null>(null)
    const [latency, setLatency] = useState<number | null>(null)
    const [playCount, setPlayCount] = useState<number | null>(null)

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const response = await fetch(`${api.auth.serverUrl}/Users/${api.auth.userId}`, {
                    headers: { 'X-Emby-Token': api.auth.token },
                })
                const user = await response.json()
                if (user.LastLoginDate) {
                    const date = new Date(user.LastLoginDate)
                    const formatted = date
                        .toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            year: 'numeric',
                            hour12: true,
                        })
                        .replace(/,/, '')
                    setLastLogin(formatted)
                } else {
                    setLastLogin(null)
                }
            } catch (error) {
                console.error('Failed to fetch user info:', error)
                setLastLogin(null)
            }
        }

        const fetchClientIp = async () => {
            try {
                const response = await fetch(`${api.auth.serverUrl}/Sessions`, {
                    headers: { 'X-Emby-Token': api.auth.token },
                })
                const sessions = await response.json()
                const mySession = sessions.find((s: any) => s.UserId === api.auth.userId)
                setClientIp(mySession?.RemoteEndPoint || null)
            } catch (error) {
                console.error('Failed to fetch session info:', error)
                setClientIp(null)
            }
        }

        const measureLatency = async () => {
            try {
                const startTime = performance.now()
                await fetch(`${api.auth.serverUrl}/System/Ping`, {
                    headers: { 'X-Emby-Token': api.auth.token },
                })
                const endTime = performance.now()
                const latencyMs = Math.round(endTime - startTime)
                setLatency(latencyMs)
            } catch (error) {
                console.error('Failed to measure latency:', error)
                setLatency(null)
            }
        }

        const fetchPlayCount = async () => {
            try {
                const response = await fetch(
                    `${api.auth.serverUrl}/Users/${api.auth.userId}/Items?Recursive=true&IncludeItemTypes=Audio&Filters=IsPlayed`,
                    {
                        headers: { 'X-Emby-Token': api.auth.token },
                    }
                )
                const data = await response.json()
                setPlayCount(data.TotalRecordCount)
            } catch (error) {
                console.error('Failed to fetch play count:', error)
                setPlayCount(null)
            }
        }

        fetchUserInfo()
        fetchClientIp()
        measureLatency()
        fetchPlayCount()
    }, [api.auth.serverUrl, api.auth.token, api.auth.userId])

    const handleLogout = () => {
        onLogout()
        navigate('/login')
    }

    return (
        <div className="settings-page">
            <div className="section appearance">
                <div className="info">
                    <div className="title">Appearance</div>
                </div>
                <div className="options noSelect">
                    <div
                        className={`option light ${theme === 'light' ? 'active' : ''}`}
                        onClick={() => toggleTheme('light')}
                    >
                        <div className="visual" />
                        <div className="desc">Light</div>
                    </div>
                    <div
                        className={`option dark ${theme === 'dark' ? 'active' : ''}`}
                        onClick={() => toggleTheme('dark')}
                    >
                        <div className="visual" />
                        <div className="desc">Dark</div>
                    </div>
                    <div
                        className={`option system ${theme === 'system' ? 'active' : ''}`}
                        onClick={() => toggleTheme('system')}
                    >
                        <div className="visual" />
                        <div className="desc">System</div>
                    </div>
                </div>
            </div>
            <div className="section quality">
                <div className="info">
                    <div className="title">Audio Quality</div>
                    <div className="desc">
                        1. Some options to enable transcoding, off by default. 2. The audio will be converted to AAC
                        320/128kbps, more container/bitrate options, or rigid/tight selection? 3. Source file (quality)
                        enabled by default, some info about that first or after mentioning transcoding?
                    </div>
                </div>
            </div>
            <div className="section session">
                <div className="info">
                    <div className="title">Session</div>
                    <div className="desc">
                        <p>
                            Currently connected to {api.auth.serverUrl}{' '}
                            {latency !== null && (
                                <span>
                                    <span>with {latency}ms latency to server</span>
                                </span>
                            )}
                        </p>
                        <p>
                            Last login on: {lastLogin} {clientIp ? ` from ${clientIp}` : ''}
                        </p>
                        <p>Played {playCount !== null && <span>{playCount}</span>} tracks since login</p>
                    </div>
                </div>
                <div className="options noSelect">
                    <button onClick={handleLogout} className="logout-button">
                        Logout
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Settings
