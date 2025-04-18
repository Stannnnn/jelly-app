import { ReactNode, useEffect, useState } from 'react'
import { ThemeContext } from './ThemeContext'

type Theme = 'light' | 'dark' | 'system'
export type IThemeContext = ReturnType<typeof useInitialState>

const useInitialState = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('theme') as Theme
        return savedTheme || 'light'
    })

    useEffect(() => {
        const html = document.documentElement
        const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)')

        // Apply theme only on first load if needed
        const applyInitialTheme = (currentTheme: Theme) => {
            const currentClass = html.classList.contains('dark') ? 'dark' : 'light'
            const expectedClass =
                currentTheme === 'system' ? (systemDarkQuery.matches ? 'dark' : 'light') : currentTheme
            if (currentClass !== expectedClass) {
                html.classList.remove('light', 'dark')
                if (currentTheme === 'system') {
                    const isDark = systemDarkQuery.matches
                    html.classList.add(isDark ? 'dark' : 'light')
                } else {
                    html.classList.add(currentTheme)
                }
            }
        }

        applyInitialTheme(theme)

        // Handle system changes only when theme is 'system'
        const handleSystemChange = (e: MediaQueryListEvent) => {
            if (theme === 'system') {
                html.classList.remove('light', 'dark')
                html.classList.add(e.matches ? 'dark' : 'light')
            }
        }
        systemDarkQuery.addEventListener('change', handleSystemChange)
        return () => systemDarkQuery.removeEventListener('change', handleSystemChange)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const toggleTheme = (newTheme: Theme) => {
        setTheme(newTheme)
        const html = document.documentElement
        setTimeout(() => {
            html.classList.remove('light', 'dark')
            if (newTheme === 'system') {
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                html.classList.add(isDark ? 'dark' : 'light')
            } else {
                html.classList.add(newTheme)
            }
            localStorage.setItem('theme', newTheme)
        }, 200) // Delayed class switch
    }

    return { theme, toggleTheme }
}

export const ThemeContextProvider = ({ children }: { children: ReactNode }) => {
    const initialState = useInitialState()
    return <ThemeContext.Provider value={initialState}>{children}</ThemeContext.Provider>
}
