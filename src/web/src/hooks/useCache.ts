import { useMemo, useState } from 'react'

export type CacheResult<Type> =
    | { status: "loaded", value: Type }
    | { status: "loading", value?: undefined }
    | { status: "error", error: Error, value?: undefined }
  
type CacheEntry<Type> = { value?: Type, error?: Error, loading?: boolean };

function useCache<Key, Type>(func: (key: Key) => Promise<Type>) {

    const [cache, setCache] = useState<Map<Key, CacheResult<Type>>>(new Map())

    function isLoading(key: Key) {
        return cache.get(key)?.status === 'loading' || false
    }

    function addToCache(key: Key, value: Type) {
        setCache(cache => {
            const newCache = new Map(cache)
            newCache.set(key, { status: 'loaded', value })
            return newCache
        })
    }

    async function loadValue(key: Key) {
        if (isLoading(key)) return

        setCache(prev => new Map(prev).set(key, {
            status: 'loading'
        }))

        try {
            const value = await func(key)
            setCache(prev => new Map(prev).set(key, { value, status: 'loaded' }))
        } catch (error: any) {
            setCache(prev => new Map(prev).set(key, { status: 'error', error: error }))
        }
    }

    function get(key: Key)/*: CacheResult<Type>*/ {
        const value = cache.get(key)

        if (value)
            return value

        loadValue(key)
        return { status: 'loading' as const }
    }

    function add(key: Key, value: Type) {
        addToCache(key, value)
    }

    function addMultiple(entries: { key: Key, value: Type }[]) {
        setCache(cache => {
            const newCache = new Map(cache)
            for (const entry of entries)
                newCache.set(entry.key, { status: 'loaded', value: entry.value})       
            return newCache
        })
    }

    function filter(predicate: (value: Type, index: number, array: (Type)[]) => boolean) {
        return Array.from(cache.values())
            .map(entry => entry.value)
            .filter(value => !!value)
            .map(value => value as NonNullable<Type>)
            .filter((value, index, array) => predicate(value, index, array))
    }

    // Instead of return a new anonymous object { }, we return a memoized object in order to avoid re-renders
    const handler = useMemo(() => ({
        get,
        add,
        addMultiple,
        filter,
    }), [cache])

    return handler
}

export { useCache }
