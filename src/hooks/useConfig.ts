import { Dispatch, SetStateAction, useEffect, useState } from 'react'

export type JSONPrimitive = string | number | boolean | null | undefined | unknown
export type JSONValue = JSONPrimitive | JSONValue[] | { [key: string]: JSONValue }

// Some behavior configurations for this setting
export interface IConfigOptions {
    // Associated external configuration name (if the configuration loads from `config.json` by default)
    external?: string
    // Whether the configuration is persisted on localStorage
    // True by default
    persistent?: false
    // Whether to keep different tabs in sync for this configuration (current window only data, like shuffle/repeat state and current playing music should have this set to false)
    // True by default
    sync?: false
}

export const useConfig = <T extends JSONValue>(
    key: string,
    def: T,
    options?: IConfigOptions
): [T, Dispatch<SetStateAction<T>>] => {
    let initialValue: T = def

    // Load from localStorage
    if (options?.persistent !== false) {
        const storedValue = localStorage.getItem(key)
        if (storedValue !== null) {
            try {
                initialValue = JSON.parse(storedValue) as T
            } catch {
                console.warn(`Configuration '${key}' has invalid value '${storedValue}'`)
            }
        }
    }

    const [value, setValue] = useState<T>(initialValue)

    // Setup listen to localStorage
    if (options?.sync !== false)
        window.addEventListener('storage', (e: StorageEvent) => {
            if (e.key === key) {
                if (e.newValue === null) setValue(def)
                else setValue(JSON.parse(e.newValue))
            }
        })

    useEffect(() => {
        if (options?.persistent !== false) {
            const storedValue = localStorage.getItem(key)

            if (storedValue === null || JSON.parse(storedValue) !== value) {
                try {
                    localStorage.setItem(key, JSON.stringify(value))
                } catch {
                    console.warn(`Configuration '${key}' has invalid value '${storedValue}'`)
                }
            }
        }
    }, [def, key, options, value])

    return [value, setValue]
}
