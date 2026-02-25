<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'All Projects', icon: 'i-lucide-folder-kanban' })

// ─── State ──────────────────────────────────────────────────
const projects = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const CHUNK_SIZE = 30
const visibleCount = ref(CHUNK_SIZE)

const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

// Drive files modal
const showFilesModal = ref(false)
const filesModalProject = ref<any>(null)

function openFilesModal(project: any) {
  filesModalProject.value = project
  showFilesModal.value = true
}

// Lookup maps: email → name, customerId → name
const userNameMap = ref<Record<string, string>>({})
const customerNameMap = ref<Record<string, string>>({})

// ─── Fetch ──────────────────────────────────────────────────
async function fetchProjects() {
  loading.value = true
  error.value = ''
  try {
    const [projectData, userData, customerData] = await Promise.all([
      $fetch<{ success: boolean, projects: any[], count: number }>('/api/bigquery/projects'),
      $fetch<{ success: boolean, users: any[] }>('/api/bigquery/users').catch(() => ({ success: false, users: [] })),
      $fetch<{ success: boolean, customers: any[] }>('/api/bigquery/customers').catch(() => ({ success: false, customers: [] })),
    ])
    if (projectData.success) projects.value = projectData.projects
    // Build email → full name lookup
    if (userData.success) {
      userNameMap.value = Object.fromEntries(
        userData.users
          .filter((u: any) => u.Email)
          .map((u: any) => [
            u.Email.toLowerCase(),
            [u['First Name'], u['Last Name']].filter(Boolean).join(' ') || u.Email,
          ]),
      )
    }
    // Build customerId → full name lookup
    if (customerData.success) {
      customerNameMap.value = Object.fromEntries(
        customerData.customers
          .filter((c: any) => c['Customer ID'])
          .map((c: any) => [
            c['Customer ID'],
            [c['First Name'], c['Last Name']].filter(Boolean).join(' ') || c['Customer ID'],
          ]),
      )
    }
  }
  catch (e: any) {
    error.value = e.data?.statusMessage || e.message || 'Failed to load projects'
    toast.error('Failed to load projects from BigQuery')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchProjects)

// ─── Sorting ────────────────────────────────────────────────
const sortBy = ref('TimeStamp')
const sortDir = ref<'asc' | 'desc'>('desc')

function toggleSort(col: string) {
  if (sortBy.value === col) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortBy.value = col
    sortDir.value = 'asc'
  }
}

function sortIcon(col: string) {
  if (sortBy.value !== col) return 'i-lucide-chevrons-up-down'
  return sortDir.value === 'asc' ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
}

