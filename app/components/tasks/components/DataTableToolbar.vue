<script setup lang="ts">
import type { Table } from '@tanstack/vue-table'
import type { Task } from '../data/schema'
import { computed } from 'vue'
import { priorities, statuses } from '../data/data'
import DataTableFacetedFilter from './DataTableFacetedFilter.vue'
import DataTableViewOptions from './DataTableViewOptions.vue'

interface DataTableToolbarProps {
  table: Table<Task>
}

const props = defineProps<DataTableToolbarProps>()
const emit = defineEmits<{
  addTask: []
}>()

const { t } = useLocale()
const isFiltered = computed(() => props.table.getState().columnFilters.length > 0)
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="flex flex-1 items-center gap-2">
      <Input
        :placeholder="t('tasks.filterPlaceholder' as any)"
        :model-value="(table.getColumn('title')?.getFilterValue() as string) ?? ''"
        class="h-8 w-[150px] lg:w-[250px]"
        @input="table.getColumn('title')?.setFilterValue($event.target.value)"
      />
      <DataTableFacetedFilter
        v-if="table.getColumn('status')"
        :column="table.getColumn('status')"
        title-key="tasks.col.status"
        :options="statuses"
      />
      <DataTableFacetedFilter
        v-if="table.getColumn('priority')"
        :column="table.getColumn('priority')"
        title-key="tasks.col.priority"
        :options="priorities"
      />

      <Button
        v-if="isFiltered"
        variant="ghost"
        class="h-8 px-2 lg:px-3"
        @click="table.resetColumnFilters()"
      >
        {{ t('tasks.reset' as any) }}
        <Icon name="i-radix-icons-cross-2" class="ml-2 h-4 w-4" />
      </Button>
    </div>

    <DataTableViewOptions :table="table" />

    <Button
      size="sm"
      class="h-8"
      @click="emit('addTask')"
    >
      <Icon name="lucide:plus" class="size-4 mr-1" />
      {{ t('tasks.addTask' as any) }}
    </Button>
  </div>
</template>
