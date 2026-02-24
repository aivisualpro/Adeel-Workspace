import type { TranslationKey } from '~/composables/useLocale'

interface PageHeaderState {
  title: string
  titleKey?: TranslationKey
  description?: string
  descriptionKey?: TranslationKey
  icon?: string
}

interface SetHeaderOpts {
  title?: string
  titleKey?: TranslationKey
  description?: string
  descriptionKey?: TranslationKey
  icon?: string
}

const headerState = reactive<PageHeaderState>({
  title: '',
  titleKey: undefined,
  description: '',
  descriptionKey: undefined,
  icon: '',
})

export function usePageHeader() {
  function setHeader(opts: SetHeaderOpts) {
    headerState.title = opts.title || ''
    headerState.titleKey = opts.titleKey
    headerState.description = opts.description || ''
    headerState.descriptionKey = opts.descriptionKey
    headerState.icon = opts.icon || ''
  }

  function clearHeader() {
    headerState.title = ''
    headerState.titleKey = undefined
    headerState.description = ''
    headerState.descriptionKey = undefined
    headerState.icon = ''
  }

  return {
    headerState: readonly(headerState),
    setHeader,
    clearHeader,
  }
}
