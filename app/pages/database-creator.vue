<script setup lang="ts">
import { nanoid } from 'nanoid'

const { setHeader } = usePageHeader()
setHeader({
  title: 'Database Creator',
  icon: 'i-lucide-database',
  description: 'Create databases, collections & import CSV data into MongoDB',
})

// ─── Connection Source ───────────────────────────────────────────────────────
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
]

const selectedSource = ref<string>('adeel')

const activeSourceOption = computed(() =>
  sourceOptions.find(s => s.key === selectedSource.value) || sourceOptions[0]!
)

const sourceDropdownOpen = ref(false)
const sourceDropdownRef = ref<HTMLDivElement | null>(null)

function toggleSourceDropdown() {
  if (isImporting.value) return
  sourceDropdownOpen.value = !sourceDropdownOpen.value
}

function selectSource(key: string) {
  selectedSource.value = key
  sourceDropdownOpen.value = false
}

// Close dropdown on outside click
function onSourceClickOutside(e: MouseEvent) {
  if (sourceDropdownRef.value && !sourceDropdownRef.value.contains(e.target as Node)) {
    sourceDropdownOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onSourceClickOutside))
onUnmounted(() => document.removeEventListener('click', onSourceClickOutside))

// Reset dependent state when source changes
watch(selectedSource, () => {
  availableDatabases.value = []
  availableCollections.value = []
  database.value = ''
  collection.value = ''
  checkResult.value = null
  references.value = []
})

// ─── State ───────────────────────────────────────────────────────────────────
const database = ref('')
const collection = ref('')
const csvFile = ref<File | null>(null)
const csvFileName = ref('')
const csvPreviewHeaders = ref<string[]>([])
const csvPreviewRows = ref<Record<string, string>[]>([])
const csvRowCount = ref(0)
const batchSize = ref(500)
const dragActive = ref(false)

// ─── Database Combobox ───────────────────────────────────────────────────────
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
  // Calculate fixed position from input element
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
  availableCollections.value = []
}

const filteredDatabases = computed(() => {
  const q = database.value.trim().toLowerCase()
  if (!q) return availableDatabases.value
  return availableDatabases.value.filter(d => d.toLowerCase().includes(q))
})

const isNewDatabase = computed(() => {
  const v = database.value.trim()
  return v !== '' && !availableDatabases.value.includes(v)
})

// ─── Reference System ─────────────────────────────────────────────────────────
interface ReferenceConfig {
  id: string
  localField: string        // CSV field to resolve (e.g. "Category")
  collection: string        // reference collection (e.g. "hardwoodDatabase_Categories")
  refField: string          // field in ref collection to match on (e.g. "Category")
  storeField: string        // output field name to store ObjectId as (e.g. "category_id")
  // UI state
  loadingFields: boolean
  availableFields: string[]
  error: string
}

const references = ref<ReferenceConfig[]>([])
const availableCollections = ref<string[]>([])
const loadingCollections = ref(false)

function addReference() {
  references.value.push({
    id: nanoid(6),
    localField: '',
    collection: '',
    refField: '',
    storeField: '',
    loadingFields: false,
    availableFields: [],
    error: '',
  })
}

function removeReference(id: string) {
  references.value = references.value.filter(r => r.id !== id)
}

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

async function onRefCollectionChange(ref: ReferenceConfig) {
  if (!ref.collection) {
    ref.availableFields = []
    ref.refField = ''
    return
  }
  ref.loadingFields = true
  ref.error = ''
  ref.availableFields = []
  ref.refField = ''
  try {
    const res: any = await $fetch(
      `/api/db/fields?database=${encodeURIComponent(database.value.trim())}&collection=${encodeURIComponent(ref.collection)}&source=${encodeURIComponent(selectedSource.value)}`,
    )
    ref.availableFields = res.fields || []
  }
  catch (e: any) {
    ref.error = 'Could not load fields'
  }
  ref.loadingFields = false
}

// Auto-set storeField when localField changes — default to same name (replaces text value with ObjectId in-place)
function onLocalFieldChange(ref: ReferenceConfig) {
  if (ref.localField && !ref.storeField) {
    ref.storeField = ref.localField
  }
}

// ─── Check State ──────────────────────────────────────────────────────────────
const checkResult = ref<{ dbExists: boolean, collectionExists: boolean, message: string } | null>(null)
const checking = ref(false)

