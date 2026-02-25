<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Users', icon: 'i-lucide-user-cog' })

// ─── State ──────────────────────────────────────────────────
const users = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const CHUNK_SIZE = 30
const visibleCount = ref(CHUNK_SIZE)

// CRUD state
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingUser = ref<any>(null)
const deletingUser = ref<any>(null)
const saving = ref(false)
const formData = ref<Record<string, any>>({})

// Teleport mount check
const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

// ─── Form Fields ─────────────────────────────────────────────
const formFields = [
  { key: 'firstName', label: 'First Name', placeholder: 'John' },
  { key: 'lastName', label: 'Last Name', placeholder: 'Doe' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
  { key: 'phone', label: 'Phone', placeholder: '(555) 000-0000' },
  { key: 'role', label: 'Role', placeholder: 'Admin' },
  { key: 'secondaryRole', label: 'Secondary Role', placeholder: '' },
  { key: 'vendors', label: 'Vendors', placeholder: '' },
  { key: 'department', label: 'Department', placeholder: '' },
  { key: 'branch', label: 'Branch', placeholder: '' },
  { key: 'location', label: 'Location', placeholder: '' },
  { key: 'utc', label: 'UTC', type: 'number', placeholder: '-5' },
  {
    key: 'status', label: 'Status', type: 'select', options: [
      { label: 'Active', value: 'true' },
      { label: 'Inactive', value: 'false' },
    ],
  },
]

// ─── Fetch ──────────────────────────────────────────────────
async function fetchUsers() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<{ success: boolean, users: any[], count: number }>('/api/bigquery/users')
    if (data.success) {
      users.value = data.users
    }
  }
  catch (e: any) {
    error.value = e.data?.statusMessage || e.message || 'Failed to load users'
    toast.error('Failed to load users from BigQuery')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchUsers)

// ─── CRUD Handlers ──────────────────────────────────────────
function openCreate() {
  editingUser.value = null
  formData.value = {}
  formFields.forEach(f => { formData.value[f.key] = f.type === 'select' ? 'true' : '' })
  showDialog.value = true
}

function openEdit(user: any) {
  editingUser.value = user
  formData.value = {
    firstName: user['First Name'] || '',
    lastName: user['Last Name'] || '',
    email: user.Email || '',
    phone: user.Phone || '',
    role: user.Role || '',
    secondaryRole: user['Secondary Role'] || '',
    vendors: user.Vendors || '',
    department: user.Department || '',
    branch: user.Branch || '',
    location: user.Location || '',
    utc: user.UTC ?? '',
    status: user.Status === true || user.Status === 'true' ? 'true' : 'false',
  }
  showDialog.value = true
}

async function handleSave() {
  saving.value = true
  try {
    if (editingUser.value) {
      await $fetch('/api/bigquery/users', { method: 'PUT', body: formData.value })
      toast.success('User updated successfully')
    }
    else {
      await $fetch('/api/bigquery/users', { method: 'POST', body: formData.value })
      toast.success('User created successfully')
    }
    showDialog.value = false
    await fetchUsers()
  }
  catch (e: any) {
    toast.error(e.data?.statusMessage || 'Failed to save user')
  }
  finally {
    saving.value = false
  }
}

function confirmDelete(user: any) {
  deletingUser.value = user
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingUser.value) return
  try {
    await $fetch('/api/bigquery/users', {
      method: 'DELETE',
      body: { email: deletingUser.value.Email },
    })
    toast.success('User deleted successfully')
    showDeleteDialog.value = false
    deletingUser.value = null
    await fetchUsers()
  }
  catch (e: any) {
    toast.error(e.data?.statusMessage || 'Failed to delete user')
  }
}

// ─── Sorting ───────────────────────────────────────────────
const sortBy = ref('fullName')
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(col: string) {
  if (sortBy.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = col; sortDir.value = 'asc' }
}

function sortIcon(col: string) {
  if (sortBy.value !== col) return 'i-lucide-chevrons-up-down'
  return sortDir.value === 'asc' ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
}

// ─── Computed ───────────────────────────────────────────────
const filteredUsers = computed(() => {
  if (!search.value) return users.value
  const q = search.value.toLowerCase()
  return users.value.filter((u: any) => {
    const fullName = [u['First Name'], u['Last Name']].filter(Boolean).join(' ')
    return [...Object.values(u), fullName].filter(Boolean).some(val => String(val).toLowerCase().includes(q))
  })
})

