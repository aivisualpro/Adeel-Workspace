<script setup lang="ts">
defineProps<{
  teams: { name: string, logo: string, plan: string }[]
}>()
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" as-child>
        <NuxtLink to="/" class="flex items-center gap-2">
          <div class="aspect-square size-8 flex items-center justify-center rounded-lg overflow-hidden">
            <img src="/logo-192.png" alt="SWSCRM V5" class="size-8 object-cover" />
          </div>
          <div class="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span class="truncate font-semibold">SWSCRM V5</span>
          </div>
        </NuxtLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
