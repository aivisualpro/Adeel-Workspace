<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Roles & Permissions', icon: 'i-lucide-shield-check' })

// ─── State ──────────────────────────────────────────────────
const roles = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const CHUNK_SIZE = 30
const visibleCount = ref(CHUNK_SIZE)

// CRUD state
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingRole = ref<any>(null)
const deletingRole = ref<any>(null)
const saving = ref(false)
const formData = ref<Record<string, string>>({})

// Teleport mount check
const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

// ─── Sorting ────────────────────────────────────────────────
const sortBy = ref('role')
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(col: string) {
  if (sortBy.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = col; sortDir.value = 'asc' }
}

function sortIcon(col: string) {
  if (sortBy.value !== col) return 'i-lucide-chevrons-up-down'
  return sortDir.value === 'asc' ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
}

// ─── Form Fields (matching BigQuery schema) ──────────────────
const formFields = [
  { key: 'role', label: 'Role', placeholder: 'Admin' },
  { key: 'events', label: 'Events', placeholder: 'read,write' },
  { key: 'customers', label: 'Customers', placeholder: 'read,write' },
  { key: 'projects', label: 'Projects', placeholder: 'read,write' },
  { key: 'documents', label: 'Documents', placeholder: 'read,write' },
  { key: 'notes', label: 'Notes', placeholder: 'read,write' },
  { key: 'users', label: 'Users', placeholder: 'read,write' },
  { key: 'projectDashboardLayout', label: 'Project Dashboard Layout', placeholder: '' },
  { key: 'projectButtons', label: 'Project Buttons', placeholder: '' },
]

// ─── Fetch ──────────────────────────────────────────────────
async function fetchRoles() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<{ success: boolean, roles: any[], count: number }>('/api/bigquery/roles')
    if (data.success) roles.value = data.roles
  }
  catch (e: any) {
    error.value = e.data?.statusMessage || e.message || 'Failed to load roles'
    toast.error('Failed to load roles from BigQuery')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchRoles)

// ─── CRUD Handlers ──────────────────────────────────────────
function openCreate() {
  editingRole.value = null
  formData.value = {}
  formFields.forEach(f => { formData.value[f.key] = '' })
  showDialog.value = true
}

function openEdit(role: any) {
  editingRole.value = role
  formData.value = {
    role: role.Role || '',
    events: role.Events || '',
    customers: role.Customers || '',
    projects: role.Projects || '',
    documents: role.Documents || '',
    notes: role.Notes || '',
    users: role.Users || '',
    projectDashboardLayout: role['Project Dashboard Layout'] || '',
    projectButtons: role['Project Buttons'] || '',
  }
  showDialog.value = true
}

async function handleSave() {
  saving.value = true
  try {
    if (editingRole.value) {
      await $fetch('/api/bigquery/roles', { method: 'PUT', body: formData.value })
      toast.success('Role updated successfully')
    }
    else {
      await $fetch('/api/bigquery/roles', { method: 'POST', body: formData.value })
      toast.success('Role created successfully')
    }
    showDialog.value = false
    await fetchRoles()
  }
  catch (e: any) {
    toast.error(e.data?.statusMessage || 'Failed to save role')
  }
  finally {
    saving.value = false
  }
}

function confirmDelete(role: any) {
  deletingRole.value = role
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingRole.value) return
  try {
    await $fetch('/api/bigquery/roles', { method: 'DELETE', body: { role: deletingRole.value.Role } })
    toast.success('Role deleted successfully')
    showDeleteDialog.value = false
    deletingRole.value = null
    await fetchRoles()
  }
  catch (e: any) {
    toast.error(e.data?.statusMessage || 'Failed to delete role')
  }
}

// ─── Computed ───────────────────────────────────────────────
const filteredRoles = computed(() => {
  if (!search.value) return roles.value
  const q = search.value.toLowerCase()
  return roles.value.filter((r: any) =>
    Object.values(r).filter(Boolean).some(val => String(val).toLowerCase().includes(q)),
  )
})

const COL_FIELD: Record<string, string> = {
  role: 'Role',
  events: 'Events',
  customers: 'Customers',
  projects: 'Projects',
  documents: 'Documents',
  notes: 'Notes',
  users: 'Users',
  projectDashboardLayout: 'Project Dashboard Layout',
  projectButtons: 'Project Buttons',
}

