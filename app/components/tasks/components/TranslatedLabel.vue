<script setup lang="ts">
const props = defineProps<{
  labelKey?: string
  fallback: string
}>()

const { t } = useLocale()

const display = computed(() => {
  if (props.labelKey) return t(props.labelKey as any)
  return props.fallback
})
</script>

<template>
  <span>{{ display }}</span>
</template>
