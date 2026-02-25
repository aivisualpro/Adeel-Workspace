<script setup lang="ts">
import type { Row } from '@tanstack/vue-table'
import type { Task } from '../data/schema'
import { computed, inject, ref } from 'vue'
import { labels } from '../data/data'
import { taskSchema } from '../data/schema'

interface DataTableRowActionsProps {
  row: Row<Task>
}
const props = defineProps<DataTableRowActionsProps>()
const { t } = useLocale()

const task = computed(() => taskSchema.parse(props.row.original))

// Inject shared context from Layout.vue
const ctx = inject<{
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  openTaskDetail: (task: Task) => void
}>('task-table-context')

// Delete confirmation
const showDeleteConfirm = ref(false)

function handleEdit(e: Event) {
  e.stopPropagation()
  ctx?.openTaskDetail(task.value)
}

function handleDelete(e: Event) {
  e.stopPropagation()
  showDeleteConfirm.value = true
}

function confirmDelete() {
  ctx?.deleteTask(task.value.id)
  showDeleteConfirm.value = false
}
</script>

<template>
  <div @click.stop>
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          variant="ghost"
          class="h-8 w-8 flex p-0 data-[state=open]:bg-muted"
        >
          <Icon name="i-radix-icons-dots-horizontal" class="h-4 w-4" />
          <span class="sr-only">{{ t('tasks.actions.openMenu' as any) }}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-[160px]">
        <DropdownMenuItem @click="handleEdit">{{ t('tasks.actions.edit' as any) }}</DropdownMenuItem>
        <DropdownMenuItem>{{ t('tasks.actions.copy' as any) }}</DropdownMenuItem>
        <DropdownMenuItem>{{ t('tasks.actions.favorite' as any) }}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{{ t('tasks.actions.labels' as any) }}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup :value="task.label">
              <DropdownMenuRadioItem v-for="label in labels" :key="label.value" :value="label.value">
                {{ t(label.labelKey as any) }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem class="text-destructive focus:text-destructive" @click="handleDelete">
          {{ t('tasks.actions.delete' as any) }}
          <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <!-- Delete Confirmation Dialog -->
    <AlertDialog :open="showDeleteConfirm" @update:open="showDeleteConfirm = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Task</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>"{{ task.title }}"</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showDeleteConfirm = false">Cancel</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="confirmDelete">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
