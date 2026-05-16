<script setup lang="ts">
const { setHeader } = usePageHeader()
setHeader({
  title: 'Array Embedder',
  icon: 'i-lucide-list-plus',
  description: 'Embed CSV rows as arrays of objects into existing MongoDB documents by matching a reference field',
})

// Info banner dismissal (session-only, no persistence)
const showBanner = ref(true)

// ─── Connection Source ────────────────────────────────────────────────────────
interface SourceOption {
  key: string
  label: string
  description: string
  icon: string
  gradient: string
  accentColor: string
}

const sourceOptions: SourceOption[] = [
  {
    key: 'adeel',
    label: 'Adeel',
    description: 'Primary database cluster',
    icon: 'i-lucide-server',
    gradient: 'from-blue-500 via-indigo-500 to-violet-500',
    accentColor: 'blue',
  },
  {
    key: 'streetsmart',
    label: 'Street Smart',
    description: 'Street Smart database cluster',
    icon: 'i-lucide-map-pin',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    accentColor: 'emerald',
  },
  {
    key: 'culturalgourmet',
    label: 'Cultural Gourmet',
    description: 'Cultural Gourmet database cluster',
    icon: 'i-lucide-chef-hat',
    gradient: 'from-orange-500 via-amber-500 to-yellow-500',
    accentColor: 'orange',
  },
  {
    key: 'lagniappepro',
    label: 'LagniappePRO',
    description: 'LagniappePRO ERP database cluster',
    icon: 'i-lucide-building-2',
    gradient: 'from-rose-500 via-pink-500 to-fuchsia-500',
    accentColor: 'rose',
  },
  {
    key: 'nashville',
    label: 'Nashville ClearBra',
    description: 'Nashville ClearBra database cluster',
    icon: 'i-lucide-shield-check',
    gradient: 'from-purple-500 via-violet-500 to-indigo-500',
    accentColor: 'purple',
  },
]

const selectedSource = ref<string>('adeel')

const activeSourceOption = computed(() =>
  sourceOptions.find(s => s.key === selectedSource.value) || sourceOptions[0]!,
)

const sourceDropdownOpen = ref(false)
const sourceDropdownRef = ref<HTMLDivElement | null>(null)
const sourceBtnRef = ref<HTMLButtonElement | null>(null)
const sourceDropdownStyle = ref({ top: '0px', left: '0px', width: '0px' })

function toggleSourceDropdown() {
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

onMounted(() => document.addEventListener('click', onSourceClickOutside))
onUnmounted(() => document.removeEventListener('click', onSourceClickOutside))

// Reset dependent state when source changes
watch(selectedSource, () => {
  database.value = ''
  collection.value = ''
  availableDatabases.value = []
  availableCollections.value = []
})

// ─── State ────────────────────────────────────────────────────────────────────
const database = ref('')
const collection = ref('')

// ─── Database Combobox ────────────────────────────────────────────────────────
const availableDatabases = ref<string[]>([])
const loadingDatabases = ref(false)
const dbDropdownOpen = ref(false)
const dbInputRef = ref<HTMLInputElement | null>(null)
const dbDropdownStyle = ref({ top: '0px', left: '0px', width: '0px' })

async function loadDatabases() {
  if (availableDatabases.value.length > 0) return
  loadingDatabases.value = true
  try {
    const res: any = await $fetch('/api/db/databases', { params: { source: selectedSource.value } })
    availableDatabases.value = res.databases || []
  }
  catch {
    availableDatabases.value = []
  }
  loadingDatabases.value = false
}

function onDbFocus() {
  if (dbInputRef.value) {
    const rect = dbInputRef.value.getBoundingClientRect()
    dbDropdownStyle.value = {
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
    }
  }
  dbDropdownOpen.value = true
  loadDatabases()
}

function onDbBlur() {
  setTimeout(() => { dbDropdownOpen.value = false }, 180)
}

function selectDatabase(name: string) {
  database.value = name
  dbDropdownOpen.value = false
  // Reset collection when database changes
  collection.value = ''
  availableCollections.value = []
}

const filteredDatabases = computed(() => {
  const q = database.value.trim().toLowerCase()
  if (!q) return availableDatabases.value
  return availableDatabases.value.filter(d => d.toLowerCase().includes(q))
})

// Watch database change → reset collection cache
watch(() => database.value, () => {
  collection.value = ''
  availableCollections.value = []
})

// ─── Collection Combobox ──────────────────────────────────────────────────────
const availableCollections = ref<string[]>([])
const loadingCollections = ref(false)
const colDropdownOpen = ref(false)
const colInputRef = ref<HTMLInputElement | null>(null)
const colDropdownStyle = ref({ top: '0px', left: '0px', width: '0px' })

async function loadCollections() {
  if (!database.value.trim() || availableCollections.value.length > 0) return
  loadingCollections.value = true
  try {
    const res: any = await $fetch(`/api/db/collections?database=${encodeURIComponent(database.value.trim())}&source=${encodeURIComponent(selectedSource.value)}`)
    availableCollections.value = res.collections || []
  }
  catch {
    availableCollections.value = []
  }
  loadingCollections.value = false
}

function onColFocus() {
  if (!database.value.trim()) return
  if (colInputRef.value) {
    const rect = colInputRef.value.getBoundingClientRect()
    colDropdownStyle.value = {
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
    }
  }
  colDropdownOpen.value = true
  loadCollections()
}

function onColBlur() {
  setTimeout(() => { colDropdownOpen.value = false }, 180)
}

function selectCollection(name: string) {
  collection.value = name
  colDropdownOpen.value = false
}

const filteredCollections = computed(() => {
  const q = collection.value.trim().toLowerCase()
  if (!q) return availableCollections.value
  return availableCollections.value.filter(c => c.toLowerCase().includes(q))
})

// ─── Array Configuration ──────────────────────────────────────────────────────
const arrayFieldName = ref('')

// Match field combobox — fields fetched from the target collection
const collectionMatchField = ref('')
const availableFields = ref<string[]>([])
const loadingFields = ref(false)
const fieldDropdownOpen = ref(false)
const fieldInputRef = ref<HTMLInputElement | null>(null)
const fieldDropdownStyle = ref({ top: '0px', left: '0px', width: '0px' })

async function loadCollectionFields() {
  if (!database.value.trim() || !collection.value.trim()) return
  if (availableFields.value.length > 0) return
  loadingFields.value = true
  try {
    const res: any = await $fetch(
      `/api/db/fields?database=${encodeURIComponent(database.value.trim())}&collection=${encodeURIComponent(collection.value.trim())}&source=${encodeURIComponent(selectedSource.value)}`,
    )
    availableFields.value = res.fields || []
  }
  catch {
    availableFields.value = []
  }
  loadingFields.value = false
}

// Auto-fetch fields when collection is set
watch(() => collection.value, (val) => {
  collectionMatchField.value = ''
  availableFields.value = []
  if (val.trim()) loadCollectionFields()
})

// Also reset if database changes (collection watcher handles field reset via cascade)
watch(() => database.value, () => {
  collectionMatchField.value = ''
  availableFields.value = []
})

function onFieldFocus() {
  if (!collection.value.trim()) return
  if (fieldInputRef.value) {
    const rect = fieldInputRef.value.getBoundingClientRect()
    fieldDropdownStyle.value = {
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
    }
  }
  fieldDropdownOpen.value = true
  loadCollectionFields()
}

function onFieldBlur() {
  setTimeout(() => { fieldDropdownOpen.value = false }, 180)
}

function selectMatchField(name: string) {
  collectionMatchField.value = name
  fieldDropdownOpen.value = false
}

const filteredFields = computed(() => {
  const q = collectionMatchField.value.trim().toLowerCase()
  if (!q) return availableFields.value
  return availableFields.value.filter(f => f.toLowerCase().includes(q))
})

const isArrayConfigReady = computed(() => database.value.trim() && collection.value.trim())

// ─── CSV State ──────────────────────────────────────────────────────────────────────────
const csvFile = ref<File | null>(null)
const csvFileName = ref('')
const csvPreviewHeaders = ref<string[]>([])
const csvPreviewRows = ref<Record<string, string>[]>([])
const csvRowCount = ref(0)
const dragActive = ref(false)
const csvMatchField = ref('')
const excludeFields = ref<string[]>([])
const batchSize = ref(500)

// Reset CSV state when collection changes (new target = fresh upload)
watch(() => collection.value, () => {
  removeFile()
})

// ─── CSV Utilities (verbatim from database-creator) ──────────────────────────────────────
function handleFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) processFile(input.files[0]!)
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  dragActive.value = false
  if (e.dataTransfer?.files?.length) processFile(e.dataTransfer.files[0]!)
}

