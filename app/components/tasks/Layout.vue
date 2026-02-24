<script lang="ts" setup>
import type { Task } from './data/schema'
import type { ColumnDef } from '@tanstack/vue-table'
import { useMediaQuery } from '@vueuse/core'
import { projects, taskProjectMap } from './data/projects'
import { labels, statuses, priorities } from './data/data'
import { cn } from '~/lib/utils'
import DataTable from './components/DataTable.vue'

const { t } = useLocale()
const { setHeader } = usePageHeader()

interface Props {
  data: Task[]
  columns: ColumnDef<Task, any>[]
  defaultLayout?: number[]
  defaultCollapsed?: boolean
  navCollapsedSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  defaultCollapsed: false,
  defaultLayout: () => [20, 80],
  navCollapsedSize: 4,
})

const isCollapsed = ref(props.defaultCollapsed)
const selectedProjectId = ref<string | null>(null)
const selectedStageId = ref<string | null>(null)

// Compute task counts per project
const taskCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const project of projects) {
    counts[project.id] = 0
  }
  for (const task of props.data) {
    const mapping = taskProjectMap[task.id]
    if (mapping) {
      counts[mapping.projectId] = (counts[mapping.projectId] || 0) + 1
    }
  }
  return counts
})

// Compute task counts per stage
const stageCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const task of props.data) {
    const mapping = taskProjectMap[task.id]
    if (mapping) {
      counts[mapping.stageId] = (counts[mapping.stageId] || 0) + 1
    }
  }
  return counts
})

// Use a reactive copy of the data so new tasks are reflected
const localData = ref<Task[]>([...props.data])

watch(() => props.data, (d) => {
  localData.value = [...d]
}, { deep: true })

// Filter tasks based on selected project/stage
const filteredData = computed(() => {
  if (!selectedProjectId.value) {
    return localData.value
  }

  return localData.value.filter((task) => {
    const mapping = taskProjectMap[task.id]
    if (!mapping)
      return false

    if (selectedStageId.value) {
      return mapping.projectId === selectedProjectId.value && mapping.stageId === selectedStageId.value
    }

    return mapping.projectId === selectedProjectId.value
  })
})

// Build a project index for fast lookups
const projectIndex = computed(() => {
  const idx = new Map<string, { name: string, icon: string, stageMap: Map<string, { name: string, color: string }> }>()
  for (const p of projects) {
    const stageMap = new Map<string, { name: string, color: string }>()
    for (const s of p.stages) {
      stageMap.set(s.id, { name: s.name, color: s.color })
    }
    idx.set(p.id, { name: p.name, icon: p.icon, stageMap })
  }
  return idx
})

// Label order for consistent sorting
const labelOrder = new Map(labels.map((l, i) => [l.value, i]))

// Sort tasks by project → stage → label for grouping
function sortTasks(data: Task[]): Task[] {
  const sorted = [...data]
  const projOrder = new Map<string, number>()
  projects.forEach((p, i) => projOrder.set(p.id, i))

  sorted.sort((a, b) => {
    const ma = taskProjectMap[a.id]
    const mb = taskProjectMap[b.id]
    if (!ma && !mb) return 0
    if (!ma) return 1
    if (!mb) return -1

    // Sort by project
    const pOrdA = projOrder.get(ma.projectId) ?? 999
    const pOrdB = projOrder.get(mb.projectId) ?? 999
    if (pOrdA !== pOrdB) return pOrdA - pOrdB

    // Sort by stage
    const projA = projectIndex.value.get(ma.projectId)
    const projB = projectIndex.value.get(mb.projectId)
    if (projA && projB) {
      const stagesA = [...projA.stageMap.keys()]
      const stagesB = [...projB.stageMap.keys()]
      const sOrdA = stagesA.indexOf(ma.stageId)
      const sOrdB = stagesB.indexOf(mb.stageId)
      if (sOrdA !== sOrdB) return sOrdA - sOrdB
    }

    // Sort by label (bug, feature, documentation)
    const lOrdA = labelOrder.get(a.label) ?? 999
    const lOrdB = labelOrder.get(b.label) ?? 999
    return lOrdA - lOrdB
  })

  return sorted
}