const sortedRoles = computed(() => {
  const arr = [...filteredRoles.value]
  const field = COL_FIELD[sortBy.value] || sortBy.value
  return arr.sort((a, b) => {
    const av = String(a[field] ?? '').toLowerCase()
    const bv = String(b[field] ?? '').toLowerCase()
    const cmp = av.localeCompare(bv)
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

const visibleRoles = computed(() => sortedRoles.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < sortedRoles.value.length)

watch(search, () => { visibleCount.value = CHUNK_SIZE })

// Infinite scroll
const sentinelRef = ref<HTMLElement | null>(null)
onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value) visibleCount.value += CHUNK_SIZE
    },
    { threshold: 0.1 },
  )
  watch(sentinelRef, (el) => { if (el) observer.observe(el) }, { immediate: true })
  onUnmounted(() => observer.disconnect())
})

// Permission badge color
const permColors: Record<string, string> = {
  read: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  write: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  admin: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  none: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  full: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
}

function permBadgeClass(val: string) {
  const lower = (val || '').toLowerCase()
  for (const [key, cls] of Object.entries(permColors)) {
    if (lower.includes(key)) return cls
  }
  return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
}
</script>

<template>
  <div class="w-full h-full flex flex-col min-h-0">
    <!-- Teleport search + actions to header -->
    <Teleport v-if="isMounted" to="#header-toolbar">
      <div class="flex items-center gap-2 w-full justify-end">
        <div class="relative max-w-[220px]">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search roles..." class="pl-8 h-8 text-sm" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums hidden lg:block whitespace-nowrap">
          {{ filteredRoles.length }} record{{ filteredRoles.length !== 1 ? 's' : '' }}
        </p>
        <Button variant="ghost" size="sm" class="h-8" @click="fetchRoles">
          <Icon name="i-lucide-refresh-cw" class="size-3.5" :class="{ 'animate-spin': loading }" />
        </Button>
        <Button size="sm" class="h-8" @click="openCreate">
          <Icon name="i-lucide-plus" class="mr-1 size-3.5" />
          Add Role
        </Button>
      </div>
    </Teleport>

    <!-- Error State -->
    <Card v-if="error" class="border-destructive p-6">
      <div class="flex flex-col items-center gap-3 text-center">
        <Icon name="i-lucide-alert-triangle" class="size-10 text-destructive" />
        <p class="font-medium text-destructive">{{ error }}</p>
        <Button size="sm" variant="outline" @click="fetchRoles">
          <Icon name="i-lucide-refresh-cw" class="mr-1 size-4" />
          Retry
        </Button>
      </div>
    </Card>

    <!-- Loading Skeleton -->
    <Card v-else-if="loading" class="p-6">
      <div class="space-y-4">
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-3/4" />
      </div>
    </Card>

    <!-- Data Table -->
    <div v-else class="flex-1 min-h-0 flex flex-col rounded-xl border shadow-sm bg-card overflow-hidden">
      <div class="overflow-auto flex-1 min-h-0">
        <Table>
          <TableHeader class="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead class="min-w-[150px] bg-card cursor-pointer select-none" @click="toggleSort('role')">
                <div class="flex items-center gap-1">Role <Icon :name="sortIcon('role')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[130px] bg-card cursor-pointer select-none" @click="toggleSort('events')">
                <div class="flex items-center gap-1">Events <Icon :name="sortIcon('events')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[140px] bg-card cursor-pointer select-none" @click="toggleSort('customers')">
                <div class="flex items-center gap-1">Customers <Icon :name="sortIcon('customers')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[130px] bg-card cursor-pointer select-none" @click="toggleSort('projects')">
                <div class="flex items-center gap-1">Projects <Icon :name="sortIcon('projects')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[130px] bg-card cursor-pointer select-none" @click="toggleSort('documents')">
                <div class="flex items-center gap-1">Documents <Icon :name="sortIcon('documents')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[120px] bg-card cursor-pointer select-none" @click="toggleSort('notes')">
                <div class="flex items-center gap-1">Notes <Icon :name="sortIcon('notes')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[120px] bg-card cursor-pointer select-none" @click="toggleSort('users')">
                <div class="flex items-center gap-1">Users <Icon :name="sortIcon('users')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[190px] bg-card cursor-pointer select-none" @click="toggleSort('projectDashboardLayout')">
                <div class="flex items-center gap-1">Project Dashboard Layout <Icon :name="sortIcon('projectDashboardLayout')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[150px] bg-card cursor-pointer select-none" @click="toggleSort('projectButtons')">
                <div class="flex items-center gap-1">Project Buttons <Icon :name="sortIcon('projectButtons')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="w-[80px] bg-card text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="(role, idx) in visibleRoles"
              :key="role.Role || idx"
              class="group"
            >
              <!-- Role Name -->
              <TableCell>
                <div class="flex items-center gap-2">
                  <div class="size-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center shrink-0">
                    <Icon name="i-lucide-shield-check" class="size-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <span class="font-medium">{{ role.Role || '—' }}</span>
                </div>
              </TableCell>

              <!-- Events -->
              <TableCell>
                <Badge v-if="role.Events" variant="outline" :class="permBadgeClass(role.Events)">{{ role.Events }}</Badge>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>

              <!-- Customers -->
              <TableCell>
                <Badge v-if="role.Customers" variant="outline" :class="permBadgeClass(role.Customers)">{{ role.Customers }}</Badge>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>

              <!-- Projects -->
              <TableCell>
                <Badge v-if="role.Projects" variant="outline" :class="permBadgeClass(role.Projects)">{{ role.Projects }}</Badge>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>

              <!-- Documents -->
              <TableCell>
                <Badge v-if="role.Documents" variant="outline" :class="permBadgeClass(role.Documents)">{{ role.Documents }}</Badge>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>

              <!-- Notes -->
              <TableCell>
                <Badge v-if="role.Notes" variant="outline" :class="permBadgeClass(role.Notes)">{{ role.Notes }}</Badge>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>

              <!-- Users -->
              <TableCell>
                <Badge v-if="role.Users" variant="outline" :class="permBadgeClass(role.Users)">{{ role.Users }}</Badge>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </TableCell>

              <!-- Project Dashboard Layout -->
              <TableCell class="text-muted-foreground text-sm">{{ role['Project Dashboard Layout'] || '—' }}</TableCell>

              <!-- Project Buttons -->
              <TableCell class="text-muted-foreground text-sm">{{ role['Project Buttons'] || '—' }}</TableCell>

              <!-- Actions -->
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" class="size-7" @click="openEdit(role)">
                    <Icon name="i-lucide-pencil" class="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" class="size-7 text-destructive hover:text-destructive" @click="confirmDelete(role)">
                    <Icon name="i-lucide-trash-2" class="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>

            <!-- Empty State -->
            <TableRow v-if="visibleRoles.length === 0">
              <TableCell :colspan="10" class="h-32 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="i-lucide-inbox" class="size-8" />
                  <p>No roles found</p>
                  <Button size="sm" variant="outline" @click="openCreate">
                    <Icon name="i-lucide-plus" class="mr-1 size-4" />
                    Add Role
                  </Button>
                </div>
              </TableCell>
            </TableRow>

            <!-- Infinite scroll sentinel -->
            <tr v-if="hasMore" ref="sentinelRef">
              <td :colspan="10" class="h-10 text-center text-xs text-muted-foreground">
                Loading more…
              </td>
            </tr>
          </TableBody>
        </Table>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog v-model:open="showDialog">
      <DialogContent class="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ editingRole ? 'Edit' : 'New' }} Role</DialogTitle>
          <DialogDescription class="sr-only">
            {{ editingRole ? 'Edit' : 'Create' }} a role record
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="handleSave">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div v-for="field in formFields" :key="field.key" class="space-y-1.5">
              <Label :for="field.key" class="text-xs">{{ field.label }}</Label>
              <Input
                :id="field.key"
                v-model="formData[field.key]"
                type="text"
                :placeholder="field.placeholder"
                :disabled="!!editingRole && field.key === 'role'"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" @click="showDialog = false">Cancel</Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 size-4 animate-spin" />
              {{ editingRole ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Role?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the <strong>{{ deletingRole?.Role }}</strong> role. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleDelete">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
