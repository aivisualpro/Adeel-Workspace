<script setup lang="ts">
import { toast } from 'vue-sonner'

interface Props {
  open: boolean
  customerName: string
  driveLink: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const isOpen = useVModel(props, 'open', emit)

const { public: { driveEmail } } = useRuntimeConfig()

// ─── File types ───────────────────────────────────────────────
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']
const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
const PREVIEWABLE = [
  ...IMAGE_MIMES, ...VIDEO_MIMES,
  'application/pdf',
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
]

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
  thumbnailLink?: string
  iconLink?: string
  webViewLink?: string
}

// ─── State ────────────────────────────────────────────────────
const folderStack = ref<{ id: string, name: string }[]>([])
const currentFiles = ref<DriveFile[]>([])
const loadingFiles = ref(false)
const fileError = ref('')
const selectedFile = ref<DriveFile | null>(null)
const previewLoaded = ref(false)

// Upload state
const isDragging = ref(false)
const isUploading = ref(false)
const uploadProgress = ref<{ name: string, done: boolean }[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
let dragCounter = 0

// ─── Extract root folder ID ───────────────────────────────────
const rootFolderId = computed(() => {
  if (!props.driveLink) return null
  const m = props.driveLink.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (m) return m[1]
  const m2 = props.driveLink.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2) return m2[1]
  return null
})

const currentFolderId = computed(() =>
  folderStack.value.length > 0 ? folderStack.value[folderStack.value.length - 1]!.id : rootFolderId.value,
)

// Sorted: folders first, then files
const sortedFiles = computed(() => {
  const folders = currentFiles.value.filter(f => f.mimeType === FOLDER_MIME)
  const files = currentFiles.value.filter(f => f.mimeType !== FOLDER_MIME)
  return [...folders, ...files]
})

const folderCount = computed(() => currentFiles.value.filter(f => f.mimeType === FOLDER_MIME).length)
const fileCount = computed(() => currentFiles.value.filter(f => f.mimeType !== FOLDER_MIME).length)

// ─── Fetch files ──────────────────────────────────────────────
async function fetchFiles(folderId: string) {
  loadingFiles.value = true
  fileError.value = ''
  currentFiles.value = []
  try {
    const data = await $fetch<{ success: boolean, files: DriveFile[] }>(`/api/drive/files?folderId=${folderId}`)
    currentFiles.value = data.files || []
  }
  catch (e: any) {
    fileError.value = e.data?.statusMessage || 'Failed to load files'
  }
  finally {
    loadingFiles.value = false
  }
}

// ─── Navigation ───────────────────────────────────────────────
function openFolder(file: DriveFile) {
  selectedFile.value = null
  folderStack.value.push({ id: file.id, name: file.name })
}

function goBack() {
  selectedFile.value = null
  folderStack.value.pop()
}

function goToRoot() {
  selectedFile.value = null
  folderStack.value = []
}

function goToBreadcrumb(idx: number) {
  selectedFile.value = null
  folderStack.value = folderStack.value.slice(0, idx + 1)
}

function openFile(file: DriveFile) {
  if (file.mimeType === FOLDER_MIME) {
    openFolder(file)
    return
  }
  previewLoaded.value = false
  selectedFile.value = file
}

function closePreview() {
  selectedFile.value = null
}

// ─── Preview URL ──────────────────────────────────────────────
function previewUrl(file: DriveFile): string {
  const au = driveEmail ? `authuser=${encodeURIComponent(driveEmail)}` : ''
  if (file.mimeType === 'application/vnd.google-apps.document')
    return `https://docs.google.com/document/d/${file.id}/preview${au ? `?${au}` : ''}`
  if (file.mimeType === 'application/vnd.google-apps.spreadsheet')
    return `https://docs.google.com/spreadsheets/d/${file.id}/preview${au ? `?${au}` : ''}`
  if (file.mimeType === 'application/vnd.google-apps.presentation')
    return `https://docs.google.com/presentation/d/${file.id}/preview${au ? `?${au}` : ''}`
  return `https://drive.google.com/file/d/${file.id}/preview${au ? `?${au}` : ''}`
}