const sortedData = ref<Task[]>([])

watch(filteredData, (data) => {
  sortedData.value = sortTasks(data)
}, { immediate: true })

// Reorder tasks within a group
function onReorder(groupKey: string, fromIdx: number, toIdx: number) {
  const data = [...sortedData.value]
  // Find tasks in this group
  const groupTasks: number[] = []
  for (let i = 0; i < data.length; i++) {
    const task = data[i]!
    const mapping = taskProjectMap[task.id]
    if (!mapping) continue
    const key = `${mapping.projectId}:${mapping.stageId}:${task.label}`
    if (key === groupKey) {
      groupTasks.push(i)
    }
  }

  if (fromIdx >= groupTasks.length || toIdx >= groupTasks.length) return

  const fromDataIdx = groupTasks[fromIdx]!
  const toDataIdx = groupTasks[toIdx]!

  // Swap
  const temp = data[fromDataIdx]
  data[fromDataIdx] = data[toDataIdx]!
  data[toDataIdx] = temp!

  sortedData.value = data
}

// Group info including label as 3rd level
export interface TaskGroupInfo {
  projectId: string
  projectName: string
  projectIcon: string
  stageId: string
  stageName: string
  stageColor: string
  label: string
  labelDisplay: string
  labelKey: string
}

const taskGroupMap = computed(() => {
  const map = new Map<string, TaskGroupInfo>()
  for (const task of sortedData.value) {
    const mapping = taskProjectMap[task.id]
    if (!mapping) continue
    const proj = projectIndex.value.get(mapping.projectId)
    if (!proj) continue
    const stage = proj.stageMap.get(mapping.stageId)
    if (!stage) continue
    const labelDef = labels.find(l => l.value === task.label)
    map.set(task.id, {
      projectId: mapping.projectId,
      projectName: proj.name,
      projectIcon: proj.icon,
      stageId: mapping.stageId,
      stageName: stage.name,
      stageColor: stage.color,
      label: task.label,
      labelDisplay: labelDef?.label || task.label,
      labelKey: labelDef?.labelKey || `tasks.label.${task.label}`,
    })
  }
  return map
})

// Whether grouping should be shown
const showGrouping = computed(() => !selectedStageId.value)

// Build breadcrumb description for main header
const headerDescription = computed(() => {
  if (!selectedProjectId.value)
    return ''

  const project = projects.find(p => p.id === selectedProjectId.value)
  if (!project)
    return ''

  if (selectedStageId.value) {
    const stage = project.stages.find(s => s.id === selectedStageId.value)
    return stage ? `${project.name} / ${stage.name}` : project.name
  }

  return project.name
})

// Reactively update the main header when selection changes
watch(headerDescription, (desc) => {
  setHeader({
    titleKey: 'tasks.title',
    icon: 'i-lucide-calendar-check-2',
    description: desc || '',
  })
}, { immediate: true })

function onSelectProject(projectId: string | null) {
  selectedProjectId.value = projectId
  selectedStageId.value = null
}

function onSelectStage(projectId: string, stageId: string | null) {
  selectedProjectId.value = projectId
  selectedStageId.value = stageId || null
}

function onCollapse() {
  isCollapsed.value = true
}

function onExpand() {
  isCollapsed.value = false
}

const defaultCollapse = useMediaQuery('(max-width: 768px)')

watch(() => defaultCollapse.value, () => {
  isCollapsed.value = defaultCollapse.value
})

// Add Task Dialog
const showAddTaskDialog = ref(false)
const newTaskTitle = ref('')
const newTaskStatus = ref('todo')
const newTaskPriority = ref('medium')
const newTaskLabel = ref('feature')


