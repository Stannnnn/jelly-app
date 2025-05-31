import { createContext, useContext } from 'react'
import { IAudioStorageContext } from './AudioStorageContextProvider'

export const AudioStorageContext = createContext<IAudioStorageContext>({} as IAudioStorageContext)

export const useAudioStorageContext = () => useContext(AudioStorageContext)
