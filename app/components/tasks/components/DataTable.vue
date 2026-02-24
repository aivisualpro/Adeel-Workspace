<script setup lang="ts">
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/vue-table'

import type { Task } from '../data/schema'
import type { TaskGroupInfo } from '../Layout.vue'
import {
  FlexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import { valueUpdater } from '@/lib/utils'
import DataTableToolbar from './DataTableToolbar.vue'

const { t } = useLocale()

interface DataTableProps {
  columns: ColumnDef<Task, any>[]
  data: Task[]
  taskGroupMap?: Map<string, TaskGroupInfo>
  showGrouping?: boolean
}
const props = withDefaults(defineProps<DataTableProps>(), {
  taskGroupMap: () => new Map(),
  showGrouping: false,
})

const emit = defineEmits<{
  reorder: [groupKey: string, fromIdx: number, toIdx: number]
  addTask: []
}>()

const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const columnVisibility = ref<VisibilityState>({})
const rowSelection = ref({})

const table = useVueTable({
  get data() { return props.data },
  get columns() { return props.columns },
  state: {
    get sorting() { return sorting.value },
    get columnFilters() { return columnFilters.value },
    get columnVisibility() { return columnVisibility.value },
    get rowSelection() { return rowSelection.value },
  },
  enableRowSelection: false,
  onSortingChange: updaterOrValue => valueUpdater(updaterOrValue, sorting),
  onColumnFiltersChange: updaterOrValue => valueUpdater(updaterOrValue, columnFilters),
  onColumnVisibilityChange: updaterOrValue => valueUpdater(updaterOrValue, columnVisibility),
  onRowSelectionChange: updaterOrValue => valueUpdater(updaterOrValue, rowSelection),
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFacetedRowModel: getFacetedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
})

// Infinite scroll
const CHUNK_SIZE = 30
const visibleCount = ref(CHUNK_SIZE)

watch(() => table.getFilteredRowModel().rows.length, () => {
  visibleCount.value = CHUNK_SIZE
})

const visibleRows = computed(() => {
  return table.getRowModel().rows.slice(0, visibleCount.value)
})

const hasMore = computed(() => {
  return visibleCount.value < table.getRowModel().rows.length
})

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

// Precompute display rows with inline 3-level group headers and per-group serial numbers
interface GroupHeaderRow {
  type: 'group'
  key: string
  info: TaskGroupInfo
}

interface TaskRow {
  type: 'task'
  row: (typeof visibleRows.value)[number]
  sno: number
  groupKey: string
  indexInGroup: number
  groupSize: number
}

type DisplayRow = GroupHeaderRow | TaskRow

const displayRows = computed<DisplayRow[]>(() => {
  const rows: DisplayRow[] = []
  let lastGroupKey = ''
  let snoCounter = 0

  // First pass: build group sizes
  const groupSizes = new Map<string, number>()
  for (const row of visibleRows.value) {
    const taskId = (row.original as Task).id
    const info = props.taskGroupMap.get(taskId)
    if (info) {
      const groupKey = `${info.projectId}:${info.stageId}:${info.label}`
      groupSizes.set(groupKey, (groupSizes.get(groupKey) || 0) + 1)
    }
  }

  // Second pass: build display rows
  const groupIndexCounters = new Map<string, number>()

  for (const row of visibleRows.value) {
    const taskId = (row.original as Task).id
    const info = props.taskGroupMap.get(taskId)

    let groupKey = 'ungrouped'

    if (props.showGrouping && info) {
      groupKey = `${info.projectId}:${info.stageId}:${info.label}`
      if (groupKey !== lastGroupKey) {
        rows.push({ type: 'group', key: groupKey, info })
        lastGroupKey = groupKey
        snoCounter = 0
      }
    }

    snoCounter++
    const indexInGroup = groupIndexCounters.get(groupKey) || 0
    groupIndexCounters.set(groupKey, indexInGroup + 1)

    rows.push({
      type: 'task',
      row,
      sno: snoCounter,
      groupKey,
      indexInGroup,
      groupSize: groupSizes.get(groupKey) || 1,
    })
  }

  return rows
})

// Drag state
const dragState = ref<{ groupKey: string, fromIdx: number } | null>(null)
const droppedTaskId = ref<string | null>(null)

function onDragStart(groupKey: string, indexInGroup: number, event: DragEvent) {
  dragState.value = { groupKey, fromIdx: indexInGroup }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', '')
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function triggerDustEffect(groupKey: string, toIdx: number) {
  // Find the task at the target position to mark it
  const targetRows = displayRows.value.filter(r => r.type === 'task' && (r as TaskRow).groupKey === groupKey)
  const targetRow = targetRows[toIdx] as TaskRow | undefined
  if (targetRow) {
    droppedTaskId.value = (targetRow.row.original as Task).id
    setTimeout(() => {
      droppedTaskId.value = null
    }, 700)
  }
}

function onDrop(groupKey: string, toIdx: number) {
  if (!dragState.value || dragState.value.groupKey !== groupKey) {
    dragState.value = null
    return
  }
  const fromIdx = dragState.value.fromIdx
  if (fromIdx !== toIdx) {
    emit('reorder', groupKey, fromIdx, toIdx)
    // Trigger dust on next tick after reorder
    nextTick(() => triggerDustEffect(groupKey, toIdx))
  }
  dragState.value = null
}

function onDragEnd() {
  dragState.value = null
}

// Move up/down within group
function moveTask(dRow: TaskRow, direction: 'up' | 'down') {
  const toIdx = direction === 'up' ? dRow.indexInGroup - 1 : dRow.indexInGroup + 1
  if (toIdx < 0 || toIdx >= dRow.groupSize) return
  emit('reorder', dRow.groupKey, dRow.indexInGroup, toIdx)
  nextTick(() => triggerDustEffect(dRow.groupKey, toIdx))
}

// Check if teleport target is available (client-side only)
const isMounted = ref(false)
onMounted(() => {
  isMounted.value = true
})
</script>

<template>
  <!-- Teleport toolbar to header -->
  <Teleport v-if="isMounted" to="#header-toolbar">
    <DataTableToolbar :table="table" @add-task="emit('addTask')" />
  </Teleport>

  <div>
    <div class="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <TableHead v-for="header in headerGroup.headers" :key="header.id">
              <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="table.getRowModel().rows?.length">
            <template v-for="(dRow, idx) in displayRows" :key="idx">
              <!-- 3-Level Group Header: Project / Stage / Label -->
              <tr v-if="dRow.type === 'group'" class="bg-muted/50 border-t first:border-t-0">
                <td :colspan="columns.length" class="px-4 py-2">
                  <div class="flex items-center gap-1.5 text-xs">
                    <Icon :name="dRow.info.projectIcon" class="size-3.5 text-primary shrink-0" />
                    <span class="font-semibold">{{ dRow.info.projectName }}</span>
                    <span class="text-muted-foreground">/</span>
                    <span
                      class="size-2 rounded-full shrink-0"
                      :style="{ backgroundColor: dRow.info.stageColor }"
                    />
                    <span class="font-medium text-muted-foreground">{{ dRow.info.stageName }}</span>
                    <span class="text-muted-foreground">/</span>
                    <span class="font-medium">{{ t(dRow.info.labelKey as any) }}</span>
                  </div>
                </td>
              </tr>
              <!-- Task Row with drag support -->
              <TableRow
                v-else
                :draggable="true"
                class="group/row cursor-grab active:cursor-grabbing"
                :class="{ 'task-landed': droppedTaskId === (dRow.row.original as Task).id }"
                @dragstart="onDragStart(dRow.groupKey, dRow.indexInGroup, $event)"
                @dragover="onDragOver"
                @drop="onDrop(dRow.groupKey, dRow.indexInGroup)"
                @dragend="onDragEnd"
              >

                <TableCell v-for="(cell, cIdx) in dRow.row.getVisibleCells()" :key="cell.id">
                  <!-- Override S.No column with per-group serial number -->
                  <template v-if="cell.column.id === 'sno'">
                    <div class="flex items-center gap-1">
                      <!-- Move buttons -->
                      <div class="flex flex-col opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button
                          class="text-muted-foreground hover:text-foreground p-0 h-3 leading-none disabled:opacity-30"
                          :disabled="dRow.indexInGroup === 0"
                          @click="moveTask(dRow as TaskRow, 'up')"
                        >
                          <Icon name="lucide:chevron-up" class="size-3" />
                        </button>
                        <button
                          class="text-muted-foreground hover:text-foreground p-0 h-3 leading-none disabled:opacity-30"
                          :disabled="dRow.indexInGroup >= dRow.groupSize - 1"
                          @click="moveTask(dRow as TaskRow, 'down')"
                        >
                          <Icon name="lucide:chevron-down" class="size-3" />
                        </button>
                      </div>
                      <span class="w-6 text-muted-foreground tabular-nums text-center text-xs">{{ dRow.sno }}</span>
                    </div>
                  </template>
                  <template v-else>
                    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                  </template>
                </TableCell>
              </TableRow>
            </template>

            <!-- Sentinel for infinite scroll -->
            <tr v-if="hasMore" ref="sentinelRef">
              <td :colspan="columns.length" class="h-10 text-center text-xs text-muted-foreground">
                {{ t('tasks.loadingMore' as any) }}
              </td>
            </tr>
          </template>

          <TableRow v-else>
            <TableCell
              :colspan="columns.length"
              class="h-24 text-center"
            >
              {{ t('tasks.noResults' as any) }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<style scoped>
/* === Premium Drop Animation === */

/* 1. Elastic spring settle — row slides in with overshoot */
.task-landed {
  animation:
    elastic-settle 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both,
    glow-fade 0.8s ease-out both;
  position: relative;
  overflow: hidden;
  z-index: 1;
}

@keyframes elastic-settle {
  0% {
    transform: translateY(-6px) scaleY(0.97);
    opacity: 0.6;
  }
  40% {
    transform: translateY(2px) scaleY(1.005);
    opacity: 1;
  }
  70% {
    transform: translateY(-1px) scaleY(1);
  }
  100% {
    transform: translateY(0) scaleY(1);
    opacity: 1;
  }
}

/* 2. Soft glow highlight that fades */
@keyframes glow-fade {
  0% {
    background-color: hsl(var(--primary) / 0.08);
    box-shadow:
      inset 0 1px 0 hsl(var(--primary) / 0.15),
      inset 0 -1px 0 hsl(var(--primary) / 0.1);
  }
  100% {
    background-color: transparent;
    box-shadow: none;
  }
}

/* 3. Shimmer sweep — glossy light streak across the row */
.task-landed::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 0%,
    transparent 35%,
    hsl(var(--primary) / 0.08) 42%,
    hsl(var(--primary) / 0.15) 50%,
    hsl(var(--primary) / 0.08) 58%,
    transparent 65%,
    transparent 100%
  );
  background-size: 250% 100%;
  animation: shimmer-sweep 0.7s 0.1s ease-out both;
  pointer-events: none;
  z-index: 2;
}

@keyframes shimmer-sweep {
  0% {
    background-position: 150% 0;
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  100% {
    background-position: -50% 0;
    opacity: 0;
  }
}
</style>
