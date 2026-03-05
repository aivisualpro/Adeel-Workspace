<script setup lang="ts">
import { nanoid } from 'nanoid'

const { setHeader } = usePageHeader()
setHeader({
  title: 'Database Creator',
  icon: 'i-lucide-database',
  description: 'Create databases, collections & import CSV data into MongoDB',
})

// ─── State ───
const database = ref('')
const collection = ref('')
const csvFile = ref<File | null>(null)
const csvFileName = ref('')
const csvPreviewHeaders = ref<string[]>([])
const csvPreviewRows = ref<Record<string, string>[]>([])
const csvRowCount = ref(0)
const batchSize = ref(500)
const dragActive = ref(false)

// ─── Check State ───
const checkResult = ref<{ dbExists: boolean, collectionExists: boolean, message: string } | null>(null)
const checking = ref(false)

// ─── Import State ───
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

const isFormValid = computed(() => database.value.trim() && collection.value.trim() && csvFile.value)
const isImporting = computed(() => importStatus.value === 'importing' || importStatus.value === 'parsing')

// ─── CSV File Handling ───
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

  // Read preview
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = ev.target?.result as string
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length === 0) return

    // Parse headers
    const headers = parseCSVRow(lines[0]!)
    csvPreviewHeaders.value = headers
    csvRowCount.value = lines.length - 1

    // Preview first 5 rows
    const preview: Record<string, string>[] = []
    for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
      const vals = parseCSVRow(lines[i]!)
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h] = vals[idx] || '' })
      preview.push(row)
    }
    csvPreviewRows.value = preview

    // Auto-infer collection name if empty
    if (!collection.value) {
      collection.value = file.name.replace('.csv', '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
    }
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
}

// ─── Check DB/Collection ───
async function checkDatabase() {
  checking.value = true
  checkResult.value = null
  try {
    const res = await $fetch('/api/db/check', {
      method: 'POST',
      body: { database: database.value.trim(), collection: collection.value.trim() },
    })
    checkResult.value = res as any
  }
  catch (err: any) {
    checkResult.value = { dbExists: false, collectionExists: false, message: err.data?.message || 'Connection failed' }
  }
  checking.value = false
}

// ─── Import ───
async function startImport() {
  if (!isFormValid.value || isImporting.value) return

  sessionId.value = nanoid()
  importStatus.value = 'parsing'
  progress.value = { total: 0, imported: 0, percentage: 0, batchesDone: 0, totalBatches: 0, message: 'Starting…', fields: [], speed: 0, eta: 0, remainingRecords: 0, elapsed: 0 }

  const formData = new FormData()
  formData.append('database', database.value.trim())
  formData.append('collection', collection.value.trim())
  formData.append('sessionId', sessionId.value)
  formData.append('batchSize', String(batchSize.value))
  formData.append('file', csvFile.value!)

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
    catch {
      // silent
    }
  }, 300)
}

