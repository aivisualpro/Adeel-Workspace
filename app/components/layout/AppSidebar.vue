<script setup lang="ts">
import type { NavGroup, NavLink, NavSectionTitle } from '~/types/nav'
import { navMenu, navMenuBottom } from '~/constants/menus'

function resolveNavItemComponent(item: NavLink | NavGroup | NavSectionTitle): any {
  if ('children' in item)
    return resolveComponent('LayoutSidebarNavGroup')

  return resolveComponent('LayoutSidebarNavLink')
}

const { t } = useLocale()

function getHeading(nav: { heading: string, headingKey?: string }) {
  return nav.headingKey ? t(nav.headingKey as any) : nav.heading
}

const user: {
  name: string
  email: string
  avatar: string
} = {
  name: 'Adeel Jabbar',
  email: 'adeel@aivisualpro.com',
  avatar: '/avatars/adeel.png',
}

const { sidebar } = useAppSettings()
</script>

<template>
  <Sidebar :collapsible="sidebar?.collapsible" :side="sidebar?.side" :variant="sidebar?.variant">
    <SidebarHeader class="px-4 py-3">
      <div class="flex items-center gap-2.5">
        <div class="aspect-square size-8 flex items-center justify-center rounded-lg overflow-hidden">
          <img src="/logo-192.png" alt="Adeel Workspace" class="size-8 object-cover rounded-lg" />
        </div>
        <div class="grid text-left text-sm leading-tight">
          <span class="truncate font-semibold text-sidebar-foreground">Adeel Workspace</span>
          <span class="truncate text-xs text-muted-foreground">Enterprise</span>
        </div>
      </div>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup v-for="(nav, indexGroup) in navMenu" :key="indexGroup">
        <SidebarGroupLabel v-if="nav.heading">
          {{ getHeading(nav) }}
        </SidebarGroupLabel>
        <component :is="resolveNavItemComponent(item)" v-for="(item, index) in nav.items" :key="index" :item="item" />
      </SidebarGroup>
      <SidebarGroup class="mt-auto">
        <component :is="resolveNavItemComponent(item)" v-for="(item, index) in navMenuBottom" :key="index" :item="item" size="sm" />
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <LayoutSidebarNavFooter :user="user" />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
