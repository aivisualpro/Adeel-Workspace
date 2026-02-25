<script setup lang="ts">
import type { NavMenu } from '~/types/nav'
import { navMenu } from '@/constants/menus'

const { metaSymbol } = useShortcuts()
const { t } = useLocale()

const openCommand = ref(false)
const router = useRouter()

defineShortcuts({
  Meta_K: () => openCommand.value = true,
})

// Flatten all nav sections with navigable items only
const navSections = computed(() =>
  navMenu
    .map((section: NavMenu) => ({
      heading: section.headingKey ? t(section.headingKey as any) : section.heading,
      items: section.items
        .filter((item: any) => item.link)
        .map((item: any) => ({
          title: item.titleKey ? t(item.titleKey as any) : item.title,
          icon: item.icon,
          link: item.link,
        })),
    }))
    .filter(section => section.items.length > 0),
)

function handleSelectLink(link: string) {
  router.push(link)
  openCommand.value = false
}
</script>

<template>
  <SidebarMenuButton as-child :tooltip="t('common.search')">
    <Button variant="outline" size="sm" class="text-xs" @click="openCommand = !openCommand">
      <Icon name="i-lucide-search" />
      <span class="font-normal group-data-[collapsible=icon]:hidden">{{ t('common.search') }}</span>
      <div class="ml-auto flex items-center space-x-0.5 group-data-[collapsible=icon]:hidden">
        <Kbd>{{ metaSymbol }}</Kbd>
        <Kbd>K</Kbd>
      </div>
    </Button>
  </SidebarMenuButton>

  <CommandDialog v-model:open="openCommand">
    <CommandInput :placeholder="t('common.search') + ' menu...'" />
    <CommandList>
      <CommandEmpty>{{ t('common.noResults') }}</CommandEmpty>
      <template v-for="section in navSections" :key="section.heading">
        <CommandGroup :heading="section.heading">
          <CommandItem
            v-for="item in section.items"
            :key="item.link"
            :value="`${section.heading} ${item.title}`"
            class="gap-2"
            @select="handleSelectLink(item.link)"
          >
            <Icon :name="item.icon" class="size-4 text-muted-foreground shrink-0" />
            {{ item.title }}
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
      </template>
    </CommandList>
  </CommandDialog>
</template>