function resetAll() {
  removeFile()
  database.value = ''
  collection.value = ''
  importStatus.value = 'idle'
  progress.value = { total: 0, imported: 0, percentage: 0, batchesDone: 0, totalBatches: 0, message: '', fields: [], speed: 0, eta: 0, remainingRecords: 0, elapsed: 0 }
  checkResult.value = null
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
}

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

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
    <!-- ═══════════════ STEP 1: Database & Collection ═══════════════ -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card class="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/80 via-primary to-primary/40" />
        <CardHeader class="pb-3">
          <CardTitle class="flex items-center gap-2 text-sm font-semibold">
            <div class="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary">
              <Icon name="i-lucide-database" class="size-3.5" />
            </div>
            Database Name
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            v-model="database"
            placeholder="e.g. my_project_db"
            :disabled="isImporting"
            class="font-mono text-sm"
          />
          <p class="text-[11px] text-muted-foreground mt-2">
            If the database doesn't exist, it will be created automatically.
          </p>
        </CardContent>
      </Card>

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
          <Input
            v-model="collection"
            placeholder="e.g. customers"
            :disabled="isImporting"
            class="font-mono text-sm"
          />
          <p class="text-[11px] text-muted-foreground mt-2">
            Auto-filled from CSV filename. Will be created if it doesn't exist.
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- ═══════════════ STEP 2: CSV Upload ═══════════════ -->
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
          :class="dragActive
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border/60 hover:border-primary/50 hover:bg-muted/30'"
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
                      class="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {{ h }}
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
                      :class="row[h] ? '' : 'text-muted-foreground/40 italic'"
                    >
                      {{ row[h] || 'null' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Schema Preview -->
          <div v-if="csvPreviewHeaders.length" class="mt-4">
            <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Detected Schema</p>
            <div class="flex flex-wrap gap-1.5">
              <Badge
                v-for="h in csvPreviewHeaders"
                :key="h"
                variant="outline"
                class="text-[10px] font-mono gap-1 px-2 py-0.5"
              >
                <Icon name="i-lucide-type" class="size-2.5 text-primary" />
                {{ h }}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ═══════════════ STEP 3: Import config + Actions ═══════════════ -->
    <Card class="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500/80 via-amber-500 to-amber-500/40" />
      <CardHeader class="pb-3">
        <CardTitle class="flex items-center gap-2 text-sm font-semibold">
          <div class="flex items-center justify-center size-7 rounded-lg bg-amber-500/10 text-amber-500">
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
              {{ database || '—' }}<span class="text-muted-foreground mx-1">.</span>{{ collection || '—' }}
            </div>
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground mb-1.5 block">Total Records</label>
            <div class="h-9 flex items-center px-3 rounded-md bg-muted/40 border border-border/40 text-sm font-mono">
              {{ csvFile ? formatNumber(csvRowCount) : '—' }}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter class="border-t border-border/30 pt-4 flex items-center gap-3">
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

        <!-- Check Result Inline -->
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

    <!-- ═══════════════ PROGRESS DASHBOARD ═══════════════ -->
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
            <div class="flex items-center gap-2">
              <span
                v-if="importStatus !== 'idle'"
                class="text-2xl font-bold tabular-nums"
                :class="importStatus === 'done' ? 'text-emerald-500' : importStatus === 'error' ? 'text-destructive' : 'text-primary'"
              >
                {{ progress.percentage }}%
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Main Progress Bar -->
          <div class="relative">
            <div class="h-3 rounded-full bg-muted/60 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                :class="importStatus === 'done'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  : importStatus === 'error'
                    ? 'bg-gradient-to-r from-destructive to-red-400'
                    : 'bg-gradient-to-r from-primary to-blue-400'"
                :style="{ width: `${progress.percentage}%` }"
              >
                <!-- Shimmer effect during import -->
                <div
                  v-if="isImporting"
                  class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                />
              </div>
            </div>
          </div>

          <!-- Status Message -->
          <p class="text-sm text-center" :class="importStatus === 'done' ? 'text-emerald-500 font-medium' : importStatus === 'error' ? 'text-destructive font-medium' : 'text-muted-foreground'">
            {{ progress.message }}
          </p>

          <!-- Stats Grid -->
          <div v-if="progress.total > 0" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="rounded-lg bg-muted/30 border border-border/30 p-3 text-center">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Imported</p>
              <p class="text-lg font-bold tabular-nums text-foreground">{{ formatNumber(progress.imported) }}</p>
              <p class="text-[10px] text-muted-foreground">of {{ formatNumber(progress.total) }}</p>
            </div>
            <div class="rounded-lg bg-muted/30 border border-border/30 p-3 text-center">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Remaining</p>
              <p class="text-lg font-bold tabular-nums text-foreground">{{ formatNumber(progress.remainingRecords) }}</p>
              <p class="text-[10px] text-muted-foreground">records left</p>
            </div>
            <div class="rounded-lg bg-muted/30 border border-border/30 p-3 text-center">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Speed</p>
              <p class="text-lg font-bold tabular-nums text-foreground">{{ formatNumber(progress.speed) }}</p>
              <p class="text-[10px] text-muted-foreground">records/sec</p>
            </div>
            <div class="rounded-lg bg-muted/30 border border-border/30 p-3 text-center">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Elapsed</p>
              <p class="text-lg font-bold tabular-nums text-foreground">{{ formatDuration(progress.elapsed) }}</p>
              <p class="text-[10px] text-muted-foreground">
                {{ progress.eta > 0 ? `~${progress.eta}s left` : importStatus === 'done' ? 'Complete' : '...' }}
              </p>
            </div>
          </div>

          <!-- Batch Progress -->
          <div v-if="progress.totalBatches > 1 && importStatus !== 'idle'" class="space-y-1.5">
            <div class="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Batches: {{ progress.batchesDone }} / {{ progress.totalBatches }}</span>
              <span>{{ batchSize.toLocaleString() }} records per batch</span>
            </div>
            <div class="flex gap-0.5">
              <div
                v-for="i in Math.min(progress.totalBatches, 50)"
                :key="i"
                class="h-1.5 flex-1 rounded-full transition-all duration-300"
                :class="i <= progress.batchesDone
                  ? (importStatus === 'done' ? 'bg-emerald-500' : 'bg-primary')
                  : 'bg-muted/60'"
              />
            </div>
            <p v-if="progress.totalBatches > 50" class="text-[10px] text-muted-foreground text-center">
              Showing {{ Math.min(progress.totalBatches, 50) }} of {{ progress.totalBatches }} batches
            </p>
          </div>

          <!-- Done / Error Actions -->
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