function canPreview(f: DriveFile) { return PREVIEWABLE.includes(f.mimeType) }

function openExternal(file: DriveFile) {
  const url = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function downloadFile(file: DriveFile) {
  const a = document.createElement('a')
  a.href = `/api/drive/download?fileId=${file.id}`
  a.download = file.name
  a.click()
}

function openInDrive() {
  const base = currentFolderId.value
    ? `https://drive.google.com/drive/folders/${currentFolderId.value}`
    : props.driveLink
  const au = driveEmail ? `?authuser=${encodeURIComponent(driveEmail)}` : ''
  window.open(base + au, '_blank', 'noopener,noreferrer')
}

// ─── Upload ───────────────────────────────────────────────────
function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) uploadFiles(Array.from(input.files))
  input.value = '' // allow re-selecting same file
}

function onDragEnter(e: DragEvent) {
  e.preventDefault()
  dragCounter++
  isDragging.value = true
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  dragCounter--
  if (dragCounter <= 0) { isDragging.value = false; dragCounter = 0 }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  dragCounter = 0
  if (e.dataTransfer?.files?.length) uploadFiles(Array.from(e.dataTransfer.files))
}

async function uploadFiles(files: File[]) {
  if (!currentFolderId.value || files.length === 0) return
  isUploading.value = true
  uploadProgress.value = files.map(f => ({ name: f.name, done: false }))

  try {
    const formData = new FormData()
    formData.append('folderId', currentFolderId.value)
    files.forEach(f => formData.append('files', f))

    const result = await $fetch<{ success: boolean, count: number }>('/api/drive/upload', {
      method: 'POST',
      body: formData,
    })

    uploadProgress.value = uploadProgress.value.map(p => ({ ...p, done: true }))

    if (result.success) {
      toast.success(`${result.count} file${result.count !== 1 ? 's' : ''} uploaded successfully`)
      // Refresh the file list
      await fetchFiles(currentFolderId.value!)
    }
  }
  catch (err: any) {
    toast.error(err.data?.statusMessage || 'Failed to upload files')
  }
  finally {
    setTimeout(() => {
      isUploading.value = false
      uploadProgress.value = []
    }, 1000)
  }
}

// ─── File helpers ─────────────────────────────────────────────
function isFolder(f: DriveFile) { return f.mimeType === FOLDER_MIME }
function isImage(f: DriveFile) { return IMAGE_MIMES.includes(f.mimeType) }

function fileIcon(f: DriveFile): string {
  if (isFolder(f)) return 'i-lucide-folder'
  if (f.mimeType === 'application/pdf') return 'i-lucide-file-text'
  if (IMAGE_MIMES.includes(f.mimeType)) return 'i-lucide-image'
  if (VIDEO_MIMES.includes(f.mimeType)) return 'i-lucide-video'
  if (f.mimeType?.includes('spreadsheet') || f.mimeType?.includes('excel')) return 'i-lucide-table'
  if (f.mimeType?.includes('document') || f.mimeType?.includes('word')) return 'i-lucide-file-text'
  if (f.mimeType?.includes('presentation') || f.mimeType?.includes('powerpoint')) return 'i-lucide-presentation'
  return 'i-lucide-file'
}

function fileIconColor(f: DriveFile): string {
  if (isFolder(f)) return 'text-amber-500'
  if (f.mimeType === 'application/pdf') return 'text-red-500'
  if (IMAGE_MIMES.includes(f.mimeType)) return 'text-violet-500'
  if (VIDEO_MIMES.includes(f.mimeType)) return 'text-pink-500'
  if (f.mimeType?.includes('spreadsheet')) return 'text-emerald-600'
  if (f.mimeType?.includes('document')) return 'text-blue-500'
  if (f.mimeType?.includes('presentation')) return 'text-orange-500'
  return 'text-muted-foreground'
}