// ─── Column definitions ─────────────────────────────────────
const columns = [
  { key: 'Project ID', label: 'Project ID', width: '110px' },
  { key: 'Customer name', label: 'Customer', width: '160px' },
  { key: 'Customer Address', label: 'Address', width: '200px' },
  { key: 'City', label: 'City', width: '100px' },
  { key: 'Zip Code', label: 'Zip', width: '70px' },
  { key: 'Branch Name', label: 'Branch', width: '80px' },
  { key: 'Project Type', label: 'Type', width: '80px' },
  { key: 'Job Status', label: 'Job Status', width: '100px' },
  { key: 'Project Status', label: 'Project Status', width: '120px' },
  { key: 'Project Manager', label: 'PM', width: '140px' },
  { key: 'Project Manager VA', label: 'PM VA', width: '140px' },
  { key: 'Finance Manager', label: 'Finance Mgr', width: '140px' },
  { key: 'Engineer', label: 'Engineer', width: '130px' },
  { key: 'Permit Coordinator', label: 'Permit Coord.', width: '140px' },
  { key: 'Vendor Name', label: 'Vendor', width: '120px' },
  { key: 'Project Equipment', label: 'Equipment', width: '150px' },
  { key: 'Panels Amount', label: 'Panels', width: '70px' },
  { key: 'KW', label: 'KW', width: '60px' },
  { key: 'Watt', label: 'Watt', width: '60px' },
  { key: 'Utillity', label: 'Utility', width: '100px' },
  { key: 'Solar Equipment', label: 'Solar Equip.', width: '120px' },
  { key: 'Inverter Type', label: 'Inverter', width: '100px' },
  { key: 'Batteries Qty', label: 'Batteries', width: '80px' },
  { key: 'SSA Status', label: 'SSA Status', width: '90px' },
  { key: 'Solar Install Status', label: 'Solar Install', width: '100px' },
  { key: 'MPU Installed Status', label: 'MPU Status', width: '100px' },
  { key: 'Battery Installed Status', label: 'Battery Status', width: '100px' },
  { key: 'Completion Status', label: 'Completion', width: '100px' },
  { key: 'Final Status', label: 'Final', width: '90px' },
  { key: 'PTO Status', label: 'PTO Status', width: '90px' },
  { key: 'Fire Approval Needed', label: 'Fire Approval', width: '100px' },
  { key: 'Project Price', label: 'Price', width: '100px' },
  { key: 'Contract Price', label: 'Contract $', width: '100px' },
  { key: 'Project Net Amount', label: 'Net Amount', width: '100px' },
  { key: 'Project Start', label: 'Start Date', width: '100px' },
  { key: 'Project End', label: 'End Date', width: '100px' },
  { key: 'Completion Date', label: 'Completion', width: '100px' },
  { key: 'Final Date', label: 'Final Date', width: '100px' },
  { key: 'PM Approve Project', label: 'PM Approved', width: '100px' },
  { key: 'Finance Ready', label: 'Finance Ready', width: '100px' },
  { key: 'PTO Request', label: 'PTO Request', width: '100px' },
  { key: 'PTO Submitted', label: 'PTO Submitted', width: '100px' },
  { key: 'PTO Received', label: 'PTO Received', width: '100px' },
  { key: 'AHJ', label: 'AHJ', width: '100px' },
  { key: 'Jurisdiction', label: 'Jurisdiction', width: '120px' },
  { key: 'Project Folder', label: 'Folder', width: '80px' },
  { key: 'Create By', label: 'Created By', width: '130px' },
  { key: 'TimeStamp', label: 'Created', width: '110px' },
]

// ─── Computed ───────────────────────────────────────────────
const filteredProjects = computed(() => {
  if (!search.value) return projects.value
  const q = search.value.toLowerCase()
  return projects.value.filter((p: any) => {
    const searchable = [
      p['Project ID'], p['Customer name'], p['Customer Address'],
      p['City'], p['Project Type'], p['Job Status'], p['Project Status'],
      p['Project Manager'], p['Engineer'], p['Vendor Name'],
    ].filter(Boolean)
    return searchable.some(v => String(v).toLowerCase().includes(q))
  })
})

const sortedProjects = computed(() => {
  const arr = [...filteredProjects.value]
  const col = sortBy.value
  return arr.sort((a, b) => {
    let av = a[col] ?? ''
    let bv = b[col] ?? ''
    // Handle date objects
    if (av && typeof av === 'object' && av.value) av = av.value
    if (bv && typeof bv === 'object' && bv.value) bv = bv.value
    av = String(av).toLowerCase()
    bv = String(bv).toLowerCase()
    const cmp = av.localeCompare(bv)
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

const visibleProjects = computed(() => sortedProjects.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < sortedProjects.value.length)

watch(search, () => { visibleCount.value = CHUNK_SIZE })

// Infinite scroll
const sentinelRef = ref<HTMLElement | null>(null)
onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value) {
        visibleCount.value += CHUNK_SIZE
      }
    },
    { threshold: 0.1 },
  )
  watch(sentinelRef, (el) => {
    if (el) observer.observe(el)
  }, { immediate: true })
  onUnmounted(() => observer.disconnect())
})