// ─── Import State ─────────────────────────────────────────────────────────────
type ImportStatus = 'idle' | 'parsing' | 'importing' | 'done' | 'error'
const importStatus = ref<string>('idle') as Ref<ImportStatus>
const sessionId = ref('')
const progress = ref({
  total: 0,
  imported: 0,
  percentage: 0,
  batchesDone: 0,
  totalBatches: 0,
  message: '',
  fields: [] as string[],
  speed: 0,
  eta: 0,
  remainingRecords: 0,
  elapsed: 0,
})
let pollInterval: ReturnType<typeof setInterval> | null = null

// ─── Computed ─────────────────────────────────────────────────────────────────
const fullCollectionName = computed(() => {
  const db = database.value.trim()
  const col = collection.value.trim()
  if (!db || !col) return col
  return col.startsWith(`${db}_`) ? col : `${db}_${col}`
})

const isFormValid = computed(() => database.value.trim() && collection.value.trim() && csvFile.value)
const isImporting = computed(() => importStatus.value === 'importing' || importStatus.value === 'parsing')

const validReferences = computed(() =>
  references.value.filter(r => r.localField && r.collection && r.refField && r.storeField),
)

const referencedFields = computed(() => new Set(references.value.map(r => r.localField)))

// Watch database change → reset collections cache
watch(() => database.value, () => {
  availableCollections.value = []
})

// ─── CSV File Handling ────────────────────────────────────────────────────────
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
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length === 0) return

    const headers = parseCSVRow(lines[0]!)
    csvPreviewHeaders.value = headers
    csvRowCount.value = lines.length - 1

    const preview: Record<string, string>[] = []
    for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
      const vals = parseCSVRow(lines[i]!)
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h] = vals[idx] || '' })
      preview.push(row)
    }
    csvPreviewRows.value = preview

    if (!collection.value) {
      collection.value = file.name.replace('.csv', '').replace(/[^a-zA-Z0-9_]/g, '_')
    }

    // Reset references when new file loaded
    references.value = []
  }
  reader.readAsText(file)
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
  checkResult.value = null
  references.value = []
}

// ─── Check DB ─────────────────────────────────────────────────────────────────
async function checkDatabase() {
  checking.value = true
  checkResult.value = null
  try {
    const res = await $fetch('/api/db/check', {
      method: 'POST',
      body: { database: database.value.trim(), collection: fullCollectionName.value, source: selectedSource.value },
    })
    checkResult.value = res as any
    // Load collections for ref picker
    await loadCollections()
  }
  catch (err: any) {
    checkResult.value = { dbExists: false, collectionExists: false, message: err.data?.message || 'Connection failed' }
  }
  checking.value = false
}

// ─── Import ───────────────────────────────────────────────────────────────────
async function startImport() {
  if (!isFormValid.value || isImporting.value) return

  sessionId.value = nanoid()
  importStatus.value = 'parsing'
  progress.value = { total: 0, imported: 0, percentage: 0, batchesDone: 0, totalBatches: 0, message: 'Starting…', fields: [], speed: 0, eta: 0, remainingRecords: 0, elapsed: 0 }

  const formData = new FormData()
  formData.append('database', database.value.trim())
  formData.append('collection', fullCollectionName.value)
  formData.append('sessionId', sessionId.value)
  formData.append('batchSize', String(batchSize.value))
  formData.append('file', csvFile.value!)
  formData.append('source', selectedSource.value)
  formData.append('references', JSON.stringify(validReferences.value.map(r => ({
    localField: r.localField,
    collection: r.collection,
    refField: r.refField,
    storeField: r.storeField,
  }))))

  try {
    const res: any = await $fetch('/api/db/import', {
      method: 'POST',
      body: formData,
    })

    if (res.success) {
      importStatus.value = 'importing'
      startProgressPolling()
    }
  }
  catch (err: any) {
    importStatus.value = 'error'
    progress.value.message = err.data?.message || 'Import failed'
  }
}