function fileIconBg(f: DriveFile): string {
  if (isFolder(f)) return 'bg-amber-500/10'
  if (f.mimeType === 'application/pdf') return 'bg-red-500/10'
  if (IMAGE_MIMES.includes(f.mimeType)) return 'bg-violet-500/10'
  if (VIDEO_MIMES.includes(f.mimeType)) return 'bg-pink-500/10'
  if (f.mimeType?.includes('spreadsheet')) return 'bg-emerald-500/10'
  if (f.mimeType?.includes('document')) return 'bg-blue-500/10'
  if (f.mimeType?.includes('presentation')) return 'bg-orange-500/10'
  return 'bg-muted'
}

function formatSize(size?: string): string {
  if (!size) return ''
  const n = parseInt(size)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(dt?: string): string {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Watchers ─────────────────────────────────────────────────
watch(currentFolderId, (id) => { if (id) fetchFiles(id) }, { immediate: false })

watch(() => props.open, (val) => {
  if (val && rootFolderId.value) {
    folderStack.value = []
    selectedFile.value = null
    fetchFiles(rootFolderId.value)
  }
})
</script>

<template>
  <!-- Full-screen overlay portal -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="isOpen = false" />

        <!-- Modal container -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="isOpen"
            class="relative z-10 flex flex-col bg-card rounded-2xl shadow-2xl border overflow-hidden"
            style="width: calc(100vw - 80px); height: calc(100vh - 60px); max-width: 1600px;"
            @dragenter="onDragEnter"
            @dragleave="onDragLeave"
            @dragover="onDragOver"
            @drop="onDrop"
          >
            <!-- ══════════════════ HEADER ══════════════════ -->
            <div class="flex items-center gap-4 px-6 py-3 border-b bg-gradient-to-r from-card via-card to-muted/10 shrink-0">
              <!-- Drive logo -->
              <div class="size-10 rounded-xl bg-gradient-to-br from-[#1da462] to-[#0f7b3f] flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                <svg class="size-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.5 19.5l3-5.25H21l-3 5.25H4.5z" opacity=".7" />
                  <path d="M12 4.5L4.5 17.25l3 2.25L15 7.5 12 4.5z" opacity=".85" />
                  <path d="M21 15l-4.5-7.5L13.5 9l4.5 7.5L21 15z" />
                </svg>
              </div>

              <!-- Breadcrumbs -->
              <div class="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar">
                <button
                  class="text-sm font-bold hover:text-primary transition-colors shrink-0 whitespace-nowrap"
                  @click="goToRoot"
                >
                  {{ customerName }}
                </button>
                <Icon name="i-lucide-chevron-right" class="size-3.5 text-muted-foreground/50 shrink-0" />
                <button
                  class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  :class="folderStack.length === 0 ? 'text-foreground' : ''"
                  @click="goToRoot"
                >
                  Files
                </button>
                <template v-for="(crumb, idx) in folderStack" :key="crumb.id">
                  <Icon name="i-lucide-chevron-right" class="size-3.5 text-muted-foreground/50 shrink-0" />
                  <button
                    class="text-sm transition-colors truncate max-w-[200px] shrink-0"
                    :class="idx === folderStack.length - 1 ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'"
                    @click="goToBreadcrumb(idx)"
                  >
                    {{ crumb.name }}
                  </button>
                </template>
              </div>

              <!-- Header actions -->
              <div class="flex items-center gap-2 shrink-0">
                <Button
                  v-if="folderStack.length > 0"
                  variant="outline"
                  size="sm"
                  class="h-8 text-xs gap-1.5 rounded-lg"
                  @click="goBack"
                >
                  <Icon name="i-lucide-arrow-left" class="size-3.5" />
                  Back
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  class="h-8 text-xs gap-1.5 rounded-lg"
                  @click="fetchFiles(currentFolderId!)"
                >
                  <Icon name="i-lucide-refresh-cw" class="size-3.5" :class="{ 'animate-spin': loadingFiles }" />
                </Button>

                <div class="w-px h-5 bg-border" />

                <Button
                  size="sm"
                  class="h-8 text-xs gap-1.5 rounded-lg bg-gradient-to-r from-[#1da462] to-[#34a853] hover:from-[#1a9058] hover:to-[#2e9648] text-white border-0 shadow-md shadow-emerald-500/20"
                  :disabled="isUploading"
                  @click="triggerFileInput"
                >
                  <Icon v-if="isUploading" name="i-lucide-loader-2" class="size-3.5 animate-spin" />
                  <Icon v-else name="i-lucide-upload" class="size-3.5" />
                  {{ isUploading ? 'Uploading...' : 'Upload Files' }}
                </Button>

                <input
                  ref="fileInputRef"
                  type="file"
                  multiple
                  class="hidden"
                  @change="onFileInputChange"
                />

                <Button
                  variant="ghost"
                  size="sm"
                  class="h-8 text-xs gap-1.5 rounded-lg"
                  @click="openInDrive"
                >
                  <Icon name="i-lucide-external-link" class="size-3.5" />
                  Open in Drive
                </Button>

                <div class="w-px h-5 bg-border" />

                <button
                  class="size-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                  @click="isOpen = false"
                >
                  <Icon name="i-lucide-x" class="size-4" />
                </button>
              </div>
            </div>

            <!-- ══════════════════ BODY ══════════════════ -->
            <div class="relative flex flex-1 min-h-0 overflow-hidden">

              <!-- ─── DRAG & DROP OVERLAY ─── -->
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <div
                  v-if="isDragging"
                  class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1da462]/5 backdrop-blur-sm border-2 border-dashed border-[#1da462] rounded-lg m-3"
                >
                  <div class="flex flex-col items-center gap-4 pointer-events-none">
                    <div class="size-20 rounded-3xl bg-gradient-to-br from-[#1da462]/20 to-[#34a853]/10 flex items-center justify-center animate-bounce">
                      <Icon name="i-lucide-upload-cloud" class="size-10 text-[#1da462]" />
                    </div>
                    <div class="text-center">
                      <p class="text-lg font-bold text-[#1da462]">Drop files here</p>
                      <p class="text-sm text-muted-foreground mt-1">Files will be uploaded to the current folder</p>
                    </div>
                  </div>
                </div>
              </Transition>

              <!-- ─── UPLOAD PROGRESS OVERLAY ─── -->
              <Transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 translate-y-4"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <div
                  v-if="isUploading && uploadProgress.length > 0"
                  class="absolute bottom-4 right-4 z-50 w-80 bg-card border rounded-xl shadow-2xl overflow-hidden"
                >
                  <div class="px-4 py-2.5 bg-gradient-to-r from-[#1da462] to-[#34a853] text-white text-xs font-semibold flex items-center gap-2">
                    <Icon name="i-lucide-upload-cloud" class="size-4" />
                    Uploading {{ uploadProgress.length }} file{{ uploadProgress.length !== 1 ? 's' : '' }}...
                  </div>
                  <div class="max-h-40 overflow-y-auto divide-y divide-border/50">
                    <div
                      v-for="(p, i) in uploadProgress"
                      :key="i"
                      class="flex items-center gap-2.5 px-4 py-2 text-xs"
                    >
                      <Icon
                        :name="p.done ? 'i-lucide-check-circle-2' : 'i-lucide-loader-2'"
                        class="size-3.5 shrink-0"
                        :class="p.done ? 'text-[#34a853]' : 'text-muted-foreground animate-spin'"
                      />
                      <span class="truncate flex-1">{{ p.name }}</span>
                      <span :class="p.done ? 'text-[#34a853] font-medium' : 'text-muted-foreground'">{{ p.done ? 'Done' : 'Uploading' }}</span>
                    </div>
                  </div>
                  <!-- Progress bar -->
                  <div class="h-1 bg-muted">
                    <div
                      class="h-full bg-gradient-to-r from-[#1da462] to-[#34a853] transition-all duration-500 ease-out"
                      :style="{ width: `${(uploadProgress.filter(p => p.done).length / uploadProgress.length * 100)}%` }"
                    />
                  </div>
                </div>
              </Transition>

              <!-- ─── FILE LIST PANEL ─── -->
              <div
                class="flex flex-col min-h-0 overflow-hidden border-r transition-all duration-300 ease-in-out bg-card"
                :style="{ width: selectedFile ? '380px' : '100%', minWidth: selectedFile ? '380px' : '0' }"
              >
                <!-- Column header -->
                <div class="flex items-center gap-4 px-6 py-2.5 border-b bg-muted/30 shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span class="flex-1">Name</span>
                  <span class="w-16 text-right" :class="{ 'hidden': selectedFile }">Size</span>
                  <span class="w-24 text-right" :class="{ 'hidden': selectedFile }">Modified</span>
                </div>

                <!-- Loading skeleton -->
                <div v-if="loadingFiles" class="flex flex-col flex-1 min-h-0 overflow-auto">
                  <div v-for="i in 8" :key="i" class="flex items-center gap-4 px-6 py-3.5 border-b border-border/50 animate-pulse">
                    <div class="size-10 rounded-xl bg-muted shrink-0" />
                    <div class="flex-1 space-y-2">
                      <div class="h-3.5 bg-muted rounded-full" :style="{ width: `${40 + Math.random() * 40}%` }" />
                      <div class="h-2.5 bg-muted/50 rounded-full w-1/4" />
                    </div>
                  </div>
                </div>

                <!-- Error -->
                <div v-else-if="fileError" class="flex flex-col items-center justify-center flex-1 gap-4 p-12 text-center">
                  <div class="size-20 rounded-3xl bg-destructive/10 flex items-center justify-center">
                    <Icon name="i-lucide-cloud-off" class="size-10 text-destructive/60" />
                  </div>
                  <div>
                    <p class="font-semibold">Could not load files</p>
                    <p class="text-sm text-muted-foreground mt-1 max-w-xs">{{ fileError }}</p>
                  </div>
                  <Button variant="outline" size="sm" @click="fetchFiles(currentFolderId!)">
                    <Icon name="i-lucide-refresh-cw" class="mr-1.5 size-3.5" />
                    Try again
                  </Button>
                </div>

                <!-- Empty state -->
                <div v-else-if="currentFiles.length === 0" class="flex flex-col items-center justify-center flex-1 gap-4 p-12 text-center">
                  <div class="relative">
                    <div class="size-20 rounded-3xl bg-muted/60 flex items-center justify-center">
                      <Icon name="i-lucide-folder-open" class="size-10 text-muted-foreground/30" />
                    </div>
                  </div>
                  <div>
                    <p class="font-semibold">No files yet</p>
                    <p class="text-sm text-muted-foreground mt-1">Drag & drop or click to upload</p>
                  </div>
                  <Button size="sm" class="bg-[#1da462] hover:bg-[#1a9058] text-white" @click="triggerFileInput">
                    <Icon name="i-lucide-upload" class="mr-1.5 size-3.5" />
                    Upload Files
                  </Button>
                </div>

                <!-- File rows -->
                <div v-else class="flex flex-col flex-1 min-h-0 overflow-y-auto">
                  <button
                    v-for="file in sortedFiles"
                    :key="file.id"
                    class="group/row flex items-center gap-4 px-6 py-3 border-b border-border/40 hover:bg-muted/40 transition-all duration-150 text-left w-full"
                    :class="[
                      selectedFile?.id === file.id
                        ? 'bg-primary/5 border-l-[3px] border-l-primary pl-[21px]'
                        : 'border-l-[3px] border-l-transparent pl-[21px]',
                    ]"
                    @click="openFile(file)"
                  >
                    <!-- Icon -->
                    <div
                      class="size-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover/row:scale-105 group-hover/row:shadow-md"
                      :class="fileIconBg(file)"
                    >
                      <Icon
                        :name="fileIcon(file)"
                        class="size-5"
                        :class="fileIconColor(file)"
                      />
                    </div>

                    <!-- File info -->
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium truncate leading-tight group-hover/row:text-primary transition-colors">
                        {{ file.name }}
                      </p>
                      <p v-if="selectedFile" class="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span v-if="!isFolder(file) && file.size">{{ formatSize(file.size) }}</span>
                        <span v-if="file.modifiedTime">{{ formatDate(file.modifiedTime) }}</span>
                      </p>
                    </div>

                    <!-- Size (shown when no preview panel) -->
                    <span
                      v-if="!isFolder(file) && !selectedFile"
                      class="w-16 text-right text-xs text-muted-foreground tabular-nums shrink-0"
                    >
                      {{ formatSize(file.size) }}
                    </span>

                    <!-- Date (shown when no preview panel) -->
                    <span
                      v-if="!selectedFile"
                      class="w-24 text-right text-xs text-muted-foreground shrink-0"
                    >
                      {{ formatDate(file.modifiedTime) }}
                    </span>

                    <!-- Action buttons -->
                    <div v-if="!isFolder(file)" class="shrink-0 flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                      <button
                        v-if="canPreview(file)"
                        class="size-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-primary transition-colors"
                        title="Preview"
                        @click.stop="openFile(file)"
                      >
                        <Icon name="i-lucide-eye" class="size-3.5" />
                      </button>
                      <button
                        class="size-7 rounded-lg flex items-center justify-center hover:bg-blue-500/10 text-blue-500 transition-colors"
                        title="Download"
                        @click.stop="downloadFile(file)"
                      >
                        <Icon name="i-lucide-download" class="size-3.5" />
                      </button>
                      <button
                        class="size-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
                        title="Open in Drive"
                        @click.stop="openExternal(file)"
                      >
                        <Icon name="i-lucide-external-link" class="size-3.5" />
                      </button>
                    </div>
                    <div v-else class="shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity">
                      <Icon name="i-lucide-chevron-right" class="size-4 text-muted-foreground" />
                    </div>
                  </button>
                </div>
              </div>

              <!-- ─── PREVIEW PANEL ─── -->
              <Transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 translate-x-6"
                enter-to-class="opacity-100 translate-x-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 translate-x-0"
                leave-to-class="opacity-0 translate-x-6"
              >
                <div v-if="selectedFile" class="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden bg-[#f8f9fa] dark:bg-zinc-900/50">
                  <!-- Preview header -->
                  <div class="flex items-center gap-3 px-5 py-2.5 border-b bg-card/80 backdrop-blur shrink-0">
                    <div
                      class="size-8 rounded-lg flex items-center justify-center shrink-0"
                      :class="fileIconBg(selectedFile)"
                    >
                      <Icon :name="fileIcon(selectedFile)" class="size-4" :class="fileIconColor(selectedFile)" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold truncate">{{ selectedFile.name }}</p>
                      <p class="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span v-if="selectedFile.size">{{ formatSize(selectedFile.size) }}</span>
                        <span v-if="selectedFile.modifiedTime">{{ formatDate(selectedFile.modifiedTime) }}</span>
                      </p>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        class="h-7 text-xs gap-1 rounded-lg"
                        @click="downloadFile(selectedFile)"
                      >
                        <Icon name="i-lucide-download" class="size-3" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        class="h-7 text-xs gap-1 rounded-lg"
                        @click="openExternal(selectedFile)"
                      >
                        <Icon name="i-lucide-external-link" class="size-3" />
                        Open
                      </Button>
                      <button
                        class="size-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                        @click="closePreview"
                      >
                        <Icon name="i-lucide-x" class="size-4" />
                      </button>
                    </div>
                  </div>

                  <!-- Preview body -->
                  <div class="relative flex-1 min-h-0 overflow-hidden">
                    <!-- Loading shimmer -->
                    <Transition
                      leave-active-class="transition-opacity duration-300"
                      leave-to-class="opacity-0"
                    >
                      <div
                        v-if="canPreview(selectedFile) && !previewLoaded"
                        class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#f8f9fa] dark:bg-zinc-900/50 z-10"
                      >
                        <div class="relative">
                          <div
                            class="size-20 rounded-3xl flex items-center justify-center animate-pulse"
                            :class="fileIconBg(selectedFile)"
                          >
                            <Icon :name="fileIcon(selectedFile)" class="size-10" :class="fileIconColor(selectedFile)" />
                          </div>
                          <!-- Spinner ring -->
                          <div class="absolute inset-0 rounded-3xl border-2 border-transparent border-t-primary animate-spin" />
                        </div>
                        <div class="text-center space-y-1">
                          <p class="text-sm font-medium text-muted-foreground">Loading preview...</p>
                          <p class="text-xs text-muted-foreground/60 truncate max-w-[240px]">{{ selectedFile.name }}</p>
                        </div>
                      </div>
                    </Transition>

                    <!-- iframe preview -->
                    <iframe
                      v-if="canPreview(selectedFile)"
                      :key="selectedFile.id"
                      :src="previewUrl(selectedFile)"
                      class="w-full h-full border-0 transition-opacity duration-500"
                      :class="previewLoaded ? 'opacity-100' : 'opacity-0'"
                      allow="autoplay"
                      sandbox="allow-scripts allow-same-origin allow-popups"
                      @load="previewLoaded = true"
                    />

                    <!-- Non-previewable -->
                    <div
                      v-else
                      class="absolute inset-0 flex flex-col items-center justify-center gap-6 p-12 text-center"
                    >
                      <div
                        class="size-24 rounded-3xl flex items-center justify-center shadow-inner"
                        :class="fileIconBg(selectedFile)"
                      >
                        <Icon :name="fileIcon(selectedFile)" class="size-12" :class="fileIconColor(selectedFile)" />
                      </div>
                      <div class="space-y-2">
                        <p class="text-lg font-semibold">No preview available</p>
                        <p class="text-sm text-muted-foreground max-w-sm">
                          This file type can't be previewed inline. Open it in Google Drive to view or download.
                        </p>
                      </div>
                      <Button size="sm" class="bg-gradient-to-r from-[#1da462] to-[#34a853] text-white border-0" @click="openExternal(selectedFile)">
                        <Icon name="i-lucide-external-link" class="mr-1.5 size-3.5" />
                        Open in Google Drive
                      </Button>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- ══════════════════ FOOTER ══════════════════ -->
            <div class="flex items-center justify-between px-6 py-2 border-t bg-muted/20 shrink-0">
              <div class="flex items-center gap-3 text-xs text-muted-foreground">
                <div class="flex items-center gap-1.5">
                  <div class="size-1.5 rounded-full bg-[#34a853]" :class="{ 'animate-pulse': loadingFiles }" />
                  <span>Google Drive</span>
                </div>
                <span v-if="!loadingFiles && currentFiles.length" class="text-muted-foreground/50">•</span>
                <span v-if="!loadingFiles && currentFiles.length">
                  <template v-if="folderCount">{{ folderCount }} folder{{ folderCount !== 1 ? 's' : '' }}</template>
                  <template v-if="folderCount && fileCount">, </template>
                  <template v-if="fileCount">{{ fileCount }} file{{ fileCount !== 1 ? 's' : '' }}</template>
                </span>
              </div>
              <div class="flex items-center gap-3">
                <span v-if="isUploading" class="text-xs font-medium text-[#1da462] flex items-center gap-1.5">
                  <Icon name="i-lucide-loader-2" class="size-3 animate-spin" />
                  Uploading files...
                </span>
                <button
                  class="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 font-medium"
                  @click="openInDrive"
                >
                  Open in Google Drive
                  <Icon name="i-lucide-arrow-up-right" class="size-3" />
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