function openAddTaskDialog() {
  newTaskTitle.value = ''
  newTaskStatus.value = 'todo'
  newTaskPriority.value = 'medium'
  newTaskLabel.value = 'feature'
  showAddTaskDialog.value = true
}

function createTask() {
  if (!newTaskTitle.value.trim()) return
  const id = `TASK-${Math.floor(1000 + Math.random() * 9000)}`
  const task: Task = {
    id,
    title: newTaskTitle.value.trim(),
    status: newTaskStatus.value,
    priority: newTaskPriority.value,
    label: newTaskLabel.value,
  }
  localData.value = [task, ...localData.value]
  showAddTaskDialog.value = false
}
</script>

<template>
  <TooltipProvider :delay-duration="0">
    <ResizablePanelGroup
      id="tasks-panel-group"
      direction="horizontal"
      class="h-full max-h-[calc(100dvh-54px-3rem)] items-stretch"
    >
      <!-- Sidebar Panel -->
      <ResizablePanel
        id="tasks-sidebar-panel"
        :default-size="defaultLayout[0]"
        :collapsed-size="navCollapsedSize"
        collapsible
        :min-size="15"
        :max-size="25"
        :class="cn(isCollapsed && 'min-w-[50px] transition-all duration-300 ease-in-out')"
        @expand="onExpand"
        @collapse="onCollapse"
      >
        <TasksProjectSidebar
          :projects="projects"
          :selected-project-id="selectedProjectId"
          :selected-stage-id="selectedStageId"
          :task-counts="taskCounts"
          :stage-counts="stageCounts"
          :is-collapsed="isCollapsed"
          @select-project="onSelectProject"
          @select-stage="onSelectStage"
        />
      </ResizablePanel>

      <ResizableHandle id="tasks-resize-handle" with-handle />

      <!-- Main Content Panel -->
      <ResizablePanel id="tasks-content-panel" :default-size="defaultLayout[1]" :min-size="50">
        <div class="flex flex-col h-full overflow-auto p-4">
          <DataTable
            :data="sortedData"
            :columns="columns"
            :task-group-map="taskGroupMap"
            :show-grouping="showGrouping"
            @reorder="onReorder"
            @add-task="openAddTaskDialog"
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </TooltipProvider>

  <!-- Add Task Dialog -->
  <Dialog v-model:open="showAddTaskDialog">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ t('tasks.addTask.title' as any) }}</DialogTitle>
        <DialogDescription>{{ t('tasks.addTask.desc' as any) }}</DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="task-title">{{ t('tasks.addTask.titleLabel' as any) }}</Label>
          <Input
            id="task-title"
            v-model="newTaskTitle"
            :placeholder="t('tasks.addTask.titlePlaceholder' as any)"
          />
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div class="grid gap-2">
            <Label>{{ t('tasks.addTask.statusLabel' as any) }}</Label>
            <Select v-model="newTaskStatus">
              <SelectTrigger class="h-9">
                <SelectValue :placeholder="t('tasks.addTask.selectStatus' as any)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="s in statuses" :key="s.value" :value="s.value">
                  {{ t(s.labelKey as any) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label>{{ t('tasks.addTask.priorityLabel' as any) }}</Label>
            <Select v-model="newTaskPriority">
              <SelectTrigger class="h-9">
                <SelectValue :placeholder="t('tasks.addTask.selectPriority' as any)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in priorities" :key="p.value" :value="p.value">
                  {{ t(p.labelKey as any) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label>{{ t('tasks.addTask.labelLabel' as any) }}</Label>
            <Select v-model="newTaskLabel">
              <SelectTrigger class="h-9">
                <SelectValue :placeholder="t('tasks.addTask.selectLabel' as any)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="l in labels" :key="l.value" :value="l.value">
                  {{ t(l.labelKey as any) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showAddTaskDialog = false">{{ t('common.cancel' as any) }}</Button>
        <Button :disabled="!newTaskTitle.trim()" @click="createTask">{{ t('tasks.addTask.create' as any) }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
