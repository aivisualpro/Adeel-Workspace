<script setup lang="ts">
import { cn } from '@/lib/utils'

const route = useRoute()

const tabs = [
  { title: 'All Projects', href: '/projects/all-projects', icon: 'i-lucide-folder-kanban' },
  { title: 'All Finance', href: '/projects/all-finance', icon: 'i-lucide-wallet' },
  { title: 'My Open Projects', href: '/projects/my-open', icon: 'i-lucide-folder-open' },
  { title: 'My Closed Projects', href: '/projects/my-closed', icon: 'i-lucide-folder-check' },
  { title: 'My Cancelled Projects', href: '/projects/my-cancelled', icon: 'i-lucide-folder-x' },
  { title: 'Permit Dashboard', href: '/projects/permit-dashboard', icon: 'i-lucide-file-badge' },
  { title: 'Projects Dashboard', href: '/projects/projects-dashboard', icon: 'i-lucide-layout-dashboard' },
  { title: 'RTF Today', href: '/projects/rtf-today', icon: 'i-lucide-calendar-clock' },
  { title: 'Engineers Dashboard', href: '/projects/engineers-dashboard', icon: 'i-lucide-hard-hat' },
  { title: 'PTO & Meterspot Dashboard', href: '/projects/pto-meterspot', icon: 'i-lucide-gauge' },
]
</script>

<template>
  <div class="w-full h-full flex min-h-0">
    <!-- Sub-sidebar -->
    <div class="w-[220px] shrink-0 border-r bg-card/50 flex flex-col min-h-0 overflow-y-auto">
      <nav class="flex flex-col gap-0.5 p-2">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.href"
          :to="tab.href"
          :class="cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
            route.path === tab.href
              ? 'bg-primary/10 text-primary font-medium shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )"
        >
          <Icon :name="tab.icon" class="size-4 shrink-0" />
          <span class="truncate">{{ tab.title }}</span>
        </NuxtLink>
      </nav>
    </div>

    <!-- Content area -->
    <div class="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
      <slot />
    </div>
  </div>
</template>