function startProgressPolling() {
  if (pollInterval) clearInterval(pollInterval)
  pollInterval = setInterval(async () => {
    try {
      const res: any = await $fetch(`/api/db/progress?sessionId=${sessionId.value}`)
      progress.value = res
      importStatus.value = res.status
      if (res.status === 'done' || res.status === 'error') {
        if (pollInterval) clearInterval(pollInterval)
        pollInterval = null
      }
    }
    catch { /* silent */ }
  }, 300)
}

function resetAll() {
  removeFile()
  database.value = ''
  collection.value = ''
  importStatus.value = 'idle'
  progress.value = { total: 0, imported: 0, percentage: 0, batchesDone: 0, totalBatches: 0, message: '', fields: [], speed: 0, eta: 0, remainingRecords: 0, elapsed: 0 }
  checkResult.value = null
  references.value = []
  availableCollections.value = []
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
}

onUnmounted(() => { if (pollInterval) clearInterval(pollInterval) })

const formatNumber = (n: number) => n.toLocaleString()
const formatBytes = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
const formatDuration = (ms: number) => {
  if (ms < 1000) return ms + 'ms'
  const s = ms / 1000
  if (s < 60) return s.toFixed(1) + 's'
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}
</script>

<template>
  <div class="flex flex-col gap-6 max-w-5xl mx-auto pb-12">

    <!-- ═══ CONNECTION SOURCE ═════════════════════════════════════════════════ -->
    <Card class="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <!-- Animated gradient top bar -->
      <div
        class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r transition-all duration-700 ease-out"
        :class="{
          'from-blue-500 via-indigo-500 to-violet-500': activeSourceOption.accentColor === 'blue',
          'from-emerald-500 via-teal-500 to-cyan-500': activeSourceOption.accentColor === 'emerald',
          'from-orange-500 via-amber-500 to-yellow-500': activeSourceOption.accentColor === 'orange',
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
            }"
          >
            <span class="relative flex size-1.5">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                :class="{
                  'bg-blue-400': activeSourceOption.accentColor === 'blue',
                  'bg-emerald-400': activeSourceOption.accentColor === 'emerald',
                  'bg-orange-400': activeSourceOption.accentColor === 'orange',
                }"
              />
              <span
                class="relative inline-flex rounded-full size-1.5"
                :class="{
                  'bg-blue-500': activeSourceOption.accentColor === 'blue',
                  'bg-emerald-500': activeSourceOption.accentColor === 'emerald',
                  'bg-orange-500': activeSourceOption.accentColor === 'orange',
                }"
              />
            </span>
            Connected
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <!-- Dropdown Selector -->
        <div ref="sourceDropdownRef" class="relative">
          <button
            type="button"
            :disabled="isImporting"
            class="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-300 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="[
              sourceDropdownOpen
                ? 'border-primary/60 bg-muted/30 shadow-lg'
                : {
                    'border-blue-500/40 bg-blue-500/5 hover:border-blue-500/60': activeSourceOption.accentColor === 'blue',
                    'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60': activeSourceOption.accentColor === 'emerald',
                    'border-orange-500/40 bg-orange-500/5 hover:border-orange-500/60': activeSourceOption.accentColor === 'orange',
                  },
              isImporting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
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
                }"
              >
                {{ activeSourceOption.label }}
              </p>
              <p class="text-[11px] text-muted-foreground mt-0.5 truncate">{{ activeSourceOption.description }}</p>
            </div>

            <!-- Chevron -->
            <div class="flex items-center gap-2">
              <div
                class="flex items-center justify-center size-5 rounded-full"
                :class="{
                  'bg-blue-500 text-white': activeSourceOption.accentColor === 'blue',
                  'bg-emerald-500 text-white': activeSourceOption.accentColor === 'emerald',
                  'bg-orange-500 text-white': activeSourceOption.accentColor === 'orange',
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

          <!-- Dropdown panel -->
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
              class="absolute z-50 mt-2 w-full rounded-xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden"
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
                        }
                      : 'hover:bg-muted/60',
                  ]"
                  @click="selectSource(option.key)"
                >
                  <!-- Source icon -->
                  <div
                    class="flex items-center justify-center size-9 rounded-lg shrink-0 transition-all duration-200"
                    :class="[
                      selectedSource === option.key
                        ? {
                            'bg-blue-500/15 text-blue-500 ring-1 ring-blue-500/30': option.accentColor === 'blue',
                            'bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30': option.accentColor === 'emerald',
                            'bg-orange-500/15 text-orange-500 ring-1 ring-orange-500/30': option.accentColor === 'orange',
                          }
                        : 'bg-muted/60 text-muted-foreground group-hover:bg-muted',
                    ]"
                  >
                    <Icon :name="option.icon" class="size-4" />
                  </div>

                  <!-- Text -->
                  <div class="flex-1 min-w-0">
                    <p
                      class="text-sm font-semibold transition-colors"
                      :class="[
                        selectedSource === option.key
                          ? {
                              'text-blue-500': option.accentColor === 'blue',
                              'text-emerald-500': option.accentColor === 'emerald',
                              'text-orange-500': option.accentColor === 'orange',
                            }
                          : 'text-foreground',
                      ]"
                    >
                      {{ option.label }}
                    </p>
                    <p class="text-[10px] text-muted-foreground truncate">{{ option.description }}</p>
                  </div>

                  <!-- Check icon -->
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
                      }"
                    >
                      <Icon name="i-lucide-check" class="size-3" />
                    </div>
                  </Transition>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </CardContent>
    </Card>

    <!-- ═══ STEP 1: Database & Collection ════════════════════════════════════ -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Database Combobox -->
      <Card class="relative border-border/50 bg-card/80 backdrop-blur-sm">
        <div class="absolute top-0 left-0 w-full h-0.5 rounded-t-xl bg-gradient-to-r from-primary/80 via-primary to-primary/40" />
        <CardHeader class="pb-3">
          <CardTitle class="flex items-center gap-2 text-sm font-semibold">
            <div class="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary">
              <Icon name="i-lucide-database" class="size-3.5" />
            </div>
            Database Name
            <Badge v-if="isNewDatabase" variant="outline" class="ml-auto text-[9px] border-primary/40 text-primary bg-primary/5">+ New</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <!-- Combobox container -->
          <div class="relative">
            <div class="relative">
              <input
                ref="dbInputRef"
                v-model="database"
                placeholder="Select or type a database name…"
                :disabled="isImporting"
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

            <!-- Dropdown — teleported to body to escape stacking contexts -->
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
                  v-if="dbDropdownOpen && (filteredDatabases.length > 0 || isNewDatabase)"
                  class="fixed z-[9999] rounded-lg border border-border/60 bg-popover shadow-xl overflow-hidden"
                  :style="dbDropdownStyle"
                >
                  <!-- Existing DBs -->
                  <div v-if="filteredDatabases.length > 0" class="p-1">
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
                  <!-- Create new option -->
                  <div v-if="isNewDatabase" class="border-t border-border/40 p-1">
                    <button
                      type="button"
                      class="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm font-mono hover:bg-primary/10 transition-colors text-left text-primary"
                      @mousedown.prevent="selectDatabase(database.trim())"
                    >
                      <Icon name="i-lucide-plus-circle" class="size-3.5 shrink-0" />
                      Create "{{ database.trim() }}"
                    </button>
                  </div>
                </div>
              </Transition>
            </Teleport>
          </div>

          <p class="text-[11px] text-muted-foreground mt-2">
            <span v-if="isNewDatabase" class="text-primary">New database will be created on import.</span>
            <span v-else>Select an existing database or type a new name.</span>
          </p>
        </CardContent>
      </Card>

      <!-- Collection -->
      <Card class="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500/80 via-emerald-500 to-emerald-500/40" />
        <CardHeader class="pb-3">
          <CardTitle class="flex items-center gap-2 text-sm font-semibold">
            <div class="flex items-center justify-center size-7 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Icon name="i-lucide-folder-plus" class="size-3.5" />
            </div>
            Collection Name
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input v-model="collection" placeholder="e.g. Categories" :disabled="isImporting" class="font-mono text-sm" />
          <div class="mt-2 flex items-center gap-1.5">
            <Icon name="i-lucide-arrow-right" class="size-3 text-muted-foreground shrink-0" />
            <span class="text-[11px] font-mono text-primary truncate">
              {{ fullCollectionName || 'databaseName_collectionName' }}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- ═══ STEP 2: CSV Upload ════════════════════════════════════════════════ -->
    <Card class="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
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
      <CardContent>
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

        <!-- File Loaded -->
        <div v-else>
          <div class="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/40 mb-4">
            <div class="flex items-center justify-center size-10 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
              <Icon name="i-lucide-file-check" class="size-5" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ csvFileName }}</p>
              <p class="text-xs text-muted-foreground">{{ formatNumber(csvRowCount) }} records ready for import</p>
            </div>
            <Button variant="ghost" size="sm" class="size-8 p-0 text-muted-foreground hover:text-destructive" :disabled="isImporting" @click="removeFile">
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
                      :class="referencedFields.has(h) ? 'text-amber-500' : 'text-muted-foreground'"
                    >
                      <div class="flex items-center gap-1">
                        <Icon v-if="referencedFields.has(h)" name="i-lucide-link" class="size-2.5" />
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
                      :class="[row[h] ? '' : 'text-muted-foreground/40 italic', referencedFields.has(h) ? 'text-amber-500/80' : '']"
                    >
                      {{ row[h] || 'null' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Schema Badges -->
          <div v-if="csvPreviewHeaders.length" class="mt-4">
            <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Detected Schema</p>
            <div class="flex flex-wrap gap-1.5">
              <Badge
                v-for="h in csvPreviewHeaders"
                :key="h"
                variant="outline"
                class="text-[10px] font-mono gap-1 px-2 py-0.5 transition-colors"
                :class="referencedFields.has(h) ? 'border-amber-500/50 text-amber-500 bg-amber-500/5' : ''"
              >
                <Icon :name="referencedFields.has(h) ? 'i-lucide-link' : 'i-lucide-type'" class="size-2.5" :class="referencedFields.has(h) ? 'text-amber-500' : 'text-primary'" />
                {{ h }}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ═══ STEP 3: References ════════════════════════════════════════════════ -->
    <Transition
      enter-active-class="transition-all duration-400 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
    >
      <Card v-if="csvFile" class="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500/80 via-orange-500 to-amber-500/40" />
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <CardTitle class="flex items-center gap-2 text-sm font-semibold">
              <div class="flex items-center justify-center size-7 rounded-lg bg-amber-500/10 text-amber-500">
                <Icon name="i-lucide-link-2" class="size-3.5" />
              </div>
              Field References
              <Badge v-if="validReferences.length" variant="secondary" class="text-[10px] bg-amber-500/15 text-amber-500 border-amber-500/30 ml-1">
                {{ validReferences.length }} active
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              class="h-7 text-[11px] gap-1.5 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/60"
              :disabled="isImporting || !database.trim()"
              @click="addReference"
            >
              <Icon name="i-lucide-plus" class="size-3" />
              Add Reference
            </Button>
          </div>
          <p class="text-[11px] text-muted-foreground mt-1 ml-9">
            Map CSV fields to ObjectIds from other collections. Selected fields will be replaced with the referenced document's <code class="bg-muted px-1 rounded text-[10px]">_id</code>.
          </p>
        </CardHeader>

        <CardContent>
          <!-- Empty State -->
          <div v-if="references.length === 0" class="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-border/40 bg-muted/10 gap-3">
            <div class="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Icon name="i-lucide-git-merge" class="size-5 text-amber-500/60" />
            </div>
            <div class="text-center">
              <p class="text-sm font-medium text-muted-foreground">No references configured</p>
              <p class="text-[11px] text-muted-foreground/60 mt-0.5">Add references to resolve field values → ObjectIds</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="h-7 text-[11px] gap-1.5 mt-1"
              :disabled="!database.trim()"
              @click="addReference"
            >
              <Icon name="i-lucide-plus" class="size-3" />
              Add First Reference
            </Button>
          </div>

          <!-- Reference Cards -->
          <TransitionGroup
            tag="div"
            class="flex flex-col gap-3"
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 scale-[0.97] -translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-200 ease-in absolute w-full"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0 scale-[0.97]"
          >
            <div
              v-for="(ref, idx) in references"
              :key="ref.id"
              class="relative rounded-xl border border-border/40 bg-muted/20 overflow-hidden"
            >
              <!-- Accent line -->
              <div class="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500/80 to-orange-500/40" />

              <div class="p-4 pl-5">
                <!-- Header row -->
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2">
                    <div class="size-5 rounded-md bg-amber-500/15 flex items-center justify-center">
                      <span class="text-[10px] font-bold text-amber-500">{{ idx + 1 }}</span>
                    </div>
                    <span class="text-xs font-semibold text-foreground">Reference Link</span>
                    <!-- Live preview pill -->
                    <div v-if="ref.localField && ref.storeField" class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                      <span class="text-[10px] font-mono text-amber-400">{{ ref.localField }}</span>
                      <Icon name="i-lucide-arrow-right" class="size-2.5 text-amber-500/60" />
                      <span class="text-[10px] font-mono text-emerald-400">{{ ref.storeField }}</span>
                      <span class="text-[10px] text-muted-foreground/60 ml-0.5">(ObjectId)</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="size-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    @click="removeReference(ref.id)"
                  >
                    <Icon name="i-lucide-trash-2" class="size-3.5" />
                  </Button>
                </div>

                <!-- 4-column config grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  <!-- 1. CSV Field to resolve -->
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Icon name="i-lucide-file-spreadsheet" class="size-2.5 text-violet-400" />
                      CSV Field
                    </label>
                    <select
                      v-model="ref.localField"
                      class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      @change="onLocalFieldChange(ref)"
                    >
                      <option value="">— select field —</option>
                      <option v-for="h in csvPreviewHeaders" :key="h" :value="h">{{ h }}</option>
                    </select>
                    <p class="text-[10px] text-muted-foreground/60">Field from your CSV</p>
                  </div>

                  <!-- 2. Reference Collection -->
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Icon name="i-lucide-database" class="size-2.5 text-primary" />
                      Ref. Collection
                    </label>
                    <div class="relative">
                      <select
                        v-model="ref.collection"
                        class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        @focus="loadCollections"
                        @change="onRefCollectionChange(ref)"
                      >
                        <option value="">— select collection —</option>
                        <option v-for="c in availableCollections" :key="c" :value="c">{{ c }}</option>
                      </select>
                      <div v-if="loadingCollections" class="absolute right-8 top-1/2 -translate-y-1/2">
                        <Icon name="i-lucide-loader-2" class="size-3 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                    <p class="text-[10px] text-muted-foreground/60">Lookup collection</p>
                  </div>

                  <!-- 3. Field in ref collection to match -->
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Icon name="i-lucide-key-round" class="size-2.5 text-amber-400" />
                      Match Field
                    </label>
                    <div class="relative">
                      <select
                        v-model="ref.refField"
                        class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="ref.loadingFields || !ref.collection"
                      >
                        <option value="">— select field —</option>
                        <option v-for="f in ref.availableFields" :key="f" :value="f">{{ f }}</option>
                      </select>
                      <div v-if="ref.loadingFields" class="absolute right-8 top-1/2 -translate-y-1/2">
                        <Icon name="i-lucide-loader-2" class="size-3 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                    <p class="text-[10px] text-muted-foreground/60">Field to compare against</p>
                  </div>

                  <!-- 4. Output field name -->
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Icon name="i-lucide-tag" class="size-2.5 text-emerald-400" />
                      Store As
                    </label>
                    <Input
                      v-model="ref.storeField"
                      placeholder="e.g. Category"
                      class="font-mono text-xs h-9"
                    />
                    <p class="text-[10px] text-muted-foreground/60">Field name in MongoDB (ObjectId)</p>
                  </div>
                </div>

                <!-- Error -->
                <p v-if="ref.error" class="text-[11px] text-destructive mt-2 flex items-center gap-1">
                  <Icon name="i-lucide-alert-circle" class="size-3" />
                  {{ ref.error }}
                </p>

                <!-- Validation warning -->
                <div v-else-if="ref.localField && ref.collection && ref.availableFields.length && !ref.refField" class="mt-2 flex items-center gap-1.5 text-[11px] text-amber-500/80">
                  <Icon name="i-lucide-triangle-alert" class="size-3" />
                  Select a match field to complete this reference
                </div>
              </div>
            </div>
          </TransitionGroup>
        </CardContent>
      </Card>
    </Transition>

    <!-- ═══ STEP 4: Import Settings + Actions ════════════════════════════════ -->
    <Card class="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-sky-500/80 via-sky-500 to-sky-500/40" />
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-sm font-semibold">
          <div class="flex items-center justify-center size-7 rounded-lg bg-sky-500/10 text-sky-500">
            <Icon name="i-lucide-settings-2" class="size-3.5" />
          </div>
          Import Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="text-xs font-medium text-muted-foreground mb-1.5 block">Batch Size</label>
            <select
              v-model.number="batchSize"
              :disabled="isImporting"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option :value="100">100 (Safe)</option>
              <option :value="500">500 (Balanced)</option>
              <option :value="1000">1,000 (Fast)</option>
              <option :value="2000">2,000 (Blazing)</option>
              <option :value="5000">5,000 (Maximum)</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground mb-1.5 block">Target</label>
            <div class="h-9 flex items-center px-3 rounded-md bg-muted/40 border border-border/40 text-sm font-mono truncate">
              {{ database || '—' }}<span class="text-muted-foreground mx-1">.</span>{{ fullCollectionName || '—' }}
            </div>
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground mb-1.5 block">Total Records</label>
            <div class="h-9 flex items-center px-3 rounded-md bg-muted/40 border border-border/40 text-sm font-mono">
              {{ csvFile ? formatNumber(csvRowCount) : '—' }}
            </div>
          </div>
        </div>

        <!-- References summary -->
        <div v-if="validReferences.length > 0" class="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <p class="text-[11px] font-semibold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Icon name="i-lucide-link-2" class="size-3" />
            Reference Mappings ({{ validReferences.length }})
          </p>
          <div class="flex flex-col gap-1.5">
            <div v-for="ref in validReferences" :key="ref.id" class="flex items-center gap-2 text-[11px] font-mono">
              <span class="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">{{ ref.localField }}</span>
              <Icon name="i-lucide-arrow-right" class="size-3 text-muted-foreground" />
              <span class="text-primary/70">{{ ref.collection }}</span>
              <span class="text-muted-foreground">→ match</span>
              <span class="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{{ ref.refField }}</span>
              <span class="text-muted-foreground">→ store as</span>
              <span class="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{{ ref.storeField }}</span>
              <span class="text-muted-foreground">(ObjectId)</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter class="border-t border-border/30 pt-4 flex items-center gap-3 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          :disabled="!database.trim() || !collection.trim() || isImporting"
          class="gap-1.5"
          @click="checkDatabase"
        >
          <Icon v-if="checking" name="i-lucide-loader-2" class="size-3.5 animate-spin" />
          <Icon v-else name="i-lucide-search-check" class="size-3.5" />
          Check Database
        </Button>
        <Button
          size="sm"
          :disabled="!isFormValid || isImporting"
          class="gap-1.5 min-w-[140px]"
          @click="startImport"
        >
          <Icon v-if="isImporting" name="i-lucide-loader-2" class="size-3.5 animate-spin" />
          <Icon v-else name="i-lucide-rocket" class="size-3.5" />
          {{ isImporting ? 'Importing...' : 'Start Import' }}
        </Button>

        <!-- Check Result -->
        <div v-if="checkResult" class="flex items-center gap-2 ml-2 text-xs">
          <Badge
            :variant="checkResult.dbExists ? 'default' : 'secondary'"
            class="gap-1 text-[10px]"
            :class="checkResult.dbExists ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : ''"
          >
            <Icon :name="checkResult.dbExists ? 'i-lucide-check-circle' : 'i-lucide-plus-circle'" class="size-3" />
            DB {{ checkResult.dbExists ? 'Exists' : 'New' }}
          </Badge>
          <Badge
            :variant="checkResult.collectionExists ? 'default' : 'secondary'"
            class="gap-1 text-[10px]"
            :class="checkResult.collectionExists ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : ''"
          >
            <Icon :name="checkResult.collectionExists ? 'i-lucide-check-circle' : 'i-lucide-plus-circle'" class="size-3" />
            Collection {{ checkResult.collectionExists ? 'Exists' : 'New' }}
          </Badge>
        </div>
      </CardFooter>
    </Card>

    <!-- ═══ PROGRESS ══════════════════════════════════════════════════════════ -->
    <Transition
      enter-active-class="transition-all duration-500 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-[0.98]"
      enter-to-class="opacity-100 translate-y-0 scale-100"
    >
      <Card v-if="importStatus !== 'idle'" class="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div
          class="absolute top-0 left-0 h-0.5 transition-all duration-500 ease-out"
          :class="importStatus === 'done' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : importStatus === 'error' ? 'bg-gradient-to-r from-destructive to-red-400' : 'bg-gradient-to-r from-primary to-blue-400'"
          :style="{ width: `${progress.percentage || 2}%` }"
        />
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <CardTitle class="flex items-center gap-2 text-sm font-semibold">
              <div
                class="flex items-center justify-center size-7 rounded-lg"
                :class="importStatus === 'done' ? 'bg-emerald-500/10 text-emerald-500' : importStatus === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'"
              >
                <Icon
                  :name="importStatus === 'done' ? 'i-lucide-check-circle' : importStatus === 'error' ? 'i-lucide-alert-circle' : 'i-lucide-loader-2'"
                  class="size-3.5"
                  :class="isImporting ? 'animate-spin' : ''"
                />
              </div>
              Import Progress
            </CardTitle>
            <span
              class="text-2xl font-bold tabular-nums"
              :class="importStatus === 'done' ? 'text-emerald-500' : importStatus === 'error' ? 'text-destructive' : 'text-primary'"
            >
              {{ progress.percentage }}%
            </span>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Bar -->
          <div class="h-3 rounded-full bg-muted/60 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
              :class="importStatus === 'done' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : importStatus === 'error' ? 'bg-gradient-to-r from-destructive to-red-400' : 'bg-gradient-to-r from-primary to-blue-400'"
              :style="{ width: `${progress.percentage}%` }"
            >
              <div v-if="isImporting" class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          </div>

          <!-- Message -->
          <p class="text-sm text-center" :class="importStatus === 'done' ? 'text-emerald-500 font-medium' : importStatus === 'error' ? 'text-destructive font-medium' : 'text-muted-foreground'">
            {{ progress.message }}
          </p>

          <!-- Stats -->
          <div v-if="progress.total > 0" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="rounded-lg bg-muted/30 border border-border/30 p-3 text-center">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Imported</p>
              <p class="text-lg font-bold tabular-nums">{{ formatNumber(progress.imported) }}</p>
              <p class="text-[10px] text-muted-foreground">of {{ formatNumber(progress.total) }}</p>
            </div>
            <div class="rounded-lg bg-muted/30 border border-border/30 p-3 text-center">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Remaining</p>
              <p class="text-lg font-bold tabular-nums">{{ formatNumber(progress.remainingRecords) }}</p>
              <p class="text-[10px] text-muted-foreground">records left</p>
            </div>
            <div class="rounded-lg bg-muted/30 border border-border/30 p-3 text-center">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Speed</p>
              <p class="text-lg font-bold tabular-nums">{{ formatNumber(progress.speed) }}</p>
              <p class="text-[10px] text-muted-foreground">records/sec</p>
            </div>
            <div class="rounded-lg bg-muted/30 border border-border/30 p-3 text-center">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Elapsed</p>
              <p class="text-lg font-bold tabular-nums">{{ formatDuration(progress.elapsed) }}</p>
              <p class="text-[10px] text-muted-foreground">{{ progress.eta > 0 ? `~${progress.eta}s left` : importStatus === 'done' ? 'Complete' : '...' }}</p>
            </div>
          </div>

          <!-- Batch dots -->
          <div v-if="progress.totalBatches > 1" class="space-y-1.5">
            <div class="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Batches: {{ progress.batchesDone }} / {{ progress.totalBatches }}</span>
              <span>{{ batchSize.toLocaleString() }} records per batch</span>
            </div>
            <div class="flex gap-0.5">
              <div
                v-for="i in Math.min(progress.totalBatches, 50)"
                :key="i"
                class="h-1.5 flex-1 rounded-full transition-all duration-300"
                :class="i <= progress.batchesDone ? (importStatus === 'done' ? 'bg-emerald-500' : 'bg-primary') : 'bg-muted/60'"
              />
            </div>
          </div>

          <!-- Actions -->
          <div v-if="importStatus === 'done' || importStatus === 'error'" class="flex justify-center pt-2">
            <Button variant="outline" size="sm" class="gap-1.5" @click="resetAll">
              <Icon name="i-lucide-rotate-ccw" class="size-3.5" />
              Import Another
            </Button>
          </div>
        </CardContent>
      </Card>
    </Transition>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
.animate-shimmer {
  animation: shimmer 1.5s infinite;
}


</style>