function processFile(file: File) {
  if (!file.name.endsWith('.csv')) {
    alert('Please upload a .csv file')
    return
  }
  csvFile.value = file
  csvFileName.value = file.name

  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = ev.target?.result as string
    const logicalRows = splitCSVIntoLogicalRows(text)
    if (logicalRows.length === 0) return

    const headers = parseCSVRow(logicalRows[0]!)
    csvPreviewHeaders.value = headers
    csvRowCount.value = logicalRows.length - 1

    const preview: Record<string, string>[] = []
    for (let i = 1; i <= Math.min(5, logicalRows.length - 1); i++) {
      const vals = parseCSVRow(logicalRows[i]!)
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h] = vals[idx] || '' })
      preview.push(row)
    }
    csvPreviewRows.value = preview

    // Default exclusions: pre-check the CSV match field (kept in sync below)
    csvMatchField.value = ''
    excludeFields.value = []
  }
  reader.readAsText(file)
}

function splitCSVIntoLogicalRows(raw: string): string[] {
  const rows: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!
    if (ch === '"') {
      if (inQuotes && i + 1 < raw.length && raw[i + 1] === '"') {
        current += '""'
        i++
      }
      else {
        inQuotes = !inQuotes
        current += ch
      }
    }
    else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && i + 1 < raw.length && raw[i + 1] === '\n') i++
      if (current.trim()) rows.push(current)
      current = ''
    }
    else {
      current += ch
    }
  }
  if (current.trim()) rows.push(current)
  return rows
}

