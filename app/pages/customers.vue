<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Customers', icon: 'i-lucide-users' })

// ─── State ──────────────────────────────────────────────────
const customers = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const CHUNK_SIZE = 30
const visibleCount = ref(CHUNK_SIZE)

// CRUD state
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingCustomer = ref<any>(null)
const deletingCustomer = ref<any>(null)
const saving = ref(false)
const formData = ref<Record<string, string>>({})

// Drive files modal
const showFilesModal = ref(false)
const filesModalCustomer = ref<any>(null)

function openFilesModal(customer: any) {
  filesModalCustomer.value = customer
  showFilesModal.value = true
}

// Teleport mount check
const isMounted = ref(false)
onMounted(() => { isMounted.value = true })

// ─── Form Fields (matching BigQuery schema) ─────────────────
const formFields = [
  { key: 'customerId', label: 'Customer ID', placeholder: 'CUS-001' },
  { key: 'firstName', label: 'First Name', placeholder: 'John' },
  { key: 'lastName', label: 'Last Name', placeholder: 'Doe' },
  { key: 'secondaryName', label: 'Secondary Name', placeholder: '' },
  { key: 'secondaryLastName', label: 'Secondary Last Name', placeholder: '' },
  { key: 'address', label: 'Address', placeholder: '123 Main St' },
  { key: 'unit', label: 'Unit #', placeholder: 'Apt 4B' },
  { key: 'phone', label: 'Phone', placeholder: '+1 (555) 000-0000' },
  { key: 'mobile', label: 'Mobile', placeholder: '+1 (555) 111-2222' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
  { key: 'seniorCitizen', label: 'Senior Citizen', type: 'select', options: [
    { label: 'No', value: 'No' },
    { label: 'Yes', value: 'Yes' },
  ] },
  { key: 'createBy', label: 'Created By', placeholder: 'Admin' },
]

// User lookup: email → full name
const userNameMap = ref<Record<string, string>>({})

// ─── Fetch ──────────────────────────────────────────────────
async function fetchCustomers() {
  loading.value = true
  error.value = ''
  try {
    const [customerData, userData] = await Promise.all([
      $fetch<{ success: boolean, customers: any[], count: number }>('/api/bigquery/customers'),
      $fetch<{ success: boolean, users: any[] }>('/api/bigquery/users').catch(() => ({ success: false, users: [] })),
    ])
    if (customerData.success) customers.value = customerData.customers
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
  }
  catch (e: any) {
    error.value = e.data?.statusMessage || e.message || 'Failed to load customers'
    toast.error('Failed to load customers from BigQuery')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchCustomers)

// Resolve a "Create By" email to a display name
function resolveCreatedBy(raw: string): { name: string, email: string } {
  if (!raw) return { name: '—', email: '' }
  const key = raw.toLowerCase()
  const name = userNameMap.value[key] || raw
  return { name, email: name !== raw ? raw : '' }
}

// ─── CRUD Handlers ──────────────────────────────────────────
function openCreate() {
  editingCustomer.value = null
  formData.value = {}
  formFields.forEach(f => { formData.value[f.key] = '' })
  showDialog.value = true
}

function openEdit(customer: any) {
  editingCustomer.value = customer
  formData.value = {
    customerId: customer['Customer ID'] || '',
    firstName: customer['First Name'] || '',
    lastName: customer['Last Name'] || '',
    secondaryName: customer['Secondary Name'] || '',
    secondaryLastName: customer['Secondary Last Name'] || '',
    address: customer.Address || '',
    unit: customer['Unit #'] || '',
    phone: customer.Phone || '',
    mobile: customer.Mobile || '',
    email: customer.Email || '',
    seniorCitizen: customer.seniorCitizen || 'No',
    createBy: customer['Create By'] || '',
  }
  showDialog.value = true
}

async function handleSave() {
  saving.value = true
  try {
    if (editingCustomer.value) {
      await $fetch('/api/bigquery/customers', {
        method: 'PUT',
        body: formData.value,
      })
      toast.success('Customer updated successfully')
    }
    else {
      await $fetch('/api/bigquery/customers', {
        method: 'POST',
        body: formData.value,
      })
      toast.success('Customer created successfully')
    }
    showDialog.value = false
    await fetchCustomers()
  }
  catch (e: any) {
    toast.error(e.data?.statusMessage || 'Failed to save customer')
  }
  finally {
    saving.value = false
  }
}

function confirmDelete(customer: any) {
  deletingCustomer.value = customer
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingCustomer.value) return
  try {
    await $fetch('/api/bigquery/customers', {
      method: 'DELETE',
      body: { customerId: deletingCustomer.value['Customer ID'] },
    })
    toast.success('Customer deleted successfully')
    showDeleteDialog.value = false
    deletingCustomer.value = null
    await fetchCustomers()
  }
  catch (e: any) {
    toast.error(e.data?.statusMessage || 'Failed to delete customer')
  }
}

// ─── Sorting ────────────────────────────────────────────────
const sortBy = ref('fullName')
const sortDir = ref<'asc' | 'desc'>('asc')

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

// ─── Computed ───────────────────────────────────────────────
const filteredCustomers = computed(() => {
  if (!search.value)
    return customers.value
  const q = search.value.toLowerCase()
  return customers.value.filter((c: any) => {
    const fullName = [c['First Name'], c['Last Name']].filter(Boolean).join(' ')
    const secondaryFullName = [c['Secondary Name'], c['Secondary Last Name']].filter(Boolean).join(' ')
    const allValues = [...Object.values(c), fullName, secondaryFullName].filter(Boolean)
    return allValues.some(val => String(val).toLowerCase().includes(q))
  })
})

const COL_FIELD: Record<string, string> = {
  customerId: 'Customer ID',
  fullName: 'First Name',
  secondaryName: 'Secondary Name',
  secondaryLastName: 'Secondary Last Name',
  address: 'Address',
  unit: 'Unit #',
  phone: 'Phone',
  mobile: 'Mobile',
  email: 'Email',
  customerFiles: 'Customer Files',
  update: 'Update',
  createBy: 'Create By',
  timestamp: 'TimeStamp',
  seniorCitizen: 'seniorCitizen',
}

const sortedCustomers = computed(() => {
  const arr = [...filteredCustomers.value]
  const field = COL_FIELD[sortBy.value] || sortBy.value
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

const visibleCustomers = computed(() => sortedCustomers.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < sortedCustomers.value.length)

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

function formatDate(value: any): string {
  if (!value) return '—'
  try {
    const d = new Date(value.value || value)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  catch { return String(value) }
}

function formatPhone(value?: string): string {
  if (!value) return '—'
  // Strip all non-digit characters
  const digits = value.replace(/\D/g, '')
  // Handle 10-digit numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  // Handle 11-digit (1 + 10)
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  // Return original if not standard US format
  return value
}

function getFullName(c: any): string {
  return [c['First Name'], c['Last Name']].filter(Boolean).join(' ') || '—'
}
</script>

<template>
  <div class="w-full h-full flex flex-col min-h-0">
    <!-- Teleport search + actions to header -->
    <Teleport v-if="isMounted" to="#header-toolbar">
      <div class="flex items-center gap-2 w-full justify-end">
        <div class="relative max-w-[220px]">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search customers..." class="pl-8 h-8 text-sm" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums hidden lg:block whitespace-nowrap">
          {{ filteredCustomers.length }} record{{ filteredCustomers.length !== 1 ? 's' : '' }}
        </p>
        <Button variant="ghost" size="sm" class="h-8" @click="fetchCustomers">
          <Icon name="i-lucide-refresh-cw" class="size-3.5" :class="{ 'animate-spin': loading }" />
        </Button>
        <Button size="sm" class="h-8" @click="openCreate">
          <Icon name="i-lucide-plus" class="mr-1 size-3.5" />
          Add Customer
        </Button>
      </div>
    </Teleport>

    <!-- Error State -->
    <Card v-if="error" class="border-destructive p-6">
      <div class="flex flex-col items-center gap-3 text-center">
        <Icon name="i-lucide-alert-triangle" class="size-10 text-destructive" />
        <p class="font-medium text-destructive">{{ error }}</p>
        <Button size="sm" variant="outline" @click="fetchCustomers">
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

    <!-- Data Table with ALL fields -->
    <div v-else class="flex-1 min-h-0 flex flex-col rounded-xl border shadow-sm bg-card overflow-hidden">
      <div class="overflow-auto flex-1 min-h-0">
        <Table>
          <TableHeader class="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead class="min-w-[120px] bg-card cursor-pointer select-none" @click="toggleSort('customerId')">
                <div class="flex items-center gap-1">Customer ID <Icon :name="sortIcon('customerId')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[180px] bg-card cursor-pointer select-none" @click="toggleSort('fullName')">
                <div class="flex items-center gap-1">Full Name <Icon :name="sortIcon('fullName')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[140px] bg-card cursor-pointer select-none" @click="toggleSort('secondaryName')">
                <div class="flex items-center gap-1">Secondary Name <Icon :name="sortIcon('secondaryName')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[160px] bg-card cursor-pointer select-none" @click="toggleSort('secondaryLastName')">
                <div class="flex items-center gap-1">Secondary Last Name <Icon :name="sortIcon('secondaryLastName')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[180px] bg-card cursor-pointer select-none" @click="toggleSort('address')">
                <div class="flex items-center gap-1">Address <Icon :name="sortIcon('address')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[80px] bg-card cursor-pointer select-none" @click="toggleSort('unit')">
                <div class="flex items-center gap-1">Unit # <Icon :name="sortIcon('unit')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[130px] bg-card cursor-pointer select-none" @click="toggleSort('phone')">
                <div class="flex items-center gap-1">Phone <Icon :name="sortIcon('phone')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[130px] bg-card cursor-pointer select-none" @click="toggleSort('mobile')">
                <div class="flex items-center gap-1">Mobile <Icon :name="sortIcon('mobile')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[180px] bg-card cursor-pointer select-none" @click="toggleSort('email')">
                <div class="flex items-center gap-1">Email <Icon :name="sortIcon('email')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[120px] bg-card cursor-pointer select-none" @click="toggleSort('customerFiles')">
                <div class="flex items-center gap-1">Customer Files <Icon :name="sortIcon('customerFiles')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[140px] bg-card cursor-pointer select-none" @click="toggleSort('update')">
                <div class="flex items-center gap-1">Update <Icon :name="sortIcon('update')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[120px] bg-card cursor-pointer select-none" @click="toggleSort('createBy')">
                <div class="flex items-center gap-1">Create By <Icon :name="sortIcon('createBy')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[120px] bg-card cursor-pointer select-none" @click="toggleSort('timestamp')">
                <div class="flex items-center gap-1">TimeStamp <Icon :name="sortIcon('timestamp')" class="size-3 opacity-60" /></div>
              </TableHead>
              <TableHead class="min-w-[100px] bg-card cursor-pointer select-none" @click="toggleSort('seniorCitizen')">
                <div class="flex items-center gap-1">Senior Citizen <Icon :name="sortIcon('seniorCitizen')" class="size-3 opacity-60" /></div>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            <TableRow
              v-for="(customer, idx) in visibleCustomers"
              :key="customer['Customer ID'] || idx"
              class="group"
            >
              <!-- Customer ID -->
              <TableCell>
                <span class="font-mono text-xs">{{ customer['Customer ID'] || '—' }}</span>
              </TableCell>

              <!-- Full Name -->
              <TableCell>
                <div class="flex items-center gap-2">
                  <Avatar class="size-7 border shrink-0">
                    <AvatarFallback class="text-[10px] font-medium bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-blue-700 dark:text-blue-300">
                      {{ getInitials(customer['First Name'], customer['Last Name']) }}
                    </AvatarFallback>
                  </Avatar>
                  <span class="font-medium">{{ getFullName(customer) }}</span>
                </div>
              </TableCell>

              <!-- Secondary Name -->
              <TableCell class="text-muted-foreground">{{ customer['Secondary Name'] || '—' }}</TableCell>

              <!-- Secondary Last Name -->
              <TableCell class="text-muted-foreground">{{ customer['Secondary Last Name'] || '—' }}</TableCell>

              <!-- Address -->
              <TableCell>
                <span class="truncate max-w-[200px] block">{{ customer.Address || '—' }}</span>
              </TableCell>

              <!-- Unit # -->
              <TableCell>{{ customer['Unit #'] || '—' }}</TableCell>

              <!-- Phone -->
              <TableCell>{{ formatPhone(customer.Phone) }}</TableCell>

              <!-- Mobile -->
              <TableCell>{{ formatPhone(customer.Mobile) }}</TableCell>

              <!-- Email -->
              <TableCell>
                <span class="text-muted-foreground">{{ customer.Email || '—' }}</span>
              </TableCell>

              <!-- Customer Files -->
              <TableCell>
                <button
                  v-if="customer['Customer Files']"
                  class="group/folder relative flex items-center justify-center size-8 rounded-lg transition-all duration-200 hover:bg-[#1da462]/10 hover:shadow-sm"
                  title="View files in Google Drive"
                  @click="openFilesModal(customer)"
                >
                  <svg class="size-5 transition-all duration-200 group-hover/folder:scale-110" viewBox="0 0 24 24" fill="none">
                    <path d="M4.5 19.5l3-5.25H21l-3 5.25H4.5z" fill="#1da462" opacity=".7" />
                    <path d="M12 4.5L4.5 17.25l3 2.25L15 7.5 12 4.5z" fill="#1da462" opacity=".85" />
                    <path d="M21 15l-4.5-7.5L13.5 9l4.5 7.5L21 15z" fill="#1da462" />
                  </svg>
                  <span class="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-[#34a853] opacity-0 group-hover/folder:opacity-100 transition-opacity" />
                </button>
                <span v-else class="text-muted-foreground/40 text-xs">—</span>
              </TableCell>

              <!-- Update -->
              <TableCell>
                <span class="text-xs text-muted-foreground">{{ customer.Update || '—' }}</span>
              </TableCell>

              <!-- Create By -->
              <TableCell>
                <span class="text-sm">{{ resolveCreatedBy(customer['Create By']).name }}</span>
              </TableCell>

              <!-- TimeStamp -->
              <TableCell>
                <span class="text-muted-foreground text-sm">{{ formatDate(customer.TimeStamp) }}</span>
              </TableCell>

              <!-- Senior Citizen -->
              <TableCell>
                <Badge
                  v-if="customer.seniorCitizen === 'Y' || customer.seniorCitizen === 'Yes'"
                  variant="outline"
                  class="bg-amber-500/10 text-amber-600 border-amber-500/20"
                >
                  Yes
                </Badge>
                <span v-else class="text-muted-foreground text-sm">{{ customer.seniorCitizen || 'No' }}</span>
              </TableCell>
            </TableRow>

            <!-- Empty State -->
            <TableRow v-if="visibleCustomers.length === 0">
              <TableCell :colspan="14" class="h-32 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="i-lucide-inbox" class="size-8" />
                  <p>No customers found</p>
                  <Button size="sm" variant="outline" @click="openCreate">
                    <Icon name="i-lucide-plus" class="mr-1 size-4" />
                    Add Customer
                  </Button>
                </div>
              </TableCell>
            </TableRow>

            <!-- Infinite scroll sentinel -->
            <tr v-if="hasMore" ref="sentinelRef">
              <td :colspan="14" class="h-10 text-center text-xs text-muted-foreground">
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
          <DialogTitle>{{ editingCustomer ? 'Edit' : 'New' }} Customer</DialogTitle>
          <DialogDescription class="sr-only">
            {{ editingCustomer ? 'Edit' : 'Create' }} a customer record
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="handleSave">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div v-for="field in formFields" :key="field.key" v-show="field.key !== 'customerId' || editingCustomer" class="space-y-1.5">
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
                :disabled="editingCustomer && field.key === 'customerId'"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" @click="showDialog = false">
              Cancel
            </Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-1 size-4 animate-spin" />
              {{ editingCustomer ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation -->
    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{{ getFullName(deletingCustomer || {}) }}</strong>
            ({{ deletingCustomer?.['Customer ID'] }}). This action cannot be undone.
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

    <!-- Google Drive Files Modal -->
    <CustomerFilesModal
      v-if="filesModalCustomer"
      v-model:open="showFilesModal"
      :customer-name="getFullName(filesModalCustomer)"
      :drive-link="filesModalCustomer['Customer Files'] || ''"
    />
  </div>
</template>
