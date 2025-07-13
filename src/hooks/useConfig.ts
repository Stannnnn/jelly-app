import { useQuery } from '@tanstack/react-query'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'

export type JSONPrimitive = string | number | boolean | null | undefined
export type JSONValue = JSONPrimitive | unknown | JSONValue[] | { [key: string]: JSONValue }

// Some behavior configurations for this setting
export interface IConfigOptions<T> {
    // Associated external configuration name (if the configuration loads from `config.json` by default)
    external?: {
        key: string
        parse: (v: JSONPrimitive) => T | undefined
    }
    // Whether to keep different tabs in sync for this configuration (current window only data, like shuffle/repeat state and current playing music should have this set to false)
    // True by default
    sync?: false
}

export const useConfig = <T extends JSONValue>(
    key: string,
    def: T,
    options?: IConfigOptions<T>
): [T, Dispatch<SetStateAction<T>>, boolean] => {
    let initialValue: T = def

    // Load external configuration file
    const { data: config, isPending } = useQuery<{ [key: string]: JSONPrimitive }, Error>({
        queryKey: ['config'],
        queryFn: async () => {
            try {
                const result = await fetch('/config.json')

                return result.json()
            } catch (e) {
                console.error(e)
            }

            return {}
        },
    })

    // Load from localStorage
    let loadedFromStorage = false

    const storedValue = localStorage.getItem(key)
    if (storedValue !== null) {
        try {
            initialValue = JSON.parse(storedValue) as T
            loadedFromStorage = true
        } catch {
            console.warn(`Configuration '${key}' has invalid value '${storedValue}'`)
        }
    }

    const [value, setValue] = useState<T>(initialValue)

    // Load from external storage
    useEffect(() => {
        if (options?.external && !loadedFromStorage && !isPending && typeof config === 'object') {
            const externalValue = options.external.parse(config[options.external.key])
            if (externalValue !== null && externalValue !== undefined) setValue(externalValue)
        }
    }, [config, isPending, loadedFromStorage, options])

    // Setup listen to localStorage
    if (options?.sync !== false)
        window.addEventListener('storage', (e: StorageEvent) => {
            if (e.key === key) {
                if (e.newValue === null) setValue(def)
                else setValue(JSON.parse(e.newValue))
            }
        })

    // Setup write to localStorage
    useEffect(() => {
        const storedValue = localStorage.getItem(key)

        if (storedValue === null || JSON.parse(storedValue) !== value) {
            try {
                localStorage.setItem(key, JSON.stringify(value))
            } catch {
                console.warn(`Configuration '${key}' has invalid value '${storedValue}'`)
            }
        }
    }, [def, key, options, value])

    return [value, setValue, options?.external ? isPending : false]
}
