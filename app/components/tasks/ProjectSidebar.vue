<script lang="ts" setup>
import type { Project } from './data/projects'
import { cn } from '~/lib/utils'

const { t } = useLocale()

interface Props {
  projects: Project[]
  selectedProjectId: string | null
  selectedStageId: string | null
  taskCounts: Record<string, number>
  stageCounts: Record<string, number>
  isCollapsed: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'select-project': [projectId: string | null]
  'select-stage': [projectId: string, stageId: string | null]
}>()

const expandedProjects = ref<Set<string>>(new Set())

function toggleProject(projectId: string) {
  if (props.selectedProjectId === projectId && !props.selectedStageId) {
    // Already selected at project level, deselect
    emit('select-project', null)
    expandedProjects.value.delete(projectId)
    return
  }

  // Expand and select the project
  if (expandedProjects.value.has(projectId)) {
    expandedProjects.value.delete(projectId)
  }
  else {
    expandedProjects.value.add(projectId)
  }
  emit('select-project', projectId)
}

function selectStage(projectId: string, stageId: string) {
  if (props.selectedStageId === stageId) {
    // Deselect stage, go back to project level
    emit('select-stage', projectId, '')
  }
  else {
    emit('select-stage', projectId, stageId)
  }
}

function selectAll() {
  emit('select-project', null)
  expandedProjects.value.clear()
}

const totalTasks = computed(() => {
  return Object.values(props.taskCounts).reduce((sum, count) => sum + count, 0)
})
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- All Tasks option -->
    <div class="px-2 pt-2">
      <button
        :class="cn(
          'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          !selectedProjectId && 'bg-accent text-accent-foreground',
        )"
        @click="selectAll"
      >
        <template v-if="!isCollapsed">
          <Icon name="lucide:layers" class="size-4 shrink-0" />
          <span>{{ t('tasks.allProjects') }}</span>
          <Badge variant="secondary" class="ml-auto text-xs tabular-nums h-5 px-1.5">
            {{ totalTasks }}
          </Badge>
        </template>
        <template v-else>
          <Tooltip :delay-duration="0">
            <TooltipTrigger as-child>
              <Icon name="lucide:layers" class="size-4" />
            </TooltipTrigger>
            <TooltipContent side="right">{{ t('tasks.allProjects') }} ({{ totalTasks }})</TooltipContent>
          </Tooltip>
        </template>
      </button>
    </div>

    <Separator class="my-2" />

    <!-- Project List with Expandable Stages -->
    <ScrollArea class="flex-1">
      <div class="px-2 pb-2 space-y-0.5">
        <div v-for="project in projects" :key="project.id">
          <!-- Project Row -->
          <button
            :class="cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors group',
              'hover:bg-accent hover:text-accent-foreground',
              selectedProjectId === project.id && !selectedStageId && 'bg-primary/10 text-primary font-semibold',
              selectedProjectId === project.id && selectedStageId && 'text-primary font-medium',
            )"
            @click="toggleProject(project.id)"
          >
            <template v-if="!isCollapsed">
              <Icon
                :name="expandedProjects.has(project.id) ? 'lucide:chevron-down' : 'lucide:chevron-right'"
                class="size-3.5 shrink-0 text-muted-foreground transition-transform"
              />
              <Icon :name="project.icon" class="size-4 shrink-0" />
              <span class="truncate flex-1 text-left">{{ project.name }}</span>
              <Badge
                :variant="selectedProjectId === project.id ? 'default' : 'secondary'"
                class="text-xs tabular-nums h-5 px-1.5 shrink-0"
              >
                {{ taskCounts[project.id] || 0 }}
              </Badge>
            </template>
            <template v-else>
              <Tooltip :delay-duration="0">
                <TooltipTrigger as-child>
                  <Icon :name="project.icon" class="size-4" />
                </TooltipTrigger>
                <TooltipContent side="right">
                  {{ project.name }} ({{ taskCounts[project.id] || 0 }})
                </TooltipContent>
              </Tooltip>
            </template>
          </button>

          <!-- Stages (expanded) -->
          <div
            v-if="expandedProjects.has(project.id) && !isCollapsed"
            class="ml-4 pl-3 border-l border-border/50 space-y-0.5 mt-0.5 mb-1"
          >
            <button
              v-for="stage in project.stages"
              :key="stage.id"
              :class="cn(
                'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-all',
                'hover:bg-accent hover:text-accent-foreground',
                selectedStageId === stage.id
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground',
              )"
              @click="selectStage(project.id, stage.id)"
            >
              <span
                class="size-2 rounded-full shrink-0"
                :style="{ backgroundColor: stage.color }"
              />
              <span class="truncate flex-1 text-left">{{ stage.name }}</span>
              <span class="text-[10px] tabular-nums opacity-70">
                {{ stageCounts[stage.id] || 0 }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </ScrollArea>
  </div>
</template>
