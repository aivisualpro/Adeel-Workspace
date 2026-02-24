<script setup lang="ts">
import type { LocaleCode } from '~/composables/useLocale'

const [DefineTemplate, ReuseTemplate] = createReusableTemplate()
const isDesktop = useMediaQuery('(min-width: 768px)')

const isOpen = ref(false)

const { sidebar, updateAppSettings, direction: savedDirection } = useAppSettings()
const { t, setLocale, locale } = useLocale()

const textDirection = useTextDirection()

// Use savedDirection (cookie-backed, SSR-safe) as the source of truth for rendering
const direction = computed(() => savedDirection.value || 'ltr')

// Sync the DOM direction from the cookie on mount
onMounted(() => {
  textDirection.value = direction.value
})

// When direction changes (via button click), sync both cookie and DOM
watch(direction, (dir) => {
  textDirection.value = dir
})

const ltrLanguages = [
  { value: 'en' as LocaleCode, label: 'English', flag: '🇺🇸', default: true },
  { value: 'es' as LocaleCode, label: 'Español', flag: '🇪🇸' },
  { value: 'fr' as LocaleCode, label: 'Français', flag: '🇫🇷' },
]

const rtlLanguages = [
  { value: 'ar' as LocaleCode, label: 'العربية', flag: '🇸🇦' },
  { value: 'he' as LocaleCode, label: 'עברית', flag: '🇮🇱', default: true },
]

const availableLanguages = computed(() =>
  direction.value === 'rtl' ? rtlLanguages : ltrLanguages,
)

function handleChangeDirection(dir: 'ltr' | 'rtl') {
  textDirection.value = dir
  updateAppSettings({
    direction: dir,
    sidebar: { side: dir === 'rtl' ? 'right' : 'left' },
  })
  // Auto-select the default language for the chosen direction
  const langs = dir === 'rtl' ? rtlLanguages : ltrLanguages
  const defaultLang = langs.find(l => l.default) ?? langs[0]!
  setLocale(defaultLang.value)
}

function handleChangeLanguage(lang: LocaleCode) {
  setLocale(lang)
  updateAppSettings({ locale: lang })
}
</script>

<template>
  <DefineTemplate>
    <div class="space-y-3">
      <Badge>{{ t('customizer.layout') }}</Badge>
      <div class="grid gap-6">
        <div class="space-y-1.5">
          <Label>{{ t('customizer.navbarType') }}</Label>
          <div class="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              :class="{ 'border-primary! border-2 bg-primary/10!': sidebar?.variant === 'sidebar' }"
              @click="updateAppSettings({ sidebar: { variant: 'sidebar' } })"
            >
              {{ t('customizer.sidebar') }}
            </Button>
            <Button
              variant="outline"
              :class="{ 'border-primary! border-2 bg-primary/10!': sidebar?.variant === 'floating' }"
              @click="updateAppSettings({ sidebar: { variant: 'floating' } })"
            >
              {{ t('customizer.floating') }}
            </Button>
            <Button
              variant="outline"
              :class="{ 'border-primary! border-2 bg-primary/10!': sidebar?.variant === 'inset' }"
              @click="updateAppSettings({ sidebar: { variant: 'inset' } })"
            >
              {{ t('customizer.inset') }}
            </Button>
          </div>
        </div>
        <div class="space-y-1.5">
          <Label>{{ t('customizer.direction') }}</Label>
          <div class="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              :class="{ 'border-primary! border-2 bg-primary/10!': direction === 'ltr' }"
              @click="handleChangeDirection('ltr')"
            >
              LTR
            </Button>
            <Button
              variant="outline"
              :class="{ 'border-primary! border-2 bg-primary/10!': direction === 'rtl' }"
              @click="handleChangeDirection('rtl')"
            >
              RTL
            </Button>
          </div>
        </div>
        <div class="space-y-1.5">
          <Label>{{ t('customizer.language') }}</Label>
          <div class="grid gap-1.5">
            <Button
              v-for="lang in availableLanguages"
              :key="lang.value"
              variant="outline"
              size="sm"
              class="justify-start gap-2"
              :class="{ 'border-primary! border-2 bg-primary/10!': locale === lang.value }"
              @click="handleChangeLanguage(lang.value)"
            >
              <span class="text-base leading-none">{{ lang.flag }}</span>
              <span>{{ lang.label }}</span>
              <Badge v-if="lang.default" variant="secondary" class="ml-auto text-[10px] h-4 px-1">{{ t('customizer.default') }}</Badge>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </DefineTemplate>

  <Sheet v-if="isDesktop" v-model:open="isOpen">
    <SheetTrigger as-child>
      <Button class="fixed top-1/2 z-50" :class="direction === 'rtl' ? '-left-3 pl-6' : '-right-3 pr-6'">
        <Icon name="i-lucide-settings" class="animate-spin-slow" size="18" />
      </Button>
    </SheetTrigger>
    <SheetContent :side="direction === 'rtl' ? 'left' : 'right'">
      <SheetHeader class="p-6 pb-0">
        <SheetTitle>{{ t('customizer.title') }}</SheetTitle>
        <SheetDescription>{{ t('customizer.description') }}</SheetDescription>
      </SheetHeader>
      <ScrollArea class="h-[calc(100vh-100px)]">
        <div class="flex flex-col gap-6 px-6">
          <div class="space-y-3">
            <Badge>{{ t('customizer.theming') }}</Badge>
            <ThemeCustomize />
          </div>
          <Separator />
          <ReuseTemplate />
        </div>
      </ScrollArea>
    </SheetContent>
  </Sheet>

  <Drawer v-else v-model:open="isOpen">
    <DrawerTrigger as-child>
      <Button class="fixed top-1/2 z-50" :class="direction === 'rtl' ? '-left-3 pl-6' : '-right-3 pr-6'">
        <Icon name="i-lucide-settings" class="animate-spin-slow" size="18" />
      </Button>
    </DrawerTrigger>
    <DrawerContent class="max-h-[97%]">
      <DrawerHeader class="text-center sm:text-center">
        <DrawerTitle>{{ t('customizer.title') }}</DrawerTitle>
        <DrawerDescription>{{ t('customizer.description') }}</DrawerDescription>
      </DrawerHeader>
      <div class="mx-auto max-w-md w-full overflow-auto overflow-y-auto px-4 pb-6 space-y-6">
        <div class="space-y-3">
          <Badge>{{ t('customizer.theming') }}</Badge>
          <ThemeCustomize />
        </div>
        <Separator />
        <ReuseTemplate />
      </div>
    </DrawerContent>
  </Drawer>
</template>