const USER_COL_FIELD: Record<string, string> = {
  fullName: 'First Name',
  email: 'Email',
  phone: 'Phone',
  role: 'Role',
  secondaryRole: 'Secondary Role',
  vendors: 'Vendors',
  department: 'Department',
  branch: 'Branch',
  status: 'Status',
  location: 'Location',
  utc: 'UTC',
  lastLoginDate: 'Last Login Date',
}

const sortedUsers = computed(() => {
  const arr = [...filteredUsers.value]
  const field = USER_COL_FIELD[sortBy.value] || sortBy.value
  return arr.sort((a, b) => {
    let av = ''
    let bv = ''
    if (sortBy.value === 'fullName') {
      av = [a['First Name'], a['Last Name']].filter(Boolean).join(' ').toLowerCase()
      bv = [b['First Name'], b['Last Name']].filter(Boolean).join(' ').toLowerCase()
    }
    else {
      av = String(a[field] ?? '').toLowerCase()
      bv = String(b[field] ?? '').toLowerCase()
    }
    const cmp = av.localeCompare(bv)
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

const visibleUsers = computed(() => sortedUsers.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < sortedUsers.value.length)

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
function getInitials(first?: string, last?: string): string {
  return `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase()
}

function getFullName(u: any): string {
  return [u['First Name'], u['Last Name']].filter(Boolean).join(' ') || '—'
}

function formatPhone(value?: string): string {
  if (!value) return '—'
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return value
}

function statusLabel(u: any): boolean {
  return u.Status === true || u.Status === 'true'
}
</script>

<template>
  <div class="w-full h-full flex flex-col min-h-0">
    <!-- Teleport search + actions to header -->
    <Teleport v-if="isMounted" to="#header-toolbar">
      <div class="flex items-center gap-2 w-full justify-end">
        <div class="relative max-w-[220px]">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search users..." class="pl-8 h-8 text-sm" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums hidden lg:block whitespace-nowrap">
          {{ filteredUsers.length }} record{{ filteredUsers.length !== 1 ? 's' : '' }}
        </p>
        <Button variant="ghost" size="sm" class="h-8" @click="fetchUsers">
          <Icon name="i-lucide-refresh-cw" class="size-3.5" :class="{ 'animate-spin': loading }" />
        </Button>
        <Button size="sm" class="h-8" @click="openCreate">
          <Icon name="i-lucide-plus" class="mr-1 size-3.5" />
          Add User
        </Button>
      </div>
    </Teleport>

    <!-- Error State -->
    <Card v-if="error" class="border-destructive p-6">
      <div class="flex flex-col items-center gap-3 text-center">
        <Icon name="i-lucide-alert-triangle" class="size-10 text-destructive" />
        <p class="font-medium text-destructive">{{ error }}</p>
        <Button size="sm" variant="outline" @click="fetchUsers">
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
              <TableHead class="min-w-[180px] bg-card cursor-pointer select-none" @click="toggleSort('fullName')">
                <div class="flex items-center gap-1">Full Name <Icon :name="sortIcon('fullName')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[190px] bg-card cursor-pointer select-none" @click="toggleSort('email')">
                <div class="flex items-center gap-1">Email <Icon :name="sortIcon('email')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[140px] bg-card cursor-pointer select-none" @click="toggleSort('phone')">
                <div class="flex items-center gap-1">Phone <Icon :name="sortIcon('phone')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[130px] bg-card cursor-pointer select-none" @click="toggleSort('role')">
                <div class="flex items-center gap-1">Role <Icon :name="sortIcon('role')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[150px] bg-card cursor-pointer select-none" @click="toggleSort('secondaryRole')">
                <div class="flex items-center gap-1">Secondary Role <Icon :name="sortIcon('secondaryRole')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[120px] bg-card cursor-pointer select-none" @click="toggleSort('vendors')">
                <div class="flex items-center gap-1">Vendors <Icon :name="sortIcon('vendors')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[140px] bg-card cursor-pointer select-none" @click="toggleSort('department')">
                <div class="flex items-center gap-1">Department <Icon :name="sortIcon('department')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[120px] bg-card cursor-pointer select-none" @click="toggleSort('branch')">
                <div class="flex items-center gap-1">Branch <Icon :name="sortIcon('branch')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[100px] bg-card cursor-pointer select-none" @click="toggleSort('status')">
                <div class="flex items-center gap-1">Status <Icon :name="sortIcon('status')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[120px] bg-card cursor-pointer select-none" @click="toggleSort('location')">
                <div class="flex items-center gap-1">Location <Icon :name="sortIcon('location')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[70px] bg-card cursor-pointer select-none" @click="toggleSort('utc')">
                <div class="flex items-center gap-1">UTC <Icon :name="sortIcon('utc')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[170px] bg-card cursor-pointer select-none" @click="toggleSort('lastLoginDate')">
                <div class="flex items-center gap-1">Last Login Date <Icon :name="sortIcon('lastLoginDate')" class="size-3 opacity-60" /></div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="(user, idx) in visibleUsers"
              :key="user.Email || idx"
              class="group"
            >
              <!-- Full Name -->
              <TableCell>
                <div class="flex items-center gap-2">
                  <Avatar class="size-7 border shrink-0">
                    <AvatarFallback class="text-[10px] font-medium bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-700 dark:text-violet-300">
                      {{ getInitials(user['First Name'], user['Last Name']) }}
                    </AvatarFallback>
                  </Avatar>
                  <span class="font-medium">{{ getFullName(user) }}</span>
                </div>
              </TableCell>

              <!-- Email -->
              <TableCell>
                <span class="text-muted-foreground text-sm">{{ user.Email || '—' }}</span>
              </TableCell>

              <!-- Phone -->
              <TableCell>{{ formatPhone(user.Phone) }}</TableCell>

              <!-- Role -->
              <TableCell>
                <Badge v-if="user.Role" variant="outline" class="bg-blue-500/10 text-blue-600 border-blue-500/20">
                  {{ user.Role }}
                </Badge>
                <span v-else class="text-muted-foreground">—</span>
              </TableCell>

              <!-- Secondary Role -->
              <TableCell class="text-muted-foreground text-sm">{{ user['Secondary Role'] || '—' }}</TableCell>

              <!-- Vendors -->
              <TableCell class="text-muted-foreground text-sm">{{ user.Vendors || '—' }}</TableCell>

              <!-- Department -->
              <TableCell>{{ user.Department || '—' }}</TableCell>

              <!-- Branch -->
              <TableCell>{{ user.Branch || '—' }}</TableCell>

              <!-- Status -->
              <TableCell>
                <Badge
                  v-if="statusLabel(user)"
                  variant="outline"
                  class="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                >
                  Active
                </Badge>
                <Badge v-else variant="outline" class="bg-zinc-500/10 text-zinc-500 border-zinc-500/20">
                  Inactive
                </Badge>
              </TableCell>

              <!-- Location -->
              <TableCell>{{ user.Location || '—' }}</TableCell>

              <!-- UTC -->
              <TableCell class="text-muted-foreground text-sm">{{ user.UTC != null ? `UTC${user.UTC >= 0 ? '+' : ''}${user.UTC}` : '—' }}</TableCell>

              <!-- Last Login Date -->
              <TableCell>
                <span class="text-muted-foreground text-sm">{{ user['Last Login Date'] || user['Last Log In TimeStamp'] || '—' }}</span>
              </TableCell>
            </TableRow>

            <!-- Empty State -->
            <TableRow v-if="visibleUsers.length === 0">
              <TableCell :colspan="12" class="h-32 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="i-lucide-inbox" class="size-8" />
                  <p>No users found</p>
                  <Button size="sm" variant="outline" @click="openCreate">
                    <Icon name="i-lucide-plus" class="mr-1 size-4" />
                    Add User
                  </Button>
                </div>
              </TableCell>
            </TableRow>

            <!-- Infinite scroll sentinel -->
            <tr v-if="hasMore" ref="sentinelRef">
              <td :colspan="12" class="h-10 text-center text-xs text-muted-foreground">
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
          <DialogTitle>{{ editingUser ? 'Edit' : 'New' }} User</DialogTitle>
          <DialogDescription class="sr-only">
            {{ editingUser ? 'Edit' : 'Create' }} a user record
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="handleSave">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div v-for="field in formFields" :key="field.key" class="space-y-1.5">
              <Label :for="field.key" class="text-xs">{{ field.label }}</Label>
              <Select v-if="field.type === 'select'" v-model="formData[field.key]">
                <SelectTrigger>
                  <SelectValue :placeholder="`Select ${field.label.toLowerCase()}`" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="opt in field.options" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Input
                v-else
                :id="field.key"
                v-model="formData[field.key]"
                :type="field.type || 'text'"
                :placeholder="field.placeholder"
                :disabled="!!editingUser && field.key === 'email'"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" @click="showDialog = false">Cancel</Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 size-4 animate-spin" />
              {{ editingUser ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{{ getFullName(deletingUser || {}) }}</strong>
            ({{ deletingUser?.Email }}). This action cannot be undone.
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
