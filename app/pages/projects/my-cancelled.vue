<script setup lang="ts">
const { setHeader } = usePageHeader()
setHeader({ title: 'My Cancelled', icon: 'i-lucide-folder-kanban' })
</script>

<template>
  <ProjectsLayout>
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="size-16 rounded-2xl bg-muted/60 flex items-center justify-center">
        <Icon name="i-lucide-construction" class="size-8 text-muted-foreground/40" />
      </div>
      <div>
        <h3 class="text-lg font-semibold">My Cancelled</h3>
        <p class="text-sm text-muted-foreground mt-1">This view is coming soon.</p>
      </div>
    </div>
  </ProjectsLayout>
</template>
