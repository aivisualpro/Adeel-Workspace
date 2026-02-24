<script setup lang="ts">
import type { Row } from '@tanstack/vue-table'
import type { Task } from '../data/schema'
import { computed } from 'vue'
import { labels } from '../data/data'
import { taskSchema } from '../data/schema'

interface DataTableRowActionsProps {
  row: Row<Task>
}
const props = defineProps<DataTableRowActionsProps>()
const { t } = useLocale()

const task = computed(() => taskSchema.parse(props.row.original))
</script>

<template>
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
      <DropdownMenuItem>{{ t('tasks.actions.edit' as any) }}</DropdownMenuItem>
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
      <DropdownMenuItem>
        {{ t('tasks.actions.delete' as any) }}
        <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
