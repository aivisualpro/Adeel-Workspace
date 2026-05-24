/**
 * useConnectionSources
 *
 * Shared composable for managing MongoDB connection sources across pages.
 * Fetches sources from the /api/db/sources endpoint and auto-assigns
 * visual theming (icon, color) from a rotating palette.
 */

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SourceOption {
    key: string
    label: string
    description: string
    icon: string
    color: string        // HSL color string e.g. '250 60% 60%'
    origin: 'env' | 'custom'
}

// ─── Color palette (rotating, deterministic by index) ─────────────────────────
const PALETTE = [
    { color: '230 80% 60%', icon: 'i-lucide-server' },        // blue
    { color: '160 60% 45%', icon: 'i-lucide-map-pin' },       // emerald
    { color: '30 90% 55%', icon: 'i-lucide-chef-hat' },       // orange
    { color: '340 70% 55%', icon: 'i-lucide-building-2' },    // rose
    { color: '270 60% 60%', icon: 'i-lucide-shield-check' },  // purple
    { color: '45 90% 50%', icon: 'i-lucide-heart-handshake' },// amber
    { color: '190 70% 50%', icon: 'i-lucide-cloud' },         // cyan
    { color: '10 70% 55%', icon: 'i-lucide-flame' },          // red
    { color: '300 50% 55%', icon: 'i-lucide-sparkles' },      // fuchsia
    { color: '140 50% 50%', icon: 'i-lucide-leaf' },          // green
    { color: '210 70% 55%', icon: 'i-lucide-database' },      // sky
    { color: '60 70% 50%', icon: 'i-lucide-star' },           // yellow-green
]

function paletteForIndex(index: number) {
    return PALETTE[index % PALETTE.length]!
}

// ─── Composable ───────────────────────────────────────────────────────────────
export function useConnectionSources() {
    const sourceOptions = ref<SourceOption[]>([])
    const selectedSource = ref<string>('adeel')
    const loading = ref(false)
    const error = ref<string>('')

    const activeSourceOption = computed(() =>
        sourceOptions.value.find(s => s.key === selectedSource.value) || sourceOptions.value[0]!,
    )

    // ─── Fetch sources from API ───────────────────────────────────────────
    async function loadSources() {
        loading.value = true
        error.value = ''
        try {
            const res: any = await $fetch('/api/db/sources')
            const raw = res.sources || []

            sourceOptions.value = raw.map((s: any, i: number) => {
                const palette = paletteForIndex(i)
                return {
                    key: s.key,
                    label: s.label,
                    description: s.description,
                    icon: palette.icon,
                    color: palette.color,
                    origin: s.origin,
                }
            })

            // If currently selected source no longer exists, reset to first
            if (sourceOptions.value.length && !sourceOptions.value.find(s => s.key === selectedSource.value)) {
                selectedSource.value = sourceOptions.value[0]!.key
            }
        }
        catch (err: any) {
            error.value = err.data?.message || 'Failed to load sources'
        }
        loading.value = false
    }

    // ─── Add a new custom connection ──────────────────────────────────────
    async function addSource(label: string, uri: string): Promise<{ success: boolean, error?: string, key?: string }> {
        try {
            const res: any = await $fetch('/api/db/sources', {
                method: 'POST',
                body: { label, uri },
            })
            await loadSources()
            return { success: true, key: res.key }
        }
        catch (err: any) {
            return { success: false, error: err.data?.message || 'Failed to add connection' }
        }
    }

    // ─── Remove a custom connection ───────────────────────────────────────
    async function removeSource(key: string): Promise<{ success: boolean, error?: string }> {
        try {
            await $fetch('/api/db/sources', {
                method: 'DELETE',
                body: { key },
            })
            await loadSources()
            return { success: true }
        }
        catch (err: any) {
            return { success: false, error: err.data?.message || 'Failed to remove connection' }
        }
    }

    // ─── Dropdown state (shared UI logic) ─────────────────────────────────
    const sourceDropdownOpen = ref(false)
    const sourceDropdownRef = ref<HTMLDivElement | null>(null)
    const sourceBtnRef = ref<HTMLButtonElement | null>(null)
    const sourceDropdownStyle = ref({ top: '0px', left: '0px', width: '0px' })

    function toggleSourceDropdown(disabled?: boolean) {
        if (disabled) return
        if (sourceBtnRef.value) {
            const rect = sourceBtnRef.value.getBoundingClientRect()
            sourceDropdownStyle.value = {
                top: `${rect.bottom + 8}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
            }
        }
        sourceDropdownOpen.value = !sourceDropdownOpen.value
    }

    function selectSource(key: string) {
        selectedSource.value = key
        sourceDropdownOpen.value = false
    }

    function onSourceClickOutside(e: MouseEvent) {
        if (sourceDropdownRef.value && !sourceDropdownRef.value.contains(e.target as Node)) {
            sourceDropdownOpen.value = false
        }
    }

    // Load on mount, register click-outside
    onMounted(() => {
        loadSources()
        document.addEventListener('click', onSourceClickOutside)
    })
    onUnmounted(() => {
        document.removeEventListener('click', onSourceClickOutside)
    })

    return {
        // Data
        sourceOptions,
        selectedSource,
        activeSourceOption,
        loading,
        error,

        // Actions
        loadSources,
        addSource,
        removeSource,

        // Dropdown UI
        sourceDropdownOpen,
        sourceDropdownRef,
        sourceBtnRef,
        sourceDropdownStyle,
        toggleSourceDropdown,
        selectSource,
    }
}