function parseCSVRow(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else current += ch
  }
  result.push(current.trim())
  return result.map(v => v.replace(/^["']|["']$/g, ''))
}

function removeFile() {
  csvFile.value = null
  csvFileName.value = ''
  csvPreviewHeaders.value = []
  csvPreviewRows.value = []
  csvRowCount.value = 0
  csvMatchField.value = ''
  excludeFields.value = []
}

const formatNumber = (n: number) => n.toLocaleString()
const formatBytes = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// When CSV match field changes, auto-add it to excludeFields (the key column is not embedded)
watch(csvMatchField, (newVal, oldVal) => {
  // Remove old auto-exclusion if it was only auto-added
  if (oldVal && !excludeFields.value.includes(oldVal)) {
    excludeFields.value = excludeFields.value.filter(f => f !== oldVal)
  }
  // Auto-exclude the new match field
  if (newVal && !excludeFields.value.includes(newVal)) {
    excludeFields.value = [...excludeFields.value, newVal]
  }
})

// Fields that will be embedded (headers minus excluded)
const embeddedFields = computed(() =>
  csvPreviewHeaders.value.filter(h => !excludeFields.value.includes(h)),
)

function toggleExclude(field: string) {
  // Match field cannot be un-excluded
  if (field === csvMatchField.value) return
  if (excludeFields.value.includes(field))
    excludeFields.value = excludeFields.value.filter(f => f !== field)
  else
    excludeFields.value = [...excludeFields.value, field]
}

// Form validity
const isFormValid = computed(() =>
  !!(selectedSource.value
    && database.value.trim()
    && collection.value.trim()
    && arrayFieldName.value.trim()
    && collectionMatchField.value.trim()
    && csvFile.value
    && csvMatchField.value),
)

// ─── Import / Progress ──────────────────────────────────────────────────────────────
import { nanoid } from 'nanoid'

type EmbedStatus = 'idle' | 'parsing' | 'processing' | 'done' | 'error'
const embedStatus = ref<EmbedStatus>('idle')
const sessionId = ref('')
const showUnmatched = ref(false)
const progress = ref({
  total: 0,
  matched: 0,
  unmatched: 0,
  documentsUpdated: 0,
  processed: 0,
  percentage: 0,
  message: '',
  csvFields: [] as string[],
  unmatchedSamples: [] as string[],
  elapsed: 0,
  speed: 0,
  eta: 0,
  remainingRecords: 0,
})

const isRunning = computed(() => embedStatus.value === 'parsing' || embedStatus.value === 'processing')
let pollInterval: ReturnType<typeof setInterval> | null = null

function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
}

function startPolling() {
  stopPolling()
  pollInterval = setInterval(async () => {
    try {
      const res: any = await $fetch(`/api/db/embed-progress?sessionId=${sessionId.value}`)
      progress.value = res
      embedStatus.value = res.status
      if (res.status === 'done' || res.status === 'error') stopPolling()
    }
    catch { /* silent */ }
  }, 300)
}

async function startEmbed() {
  if (!isFormValid.value || isRunning.value) return
  embedStatus.value = 'parsing'
  sessionId.value = nanoid()
  showUnmatched.value = false
  progress.value = {
    total: 0, matched: 0, unmatched: 0, documentsUpdated: 0, processed: 0,
    percentage: 0, message: 'Submitting…', csvFields: [], unmatchedSamples: [],
    elapsed: 0, speed: 0, eta: 0, remainingRecords: 0,
  }

  const formData = new FormData()
  formData.append('database', database.value.trim())
  formData.append('collection', collection.value.trim())
  formData.append('sessionId', sessionId.value)
  formData.append('source', selectedSource.value)
  formData.append('arrayFieldName', arrayFieldName.value.trim())
  formData.append('csvMatchField', csvMatchField.value)
  formData.append('collectionMatchField', collectionMatchField.value.trim())
  formData.append('batchSize', String(batchSize.value))
  formData.append('excludeFields', JSON.stringify(excludeFields.value))
  formData.append('file', csvFile.value!)

  try {
    const res: any = await $fetch('/api/db/embed-array', { method: 'POST', body: formData })
    if (res.success) {
      embedStatus.value = 'processing'
      startPolling()
    }
  }
  catch (err: any) {
    embedStatus.value = 'error'
    progress.value.message = err.data?.message || 'Embed failed'
  }
}

function resetEmbed() {
  stopPolling()
  embedStatus.value = 'idle'
  sessionId.value = ''
  showUnmatched.value = false
  removeFile()
  arrayFieldName.value = ''
  csvMatchField.value = ''
  collectionMatchField.value = ''
  excludeFields.value = []
  progress.value = {
    total: 0, matched: 0, unmatched: 0, documentsUpdated: 0, processed: 0,
    percentage: 0, message: '', csvFields: [], unmatchedSamples: [],
    elapsed: 0, speed: 0, eta: 0, remainingRecords: 0,
  }
}

const formatDuration = (ms: number) => {
  if (ms < 1000) return ms + 'ms'
  const s = ms / 1000
  if (s < 60) return s.toFixed(1) + 's'
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

onUnmounted(stopPolling)
</script>

<template>
  <div class="flex flex-col gap-6 max-w-5xl mx-auto pb-12">

    <!-- ═══ HOW THIS WORKS BANNER ════════════════════════════════════════════ -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <Card v-if="showBanner" class="relative border-border/50 bg-card/60 backdrop-blur-sm">
        <div class="absolute top-0 left-0 w-full h-0.5 rounded-t-xl bg-gradient-to-r from-sky-500/60 via-sky-400/80 to-sky-500/40" />
        <CardContent class="pt-4 pb-3">
          <div class="flex items-start gap-3">
            <div class="flex items-center justify-center size-7 rounded-lg bg-sky-500/10 text-sky-400 shrink-0 mt-0.5">
              <Icon name="i-lucide-info" class="size-3.5" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-foreground mb-1">How this works</p>
              <ol class="text-[12px] text-muted-foreground space-y-0.5 list-none">
                <li class="flex items-start gap-1.5">
                  <span class="font-mono text-sky-400 shrink-0 text-[10px] mt-0.5">①</span>
                  Pick the target <span class="font-mono text-foreground/80 mx-0.5">database</span> and <span class="font-mono text-foreground/80 mx-0.5">collection</span>, then configure the array field name and which document field to match against.
                </li>
                <li class="flex items-start gap-1.5">
                  <span class="font-mono text-sky-400 shrink-0 text-[10px] mt-0.5">②</span>
                  Upload a CSV and choose which column is the join key — every row in the CSV will be pushed as one embedded object into the chosen array field on the matching document.
                </li>
              </ol>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="size-7 p-0 text-muted-foreground hover:text-foreground shrink-0 -mt-0.5 -mr-1"
              @click="showBanner = false"
            >
              <Icon name="i-lucide-x" class="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Transition>

    <!-- ═══ CONNECTION SOURCE ════════════════════════════════════════════════ -->
    <Card class="relative border-border/50 bg-card/80 backdrop-blur-sm">
      <!-- Animated gradient top bar -->
      <div
        class="absolute top-0 left-0 w-full h-1 rounded-t-xl bg-gradient-to-r transition-all duration-700 ease-out"
        :class="{
          'from-blue-500 via-indigo-500 to-violet-500': activeSourceOption.accentColor === 'blue',
          'from-emerald-500 via-teal-500 to-cyan-500': activeSourceOption.accentColor === 'emerald',
          'from-orange-500 via-amber-500 to-yellow-500': activeSourceOption.accentColor === 'orange',
          'from-rose-500 via-pink-500 to-fuchsia-500': activeSourceOption.accentColor === 'rose',
          'from-purple-500 via-violet-500 to-indigo-500': activeSourceOption.accentColor === 'purple',
        }"
      />

      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-sm font-semibold">
          <div
            class="flex items-center justify-center size-7 rounded-lg transition-colors duration-300"
            :class="{
              'bg-blue-500/10 text-blue-500': activeSourceOption.accentColor === 'blue',
              'bg-emerald-500/10 text-emerald-500': activeSourceOption.accentColor === 'emerald',
              'bg-orange-500/10 text-orange-500': activeSourceOption.accentColor === 'orange',
              'bg-rose-500/10 text-rose-500': activeSourceOption.accentColor === 'rose',
              'bg-purple-500/10 text-purple-500': activeSourceOption.accentColor === 'purple',
            }"
          >
            <Icon name="i-lucide-plug-zap" class="size-3.5" />
          </div>
          Connection Sources
          <Badge
            variant="outline"
            class="ml-auto text-[10px] gap-1.5 font-medium transition-all duration-300"
            :class="{
              'border-blue-500/40 text-blue-500 bg-blue-500/5': activeSourceOption.accentColor === 'blue',
              'border-emerald-500/40 text-emerald-500 bg-emerald-500/5': activeSourceOption.accentColor === 'emerald',
              'border-orange-500/40 text-orange-500 bg-orange-500/5': activeSourceOption.accentColor === 'orange',
              'border-rose-500/40 text-rose-500 bg-rose-500/5': activeSourceOption.accentColor === 'rose',
              'border-purple-500/40 text-purple-500 bg-purple-500/5': activeSourceOption.accentColor === 'purple',
            }"
          >
            <span class="relative flex size-1.5">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                :class="{
                  'bg-blue-400': activeSourceOption.accentColor === 'blue',
                  'bg-emerald-400': activeSourceOption.accentColor === 'emerald',
                  'bg-orange-400': activeSourceOption.accentColor === 'orange',
                  'bg-rose-400': activeSourceOption.accentColor === 'rose',
                  'bg-purple-400': activeSourceOption.accentColor === 'purple',
                }"
              />
              <span
                class="relative inline-flex rounded-full size-1.5"
                :class="{
                  'bg-blue-500': activeSourceOption.accentColor === 'blue',
                  'bg-emerald-500': activeSourceOption.accentColor === 'emerald',
                  'bg-orange-500': activeSourceOption.accentColor === 'orange',
                  'bg-rose-500': activeSourceOption.accentColor === 'rose',
                  'bg-purple-500': activeSourceOption.accentColor === 'purple',
                }"
              />
            </span>
            Connected
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div ref="sourceDropdownRef" class="relative">
          <button
            ref="sourceBtnRef"
            type="button"
            class="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-300 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            :class="[
              sourceDropdownOpen
                ? 'border-primary/60 bg-muted/30 shadow-lg'
                : {
                    'border-blue-500/40 bg-blue-500/5 hover:border-blue-500/60': activeSourceOption.accentColor === 'blue',
                    'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60': activeSourceOption.accentColor === 'emerald',
                    'border-orange-500/40 bg-orange-500/5 hover:border-orange-500/60': activeSourceOption.accentColor === 'orange',
                    'border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60': activeSourceOption.accentColor === 'rose',
                    'border-purple-500/40 bg-purple-500/5 hover:border-purple-500/60': activeSourceOption.accentColor === 'purple',
                  },
            ]"
            @click="toggleSourceDropdown"
          >
            <!-- Selected source icon -->
            <div
              class="flex items-center justify-center size-10 rounded-xl shrink-0 transition-all duration-300 ring-1"
              :class="{
                'bg-blue-500/15 text-blue-500 ring-blue-500/30': activeSourceOption.accentColor === 'blue',
                'bg-emerald-500/15 text-emerald-500 ring-emerald-500/30': activeSourceOption.accentColor === 'emerald',
                'bg-orange-500/15 text-orange-500 ring-orange-500/30': activeSourceOption.accentColor === 'orange',
                'bg-rose-500/15 text-rose-500 ring-rose-500/30': activeSourceOption.accentColor === 'rose',
                'bg-purple-500/15 text-purple-500 ring-purple-500/30': activeSourceOption.accentColor === 'purple',
              }"
            >
              <Icon :name="activeSourceOption.icon" class="size-5" />
            </div>

            <!-- Selected source text -->
            <div class="flex-1 min-w-0">
              <p
                class="text-sm font-semibold transition-colors duration-300"
                :class="{
                  'text-blue-500': activeSourceOption.accentColor === 'blue',
                  'text-emerald-500': activeSourceOption.accentColor === 'emerald',
                  'text-orange-500': activeSourceOption.accentColor === 'orange',
                  'text-rose-500': activeSourceOption.accentColor === 'rose',
                  'text-purple-500': activeSourceOption.accentColor === 'purple',
                }"
              >
                {{ activeSourceOption.label }}
              </p>
              <p class="text-[11px] text-muted-foreground mt-0.5 truncate">{{ activeSourceOption.description }}</p>
            </div>

            <!-- Chevron + check -->
            <div class="flex items-center gap-2">
              <div
                class="flex items-center justify-center size-5 rounded-full"
                :class="{
                  'bg-blue-500 text-white': activeSourceOption.accentColor === 'blue',
                  'bg-emerald-500 text-white': activeSourceOption.accentColor === 'emerald',
                  'bg-orange-500 text-white': activeSourceOption.accentColor === 'orange',
                  'bg-rose-500 text-white': activeSourceOption.accentColor === 'rose',
                  'bg-purple-500 text-white': activeSourceOption.accentColor === 'purple',
                }"
              >
                <Icon name="i-lucide-check" class="size-3" />
              </div>
              <Icon
                name="i-lucide-chevrons-up-down"
                class="size-4 text-muted-foreground transition-transform duration-200"
                :class="sourceDropdownOpen ? 'rotate-180' : ''"
              />
            </div>
          </button>

          <!-- Dropdown — teleported to body -->
          <Teleport to="body">
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-1 scale-[0.98]"
              enter-to-class="opacity-100 translate-y-0 scale-100"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0 -translate-y-1 scale-[0.98]"
            >
              <div
                v-if="sourceDropdownOpen"
                class="fixed z-[9999] rounded-xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden"
                :style="sourceDropdownStyle"
              >
                <div class="p-1.5">
                  <p class="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest px-3 py-1.5">Available Sources</p>
                  <button
                    v-for="option in sourceOptions"
                    :key="option.key"
                    type="button"
                    class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group"
                    :class="[
                      selectedSource === option.key
                        ? {
                            'bg-blue-500/10': option.accentColor === 'blue',
                            'bg-emerald-500/10': option.accentColor === 'emerald',
                            'bg-orange-500/10': option.accentColor === 'orange',
                            'bg-rose-500/10': option.accentColor === 'rose',
                            'bg-purple-500/10': option.accentColor === 'purple',
                          }
                        : 'hover:bg-muted/60',
                    ]"
                    @click="selectSource(option.key)"
                  >
                    <div
                      class="flex items-center justify-center size-9 rounded-lg shrink-0 transition-all duration-200"
                      :class="[
                        selectedSource === option.key
                          ? {
                              'bg-blue-500/15 text-blue-500 ring-1 ring-blue-500/30': option.accentColor === 'blue',
                              'bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30': option.accentColor === 'emerald',
                              'bg-orange-500/15 text-orange-500 ring-1 ring-orange-500/30': option.accentColor === 'orange',
                              'bg-rose-500/15 text-rose-500 ring-1 ring-rose-500/30': option.accentColor === 'rose',
                              'bg-purple-500/15 text-purple-500 ring-1 ring-purple-500/30': option.accentColor === 'purple',
                            }
                          : 'bg-muted/60 text-muted-foreground group-hover:bg-muted',
                      ]"
                    >
                      <Icon :name="option.icon" class="size-4" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p
                        class="text-sm font-semibold transition-colors"
                        :class="[
                          selectedSource === option.key
                            ? {
                                'text-blue-500': option.accentColor === 'blue',
                                'text-emerald-500': option.accentColor === 'emerald',
                                'text-orange-500': option.accentColor === 'orange',
                                'text-rose-500': option.accentColor === 'rose',
                                'text-purple-500': option.accentColor === 'purple',
                              }
                            : 'text-foreground',
                        ]"
                      >
                        {{ option.label }}
                      </p>
                      <p class="text-[10px] text-muted-foreground truncate">{{ option.description }}</p>
                    </div>
                    <Transition
                      enter-active-class="transition-all duration-200 ease-out"
                      enter-from-class="opacity-0 scale-50"
                      enter-to-class="opacity-100 scale-100"
                      leave-active-class="transition-all duration-150 ease-in"
                      leave-from-class="opacity-100 scale-100"
                      leave-to-class="opacity-0 scale-50"
                    >
                      <div
                        v-if="selectedSource === option.key"
                        class="flex items-center justify-center size-5 rounded-full shrink-0"
                        :class="{
                          'bg-blue-500 text-white': option.accentColor === 'blue',
                          'bg-emerald-500 text-white': option.accentColor === 'emerald',
                          'bg-orange-500 text-white': option.accentColor === 'orange',
                          'bg-rose-500 text-white': option.accentColor === 'rose',
                          'bg-purple-500 text-white': option.accentColor === 'purple',
                        }"
                      >
                        <Icon name="i-lucide-check" class="size-3" />
                      </div>
                    </Transition>
                  </button>
                </div>
              </div>
            </Transition>
          </Teleport>
        </div>
      </CardContent>
    </Card>

    <!-- ═══ TARGET DATABASE & COLLECTION ════════════════════════════════════ -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

      <!-- Target Database Combobox -->
      <Card class="relative border-border/50 bg-card/80 backdrop-blur-sm">
        <div class="absolute top-0 left-0 w-full h-0.5 rounded-t-xl bg-gradient-to-r from-primary/80 via-primary to-primary/40" />
        <CardHeader class="pb-3">
          <CardTitle class="flex items-center gap-2 text-sm font-semibold">
            <div class="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary">
              <Icon name="i-lucide-database" class="size-3.5" />
            </div>
            Target Database
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="relative">
            <div class="relative">
              <input
                ref="dbInputRef"
                v-model="database"
                placeholder="Select an existing database…"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 pr-8 py-1 text-sm font-mono shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                autocomplete="off"
                @focus="onDbFocus"
                @blur="onDbBlur"
              >
              <div class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <Icon v-if="loadingDatabases" name="i-lucide-loader-2" class="size-3.5 animate-spin text-muted-foreground" />
                <Icon v-else name="i-lucide-chevrons-up-down" class="size-3.5 text-muted-foreground" />
              </div>
            </div>

            <!-- Dropdown — teleported to body -->
            <Teleport to="body">
              <Transition
                enter-active-class="transition-all duration-150 ease-out"
                enter-from-class="opacity-0 -translate-y-1 scale-[0.98]"
                enter-to-class="opacity-100 translate-y-0 scale-100"
                leave-active-class="transition-all duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0 scale-[0.98]"
              >
                <div
                  v-if="dbDropdownOpen && filteredDatabases.length > 0"
                  class="fixed z-[9999] rounded-lg border border-border/60 bg-popover shadow-xl overflow-hidden"
                  :style="dbDropdownStyle"
                >
                  <div class="p-1">
                    <p class="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest px-2 py-1">Existing Databases</p>
                    <button
                      v-for="db in filteredDatabases"
                      :key="db"
                      type="button"
                      class="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm font-mono hover:bg-muted/60 transition-colors text-left"
                      :class="database === db ? 'bg-primary/10 text-primary' : ''"
                      @mousedown.prevent="selectDatabase(db)"
                    >
                      <Icon name="i-lucide-database" class="size-3.5 shrink-0" :class="database === db ? 'text-primary' : 'text-muted-foreground'" />
                      {{ db }}
                      <Icon v-if="database === db" name="i-lucide-check" class="size-3.5 ml-auto text-primary" />
                    </button>
                  </div>
                </div>
              </Transition>
            </Teleport>
          </div>

          <p class="text-[11px] text-muted-foreground mt-2">
            Select an existing database — only existing databases are shown.
          </p>
        </CardContent>
      </Card>

      <!-- Target Collection Combobox -->
      <Card class="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500/80 via-emerald-500 to-emerald-500/40" />
        <CardHeader class="pb-3">
          <CardTitle class="flex items-center gap-2 text-sm font-semibold">
            <div class="flex items-center justify-center size-7 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Icon name="i-lucide-layers" class="size-3.5" />
            </div>
            Target Collection
            <Badge v-if="!database.trim()" variant="outline" class="ml-auto text-[9px] border-muted-foreground/30 text-muted-foreground">
              Select DB first
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="relative">
            <div class="relative">
              <input
                ref="colInputRef"
                v-model="collection"
                placeholder="Select an existing collection…"
                :disabled="!database.trim()"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 pr-8 py-1 text-sm font-mono shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                autocomplete="off"
                @focus="onColFocus"
                @blur="onColBlur"
              >
              <div class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <Icon v-if="loadingCollections" name="i-lucide-loader-2" class="size-3.5 animate-spin text-muted-foreground" />
                <Icon v-else name="i-lucide-chevrons-up-down" class="size-3.5 text-muted-foreground" />
              </div>
            </div>

            <!-- Dropdown — teleported to body -->
            <Teleport to="body">
              <Transition
                enter-active-class="transition-all duration-150 ease-out"
                enter-from-class="opacity-0 -translate-y-1 scale-[0.98]"
                enter-to-class="opacity-100 translate-y-0 scale-100"
                leave-active-class="transition-all duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0 scale-[0.98]"
              >
                <div
                  v-if="colDropdownOpen && filteredCollections.length > 0"
                  class="fixed z-[9999] rounded-lg border border-border/60 bg-popover shadow-xl overflow-hidden"
                  :style="colDropdownStyle"
                >
                  <div class="p-1">
                    <p class="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest px-2 py-1">Existing Collections</p>
                    <button
                      v-for="col in filteredCollections"
                      :key="col"
                      type="button"
                      class="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm font-mono hover:bg-muted/60 transition-colors text-left"
                      :class="collection === col ? 'bg-emerald-500/10 text-emerald-500' : ''"
                      @mousedown.prevent="selectCollection(col)"
                    >
                      <Icon name="i-lucide-table-2" class="size-3.5 shrink-0" :class="collection === col ? 'text-emerald-500' : 'text-muted-foreground'" />
                      {{ col }}
                      <Icon v-if="collection === col" name="i-lucide-check" class="size-3.5 ml-auto text-emerald-500" />
                    </button>
                  </div>
                </div>
              </Transition>
            </Teleport>
          </div>

          <p class="text-[11px] text-muted-foreground mt-2">
            <span v-if="collection" class="text-emerald-500 font-mono">{{ collection }}</span>
            <span v-else>The collection whose documents will receive the embedded array.</span>
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- ═══ ARRAY CONFIGURATION ═══════════════════════════════════════════ -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
    >
      <Card v-if="database.trim() && collection.trim()" class="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-violet-500/80 via-violet-500 to-violet-500/40" />
        <CardHeader class="pb-3">
          <CardTitle class="flex items-center gap-2 text-sm font-semibold">
            <div class="flex items-center justify-center size-7 rounded-lg bg-violet-500/10 text-violet-500">
              <Icon name="i-lucide-list-plus" class="size-3.5" />
            </div>
            Array Configuration
            <Badge
              v-if="arrayFieldName.trim() && collectionMatchField.trim()"
              variant="outline"
              class="ml-auto text-[9px] border-violet-500/40 text-violet-500 bg-violet-500/5"
            >
              Ready
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent class="grid gap-6">

          <!-- a) Array Field Name -->
          <div class="grid gap-2">
            <label class="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Icon name="i-lucide-brackets" class="size-3.5 text-violet-500" />
              Array Field Name
            </label>
            <div class="relative">
              <input
                v-model="arrayFieldName"
                placeholder="e.g. relatedContacts"
                :disabled="!isArrayConfigReady"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                autocomplete="off"
              >
            </div>
            <p class="text-[11px] text-muted-foreground">
              Lowercase letters, numbers, underscores recommended
              <span v-if="arrayFieldName.trim()" class="ml-1.5 font-mono text-violet-500">→ {{ arrayFieldName.trim() }}</span>
            </p>
          </div>

          <!-- b) Match Against Collection Field combobox -->
          <div class="grid gap-2">
            <label class="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Icon name="i-lucide-key-round" class="size-3.5 text-violet-500" />
              Match Against Collection Field
            </label>
            <div class="relative">
              <input
                ref="fieldInputRef"
                v-model="collectionMatchField"
                placeholder="e.g. legacyId, _id, email…"
                :disabled="!isArrayConfigReady"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 pr-8 py-1 text-sm font-mono shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                autocomplete="off"
                @focus="onFieldFocus"
                @blur="onFieldBlur"
              >
              <div class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <Icon v-if="loadingFields" name="i-lucide-loader-2" class="size-3.5 animate-spin text-muted-foreground" />
                <Icon v-else name="i-lucide-chevrons-up-down" class="size-3.5 text-muted-foreground" />
              </div>

              <!-- Field dropdown — teleported to body -->
              <Teleport to="body">
                <Transition
                  enter-active-class="transition-all duration-150 ease-out"
                  enter-from-class="opacity-0 -translate-y-1 scale-[0.98]"
                  enter-to-class="opacity-100 translate-y-0 scale-100"
                  leave-active-class="transition-all duration-100 ease-in"
                  leave-from-class="opacity-100"
                  leave-to-class="opacity-0 scale-[0.98]"
                >
                  <div
                    v-if="fieldDropdownOpen && filteredFields.length > 0"
                    class="fixed z-[9999] rounded-lg border border-border/60 bg-popover shadow-xl overflow-hidden"
                    :style="fieldDropdownStyle"
                  >
                    <div class="p-1 max-h-56 overflow-y-auto">
                      <p class="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest px-2 py-1">Collection Fields</p>
                      <button
                        v-for="field in filteredFields"
                        :key="field"
                        type="button"
                        class="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm font-mono hover:bg-muted/60 transition-colors text-left"
                        :class="collectionMatchField === field ? 'bg-violet-500/10 text-violet-500' : ''"
                        @mousedown.prevent="selectMatchField(field)"
                      >
                        <Icon
                          name="i-lucide-tag"
                          class="size-3.5 shrink-0"
                          :class="collectionMatchField === field ? 'text-violet-500' : 'text-muted-foreground'"
                        />
                        {{ field }}
                        <Icon v-if="collectionMatchField === field" name="i-lucide-check" class="size-3.5 ml-auto text-violet-500" />
                      </button>
                    </div>
                  </div>
                </Transition>
              </Teleport>
            </div>
            <p class="text-[11px] text-muted-foreground">
              The field in <span class="font-mono text-foreground/80">{{ collection }}</span> whose value must match the chosen CSV column.
            </p>
          </div>

          <!-- c) Read-only summary -->
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
          >
            <div
              v-if="arrayFieldName.trim() && collectionMatchField.trim()"
              class="flex items-start gap-3 rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3"
            >
              <Icon name="i-lucide-info" class="size-4 text-violet-500 shrink-0 mt-0.5" />
              <p class="text-[12px] text-muted-foreground leading-relaxed">
                Each row in your CSV will be embedded inside
                <span class="font-mono text-foreground/90">{{ collection }}.<span class="text-violet-400">{{ arrayFieldName.trim() }}</span></span>
                on the document whose
                <span class="font-mono text-foreground/90">{{ collectionMatchField }}</span>
                matches the chosen CSV column.
              </p>
            </div>
          </Transition>

        </CardContent>
      </Card>
    </Transition>

    <!-- ═══ CSV FILE ══════════════════════════════════════════════════════════ -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
    >
      <Card v-if="arrayFieldName.trim() && collectionMatchField.trim()" class="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-violet-500/80 via-violet-500 to-violet-500/40" />
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <CardTitle class="flex items-center gap-2 text-sm font-semibold">
              <div class="flex items-center justify-center size-7 rounded-lg bg-violet-500/10 text-violet-500">
                <Icon name="i-lucide-file-up" class="size-3.5" />
              </div>
              CSV File
            </CardTitle>
            <div v-if="csvFile" class="flex items-center gap-2">
              <Badge variant="secondary" class="text-[10px] font-mono gap-1">
                <Icon name="i-lucide-rows-3" class="size-3" />
                {{ formatNumber(csvRowCount) }} rows
              </Badge>
              <Badge variant="secondary" class="text-[10px] font-mono gap-1">
                <Icon name="i-lucide-columns-3" class="size-3" />
                {{ csvPreviewHeaders.length }} fields
              </Badge>
              <Badge variant="secondary" class="text-[10px] font-mono gap-1">
                <Icon name="i-lucide-hard-drive" class="size-3" />
                {{ formatBytes(csvFile.size) }}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent class="grid gap-6">

          <!-- Drop Zone -->
          <div
            v-if="!csvFile"
            class="relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer group"
            :class="dragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border/60 hover:border-primary/50 hover:bg-muted/30'"
            @dragover.prevent="dragActive = true"
            @dragleave="dragActive = false"
            @drop="handleDrop"
            @click="($refs.fileInput as HTMLInputElement)?.click()"
          >
            <input ref="fileInput" type="file" accept=".csv" class="hidden" @change="handleFileInput">
            <div class="flex flex-col items-center gap-3">
              <div class="flex items-center justify-center size-14 rounded-2xl bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                <Icon name="i-lucide-cloud-upload" class="size-7" />
              </div>
              <div>
                <p class="text-sm font-medium">Drop your CSV file here or <span class="text-primary underline underline-offset-2">browse</span></p>
                <p class="text-xs text-muted-foreground mt-1">Supports any CSV file with headers in the first row</p>
              </div>
            </div>
          </div>

          <!-- File loaded -->
          <div v-else>
            <div class="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/40 mb-4">
              <div class="flex items-center justify-center size-10 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <Icon name="i-lucide-file-check" class="size-5" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ csvFileName }}</p>
                <p class="text-xs text-muted-foreground">{{ formatNumber(csvRowCount) }} records ready for embedding</p>
              </div>
              <Button variant="ghost" size="sm" class="size-8 p-0 text-muted-foreground hover:text-destructive" @click="removeFile">
                <Icon name="i-lucide-x" class="size-4" />
              </Button>
            </div>

            <!-- Preview Table -->
            <div v-if="csvPreviewRows.length" class="rounded-lg border border-border/40 overflow-hidden">
              <div class="px-3 py-2 bg-muted/30 border-b border-border/30 flex items-center justify-between">
                <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Data Preview</span>
                <span class="text-[10px] text-muted-foreground">Showing first {{ csvPreviewRows.length }} of {{ formatNumber(csvRowCount) }} rows</span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="bg-muted/20">
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">#</th>
                      <th
                        v-for="h in csvPreviewHeaders"
                        :key="h"
                        class="px-3 py-2 text-left font-medium whitespace-nowrap transition-colors"
                        :class="[
                          h === csvMatchField ? 'text-violet-400' : '',
                          excludeFields.includes(h) && h !== csvMatchField ? 'text-muted-foreground/40 line-through' : '',
                          !excludeFields.includes(h) && h !== csvMatchField ? 'text-muted-foreground' : '',
                        ]"
                      >
                        <div class="flex items-center gap-1">
                          <Icon v-if="h === csvMatchField" name="i-lucide-key-round" class="size-2.5 text-violet-400" />
                          {{ h }}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, idx) in csvPreviewRows" :key="idx" class="border-t border-border/20 hover:bg-muted/20 transition-colors">
                      <td class="px-3 py-1.5 text-muted-foreground font-mono">{{ idx + 1 }}</td>
                      <td
                        v-for="h in csvPreviewHeaders"
                        :key="h"
                        class="px-3 py-1.5 font-mono max-w-[200px] truncate"
                        :class="[
                          !row[h] ? 'text-muted-foreground/40 italic' : '',
                          h === csvMatchField ? 'text-violet-400/80' : '',
                          excludeFields.includes(h) && h !== csvMatchField ? 'opacity-30' : '',
                        ]"
                      >
                        {{ row[h] || 'null' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ─── CSV Match Field ─────────────────────────────────────────────── -->
          <Transition
            enter-active-class="transition-all duration-250 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
          >
            <div v-if="csvFile" class="grid gap-2">
              <label class="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Icon name="i-lucide-link-2" class="size-3.5 text-violet-500" />
                CSV Match Field
              </label>
              <select
                v-model="csvMatchField"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="" disabled>Select the column that matches {{ collectionMatchField || 'collection field' }}…</option>
                <option v-for="h in csvPreviewHeaders" :key="h" :value="h">{{ h }}</option>
              </select>
              <p class="text-[11px] text-muted-foreground">
                The CSV column whose value will be matched against
                <span class="font-mono text-foreground/80">{{ collectionMatchField }}</span>
                in the database.
              </p>
            </div>
          </Transition>

          <!-- ─── Fields to Exclude ──────────────────────────────────────────── -->
          <Transition
            enter-active-class="transition-all duration-250 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
          >
            <div v-if="csvFile && csvPreviewHeaders.length" class="grid gap-3">
              <label class="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Icon name="i-lucide-eye-off" class="size-3.5 text-violet-500" />
                Fields to Exclude From Embedded Object
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                <label
                  v-for="h in csvPreviewHeaders"
                  :key="h"
                  class="flex items-center gap-2 text-sm font-mono cursor-pointer select-none group"
                  :class="h === csvMatchField ? 'cursor-not-allowed opacity-60' : ''"
                >
                  <input
                    type="checkbox"
                    :checked="excludeFields.includes(h)"
                    :disabled="h === csvMatchField"
                    class="rounded border-input accent-violet-500"
                    @change="toggleExclude(h)"
                  >
                  <span
                    class="truncate transition-colors"
                    :class="[
                      excludeFields.includes(h) ? 'text-muted-foreground/50 line-through' : 'text-foreground',
                      h === csvMatchField ? 'text-violet-400' : '',
                    ]"
                  >
                    {{ h }}
                    <Badge v-if="h === csvMatchField" class="ml-1 text-[8px] h-3.5 px-1 bg-violet-500/10 text-violet-400 border-violet-500/30" variant="outline">key</Badge>
                  </span>
                </label>
              </div>

              <!-- Live chip preview of embedded fields -->
              <div v-if="embeddedFields.length" class="mt-1 rounded-lg border border-border/40 bg-muted/20 p-3">
                <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Each embedded object will contain:</p>
                <div class="flex flex-wrap gap-1.5">
                  <Badge
                    v-for="f in embeddedFields"
                    :key="f"
                    variant="outline"
                    class="text-[10px] font-mono gap-1 px-2 py-0.5 border-emerald-500/40 text-emerald-400 bg-emerald-500/5"
                  >
                    <Icon name="i-lucide-braces" class="size-2.5 text-emerald-500" />
                    {{ f }}
                  </Badge>
                </div>
              </div>
              <p v-else class="text-[11px] text-destructive">
                All fields are excluded — at least one field must remain embedded.
              </p>
            </div>
          </Transition>

          <!-- ─── Batch Size ──────────────────────────────────────────────────── -->
          <Transition
            enter-active-class="transition-all duration-250 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
          >
            <div v-if="csvFile" class="grid gap-2">
              <label class="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Icon name="i-lucide-layers-2" class="size-3.5 text-violet-500" />
                Batch Size
              </label>
              <div class="flex items-center gap-3">
                <input
                  v-model.number="batchSize"
                  type="number"
                  min="1"
                  max="5000"
                  step="100"
                  class="flex h-9 w-36 rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                <p class="text-[11px] text-muted-foreground">Records processed per batch. Lower values are safer for large documents.</p>
              </div>
            </div>
          </Transition>

        </CardContent>
      </Card>
    </Transition>

    <!-- ═══ ACTION BAR ═══════════════════════════════════════════════════ -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
    >
      <div v-if="isFormValid || embedStatus !== 'idle'" class="flex items-center justify-between gap-4">
        <!-- Status summary -->
        <div class="flex items-center gap-2 text-[12px] text-muted-foreground min-w-0">
          <template v-if="embedStatus === 'idle'">
            <Icon name="i-lucide-circle-check" class="size-4 text-emerald-500 shrink-0" />
            All fields configured — ready to embed.
          </template>
          <template v-else-if="embedStatus === 'parsing'">
            <Icon name="i-lucide-loader-2" class="size-4 animate-spin text-violet-500 shrink-0" />
            Parsing CSV…
          </template>
          <template v-else-if="embedStatus === 'processing'">
            <Icon name="i-lucide-loader-2" class="size-4 animate-spin text-violet-500 shrink-0" />
            <span>Embedding… <span class="font-mono text-foreground">{{ progress.percentage }}%</span></span>
          </template>
          <template v-else-if="embedStatus === 'done'">
            <Icon name="i-lucide-circle-check-big" class="size-4 text-emerald-500 shrink-0" />
            <span class="text-emerald-400 font-medium">Done — {{ progress.matched.toLocaleString() }} rows embedded into {{ progress.documentsUpdated.toLocaleString() }} documents.</span>
          </template>
          <template v-else-if="embedStatus === 'error'">
            <Icon name="i-lucide-circle-x" class="size-4 text-destructive shrink-0" />
            <span class="text-destructive truncate">{{ progress.message }}</span>
          </template>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <!-- Reset button when done/error -->
          <Button
            v-if="embedStatus === 'done' || embedStatus === 'error'"
            variant="outline"
            size="sm"
            class="gap-1.5"
            @click="resetEmbed"
          >
            <Icon name="i-lucide-refresh-ccw" class="size-3.5" />
            Embed Another
          </Button>

          <!-- Start button -->
          <Button
            v-if="embedStatus === 'idle' || embedStatus === 'parsing' || embedStatus === 'processing'"
            :disabled="!isFormValid || isRunning"
            class="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            @click="startEmbed"
          >
            <Icon v-if="isRunning" name="i-lucide-loader-2" class="size-4 animate-spin" />
            <Icon v-else name="i-lucide-zap" class="size-4" />
            {{ isRunning ? 'Embedding…' : 'Start Embedding' }}
          </Button>
        </div>
      </div>
    </Transition>

    <!-- ═══ PROGRESS CARD ═══════════════════════════════════════════════ -->
    <Transition
      enter-active-class="transition-all duration-400 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
    >
      <Card v-if="embedStatus !== 'idle'" class="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <!-- Gradient top bar — green when done, red when error, violet while running -->
        <div
          class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r transition-colors duration-500"
          :class="{
            'from-emerald-500/80 via-emerald-500 to-emerald-500/40': embedStatus === 'done',
            'from-destructive/80 via-destructive to-destructive/40': embedStatus === 'error',
            'from-violet-500/80 via-violet-500 to-violet-500/40': embedStatus === 'parsing' || embedStatus === 'processing',
          }"
        />

        <CardHeader class="pb-3">
          <CardTitle class="flex items-center gap-2 text-sm font-semibold">
            <div
              class="flex items-center justify-center size-7 rounded-lg transition-colors"
              :class="{
                'bg-emerald-500/10 text-emerald-500': embedStatus === 'done',
                'bg-destructive/10 text-destructive': embedStatus === 'error',
                'bg-violet-500/10 text-violet-500': embedStatus === 'parsing' || embedStatus === 'processing',
              }"
            >
              <Icon v-if="isRunning" name="i-lucide-loader-2" class="size-3.5 animate-spin" />
              <Icon v-else-if="embedStatus === 'done'" name="i-lucide-circle-check-big" class="size-3.5" />
              <Icon v-else name="i-lucide-circle-x" class="size-3.5" />
            </div>
            Embedding Progress
            <Badge
              variant="outline"
              class="ml-auto text-[9px] font-mono"
              :class="{
                'border-emerald-500/40 text-emerald-500 bg-emerald-500/5': embedStatus === 'done',
                'border-destructive/40 text-destructive bg-destructive/5': embedStatus === 'error',
                'border-violet-500/40 text-violet-500 bg-violet-500/5': isRunning,
              }"
            >
              {{ progress.percentage }}%
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent class="grid gap-5">

          <!-- Progress bar -->
          <div class="h-2 rounded-full bg-muted/40 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500 ease-out"
              :class="{
                'bg-emerald-500': embedStatus === 'done',
                'bg-destructive': embedStatus === 'error',
                'bg-violet-500': isRunning,
              }"
              :style="{ width: `${progress.percentage}%` }"
            />
          </div>

          <!-- Status message -->
          <p class="text-xs text-muted-foreground font-mono leading-relaxed">{{ progress.message }}</p>

          <!-- Stat tiles — 2x2 on mobile, 4-col on md+ -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <!-- Matched -->
            <div class="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p class="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Matched Rows</p>
              <p class="text-xl font-bold font-mono text-emerald-400">{{ progress.matched.toLocaleString() }}</p>
              <p class="text-[10px] text-muted-foreground mt-0.5">of {{ progress.total.toLocaleString() }} total</p>
            </div>
            <!-- Unmatched -->
            <div
              class="rounded-lg border p-3 transition-colors"
              :class="progress.unmatched > 0 ? 'border-amber-500/20 bg-amber-500/5' : 'border-border/40 bg-muted/10'"
            >
              <p class="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Unmatched</p>
              <p
                class="text-xl font-bold font-mono"
                :class="progress.unmatched > 0 ? 'text-amber-400' : 'text-muted-foreground'"
              >
                {{ progress.unmatched.toLocaleString() }}
              </p>
              <p class="text-[10px] text-muted-foreground mt-0.5">rows skipped</p>
            </div>
            <!-- Documents Updated -->
            <div class="rounded-lg border border-border/40 bg-muted/10 p-3">
              <p class="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Docs Updated</p>
              <p class="text-xl font-bold font-mono text-foreground">{{ progress.documentsUpdated.toLocaleString() }}</p>
              <p class="text-[10px] text-muted-foreground mt-0.5">documents modified</p>
            </div>
            <!-- Speed / Elapsed / ETA -->
            <div class="rounded-lg border border-border/40 bg-muted/10 p-3">
              <p class="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Performance</p>
              <p class="text-xl font-bold font-mono text-foreground">{{ progress.speed.toLocaleString() }}<span class="text-[11px] font-normal text-muted-foreground">/s</span></p>
              <p class="text-[10px] text-muted-foreground mt-0.5">
                {{ formatDuration(progress.elapsed) }} elapsed
                <template v-if="isRunning && progress.eta > 0">&bull; ~{{ formatDuration(progress.eta * 1000) }} left</template>
              </p>
            </div>
          </div>

          <!-- Unmatched samples panel -->
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
          >
            <div v-if="progress.unmatchedSamples.length > 0" class="rounded-lg border border-amber-500/25 bg-amber-500/5 overflow-hidden">
              <button
                type="button"
                class="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-amber-500/5 transition-colors"
                @click="showUnmatched = !showUnmatched"
              >
                <Icon name="i-lucide-triangle-alert" class="size-3.5 text-amber-500 shrink-0" />
                <span class="text-xs font-medium text-amber-400 flex-1">
                  {{ progress.unmatched.toLocaleString() }} unmatched rows — {{ progress.unmatchedSamples.length }} sample key{{ progress.unmatchedSamples.length !== 1 ? 's' : '' }}
                </span>
                <Icon
                  name="i-lucide-chevron-down"
                  class="size-3.5 text-amber-500 transition-transform duration-200"
                  :class="showUnmatched ? 'rotate-180' : ''"
                />
              </button>
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-96"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="opacity-100 max-h-96"
                leave-to-class="opacity-0 max-h-0"
              >
                <div v-if="showUnmatched" class="border-t border-amber-500/20 px-4 py-3">
                  <p class="text-[10px] text-muted-foreground mb-2">These CSV values for <span class="font-mono text-amber-400">{{ csvMatchField }}</span> had no matching <span class="font-mono text-amber-400">{{ collectionMatchField }}</span> in the collection:</p>
                  <div class="flex flex-wrap gap-1.5">
                    <Badge
                      v-for="key in progress.unmatchedSamples"
                      :key="key"
                      variant="outline"
                      class="text-[10px] font-mono border-amber-500/40 text-amber-400 bg-amber-500/5"
                    >
                      {{ key }}
                    </Badge>
                  </div>
                </div>
              </Transition>
            </div>
          </Transition>

        </CardContent>
      </Card>
    </Transition>

  </div>
</template>