// ─── Helpers ────────────────────────────────────────────────
function formatDate(value: any): string {
  if (!value) return '—'
  try {
    const v = value?.value || value
    const d = new Date(v)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  catch { return String(value) }
}

function formatCurrency(value: any): string {
  if (!value && value !== 0) return '—'
  const n = Number(value)
  if (isNaN(n)) return String(value)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
}

function cellValue(row: any, key: string): string {
  const val = row[key]
  if (val === null || val === undefined || val === '') return '—'
  // Date objects from BigQuery
  if (typeof val === 'object' && val.value) return formatDate(val)
  return String(val)
}

function statusColor(status: string) {
  const s = (status || '').toLowerCase()
  if (s.includes('complete') || s.includes('closed') || s.includes('rcvd')) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  if (s.includes('pending') || s.includes('new') || s.includes('tbd')) return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  if (s.includes('cancel') || s.includes('n/a')) return 'bg-red-500/10 text-red-500 border-red-500/20'
  if (s.includes('open') || s.includes('active') || s.includes('in progress')) return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  return 'bg-muted text-muted-foreground'
}

// Resolve email → full name from Users
function resolveName(email: string): string {
  if (!email) return '—'
  return userNameMap.value[email.toLowerCase()] || email
}

// Resolve Customer ID → full name from Customers
function resolveCustomer(project: any): string {
  const id = project['Customer ID']
  if (!id) return '—'
  return customerNameMap.value[id] || id
}

const emailColumns = [
  'Project Manager', 'Project Manager VA', 'Finance Manager',
  'Finance Manager VA', 'Engineer', 'Permit Coordinator', 'Create By',
]
const statusColumns = [
  'Job Status', 'Project Status', 'SSA Status', 'Solar Install Status',
  'MPU Installed Status', 'Battery Installed Status', 'Completion Status',
  'Final Status', 'PTO Status', 'Fire Approval Needed',
]
const dateColumns = [
  'Project Start', 'Project End', 'Completion Date', 'Final Date',
  'PM Approve Project', 'Finance Ready', 'PTO Request', 'PTO Submitted',
  'PTO Received', 'TimeStamp',
]
const currencyColumns = ['Project Price', 'Contract Price', 'Project Net Amount']
</script>

<template>
  <ProjectsLayout>
    <div class="w-full h-full flex flex-col min-h-0">
      <!-- Teleport search + actions to header -->
      <Teleport v-if="isMounted" to="#header-toolbar">
        <div class="flex items-center gap-2 w-full justify-end">
          <div class="relative max-w-[220px]">
            <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input v-model="search" placeholder="Search projects..." class="pl-8 h-8 text-sm" />
          </div>
          <p class="text-xs text-muted-foreground tabular-nums hidden lg:block whitespace-nowrap">
            {{ filteredProjects.length }} record{{ filteredProjects.length !== 1 ? 's' : '' }}
          </p>
          <Button variant="ghost" size="sm" class="h-8" @click="fetchProjects">
            <Icon name="i-lucide-refresh-cw" class="size-3.5" :class="{ 'animate-spin': loading }" />
          </Button>
        </div>
      </Teleport>

      <!-- Error State -->
      <Card v-if="error" class="border-destructive p-6 m-4">
        <div class="flex flex-col items-center gap-3 text-center">
          <Icon name="i-lucide-alert-triangle" class="size-10 text-destructive" />
          <p class="font-medium text-destructive">{{ error }}</p>
          <Button size="sm" variant="outline" @click="fetchProjects">
            <Icon name="i-lucide-refresh-cw" class="mr-1 size-4" />
            Retry
          </Button>
        </div>
      </Card>

      <!-- Loading Skeleton -->
      <Card v-else-if="loading" class="p-6 m-4">
        <div class="space-y-4">
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-3/4" />
        </div>
      </Card>

      <!-- Data Table -->
      <div v-else class="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div class="overflow-auto flex-1 min-h-0">
          <Table>
            <TableHeader class="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead
                  v-for="col in columns"
                  :key="col.key"
                  class="bg-card cursor-pointer select-none whitespace-nowrap"
                  :style="{ minWidth: col.width }"
                  @click="toggleSort(col.key)"
                >
                  <div class="flex items-center gap-1">
                    {{ col.label }}
                    <Icon :name="sortIcon(col.key)" class="size-3 opacity-60" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              <TableRow
                v-for="(project, idx) in visibleProjects"
                :key="project['Project ID'] || idx"
                class="group"
              >
                <TableCell v-for="col in columns" :key="col.key">
                  <!-- Project Folder -->
                  <template v-if="col.key === 'Project Folder'">
                    <button
                      v-if="project['Project Folder']"
                      class="group/folder relative flex items-center justify-center size-8 rounded-lg transition-all duration-200 hover:bg-[#1da462]/10 hover:shadow-sm"
                      title="View files in Google Drive"
                      @click.stop="openFilesModal(project)"
                    >
                      <svg class="size-5 transition-all duration-200 group-hover/folder:scale-110" viewBox="0 0 24 24" fill="none">
                        <path d="M4.5 19.5l3-5.25H21l-3 5.25H4.5z" fill="#1da462" opacity=".7" />
                        <path d="M12 4.5L4.5 17.25l3 2.25L15 7.5 12 4.5z" fill="#1da462" opacity=".85" />
                        <path d="M21 15l-4.5-7.5L13.5 9l4.5 7.5L21 15z" fill="#1da462" />
                      </svg>
                      <span class="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-[#34a853] opacity-0 group-hover/folder:opacity-100 transition-opacity" />
                    </button>
                    <span v-else class="text-muted-foreground/40">—</span>
                  </template>

                  <!-- Status badges -->
                  <template v-else-if="statusColumns.includes(col.key)">
                    <Badge
                      v-if="project[col.key] && project[col.key] !== '—'"
                      variant="outline"
                      :class="statusColor(project[col.key])"
                      class="text-[10px] whitespace-nowrap"
                    >
                      {{ project[col.key] }}
                    </Badge>
                    <span v-else class="text-muted-foreground/40">—</span>
                  </template>

                  <!-- Date fields -->
                  <template v-else-if="dateColumns.includes(col.key)">
                    <span class="text-muted-foreground text-sm whitespace-nowrap">
                      {{ formatDate(project[col.key]) }}
                    </span>
                  </template>

                  <!-- Currency fields -->
                  <template v-else-if="currencyColumns.includes(col.key)">
                    <span class="text-sm tabular-nums whitespace-nowrap">
                      {{ formatCurrency(project[col.key]) }}
                    </span>
                  </template>

                  <!-- Project ID -->
                  <template v-else-if="col.key === 'Project ID'">
                    <span class="font-mono text-xs">{{ project['Project ID'] || '—' }}</span>
                  </template>

                  <!-- Customer name with avatar -->
                  <template v-else-if="col.key === 'Customer name'">
                    <div class="flex items-center gap-2">
                      <Avatar class="size-6 border shrink-0">
                        <AvatarFallback class="text-[9px] font-medium bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-blue-700 dark:text-blue-300">
                          {{ resolveCustomer(project).substring(0, 2).toUpperCase() }}
                        </AvatarFallback>
                      </Avatar>
                      <span class="font-medium truncate max-w-[130px]">{{ resolveCustomer(project) }}</span>
                    </div>
                  </template>

                  <!-- Email → Name columns -->
                  <template v-else-if="emailColumns.includes(col.key)">
                    <span class="text-sm whitespace-nowrap">{{ resolveName(project[col.key]) }}</span>
                  </template>

                  <!-- Address truncated -->
                  <template v-else-if="col.key === 'Customer Address'">
                    <span class="truncate max-w-[180px] block" :title="project['Customer Address']">
                      {{ project['Customer Address'] || '—' }}
                    </span>
                  </template>

                  <!-- Default text -->
                  <template v-else>
                    <span class="text-sm whitespace-nowrap">{{ cellValue(project, col.key) }}</span>
                  </template>
                </TableCell>
              </TableRow>

              <!-- Empty State -->
              <TableRow v-if="visibleProjects.length === 0">
                <TableCell :colspan="columns.length" class="h-32 text-center">
                  <div class="flex flex-col items-center gap-2 text-muted-foreground">
                    <Icon name="i-lucide-inbox" class="size-8" />
                    <p>No projects found</p>
                  </div>
                </TableCell>
              </TableRow>

              <!-- Infinite scroll sentinel -->
              <tr v-if="hasMore" ref="sentinelRef">
                <td :colspan="columns.length" class="h-10 text-center text-xs text-muted-foreground">
                  Loading more…
                </td>
              </tr>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>

    <!-- Google Drive Files Modal -->
    <CustomerFilesModal
      v-if="filesModalProject"
      v-model:open="showFilesModal"
      :customer-name="resolveCustomer(filesModalProject) + ' — ' + (filesModalProject['Project ID'] || '')"
      :drive-link="filesModalProject['Project Folder'] || ''"
    />
  </ProjectsLayout>
</template>
