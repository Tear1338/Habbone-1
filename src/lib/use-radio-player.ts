'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

// Configuration de la radio
const RADIO_CONFIG = {
    name: 'Skyrock',
    streamUrl: 'https://icecast.skyrock.net/s/natio_mp3_128k',
    // Alternative backup URLs
    backupUrls: [
        'https://icecast.skyrock.net/s/natio_aac_128k',
        'https://icecast.skyrock.net/s/natio_mp3_64k',
    ],
}

type RadioPlayerState = 'stopped' | 'loading' | 'playing' | 'error'

export function useRadioPlayer() {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [state, setState] = useState<RadioPlayerState>('stopped')
    const [volume, setVolumeState] = useState(60)
    const [isMuted, setIsMuted] = useState(false)

    // Initialize audio element
    useEffect(() => {
        if (typeof window === 'undefined') return

        const audio = new Audio()
        audio.preload = 'none'
        audio.volume = volume / 100
        audioRef.current = audio

        const handlePlaying = () => setState('playing')
        const handleWaiting = () => setState('loading')
        const handleError = () => setState('error')
        const handleEnded = () => setState('stopped')

        audio.addEventListener('playing', handlePlaying)
        audio.addEventListener('waiting', handleWaiting)
        audio.addEventListener('error', handleError)
        audio.addEventListener('ended', handleEnded)

        return () => {
            audio.pause()
            audio.src = ''
            audio.removeEventListener('playing', handlePlaying)
            audio.removeEventListener('waiting', handleWaiting)
            audio.removeEventListener('error', handleError)
            audio.removeEventListener('ended', handleEnded)
        }
    }, [])

    // Update volume when it changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume / 100
        }
    }, [volume, isMuted])

    const play = useCallback(async () => {
        const audio = audioRef.current
        if (!audio) return

        try {
            setState('loading')

            // If already has source, just play
            if (audio.src && !audio.paused) {
                return
            }

            // Set source and play
            audio.src = RADIO_CONFIG.streamUrl
            await audio.play()
        } catch (error) {
            console.error('Radio playback error:', error)

            // Try backup URLs
            for (const backupUrl of RADIO_CONFIG.backupUrls) {
                try {
                    audio.src = backupUrl
                    await audio.play()
                    return
                } catch {
                    continue
                }
            }

            setState('error')
        }
    }, [])

    const stop = useCallback(() => {
        const audio = audioRef.current
        if (!audio) return

        audio.pause()
        audio.src = ''
        setState('stopped')
    }, [])

    const toggle = useCallback(() => {
        if (state === 'playing' || state === 'loading') {
            stop()
        } else {
            play()
        }
    }, [state, play, stop])

    const setVolume = useCallback((value: number) => {
        const clampedValue = Math.max(0, Math.min(100, value))
        setVolumeState(clampedValue)
        setIsMuted(clampedValue === 0)
    }, [])

    const toggleMute = useCallback(() => {
        setIsMuted((prev) => !prev)
    }, [])

    return {
        state,
        isPlaying: state === 'playing',
        isLoading: state === 'loading',
        volume,
        isMuted,
        play,
        stop,
        toggle,
        setVolume,
        toggleMute,
        radioName: RADIO_CONFIG.name,
    }
}

export type RadioPlayerHook = ReturnType<typeof useRadioPlayer>
