<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { TrendingDown, TrendingUp, TrendingUpIcon } from 'lucide-vue-next'

const { t } = useLocale()

const dataCard = ref({
  totalRevenue: 0,
  newCustomers: 0,
  activeAccount: 0,
  growthRate: 0,
})

onMounted(() => {
  dataCard.value = {
    totalRevenue: 1250.44,
    newCustomers: 1234,
    activeAccount: 45678,
    growthRate: 4.5,
  }
})

const timeRange = ref('30d')

const isDesktop = useMediaQuery('(min-width: 768px)')
watch(isDesktop, () => {
  if (isDesktop.value) {
    timeRange.value = '30d'
  }
  else {
    timeRange.value = '7d'
  }
}, { immediate: true })

const { setHeader } = usePageHeader()
setHeader({ titleKey: 'dashboard.title', icon: 'i-lucide-layout-dashboard', descriptionKey: 'dashboard.description' })
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex items-center justify-end gap-2">
      <BaseDateRangePicker />
      <Button>{{ t('dashboard.download') }}</Button>
    </div>
    <main class="@container/main flex flex-1 flex-col gap-4 md:gap-8">
      <div class="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card class="@container/card">
          <CardHeader>
            <CardDescription>{{ t('dashboard.totalRevenue') }}</CardDescription>
            <CardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              <NumberFlow
                :value="dataCard.totalRevenue"
                :format="{ style: 'currency', currency: 'USD', trailingZeroDisplay: 'stripIfInteger' }"
              />
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUpIcon />
                +12.5%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter class="flex-col items-start gap-1.5 text-sm">
            <div class="line-clamp-1 flex gap-2 font-medium">
              {{ t('dashboard.trendingUp') }} <TrendingUp class="size-4" />
            </div>
            <div class="text-muted-foreground">
              {{ t('dashboard.visitorsLast6Months') }}
            </div>
          </CardFooter>
        </Card>
        <Card class="@container/card">
          <CardHeader>
            <CardDescription>{{ t('dashboard.newCustomers') }}</CardDescription>
            <CardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              <NumberFlow
                :value="dataCard.newCustomers"
              />
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingDown />
                -20%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter class="flex-col items-start gap-1.5 text-sm">
            <div class="line-clamp-1 flex gap-2 font-medium">
              {{ t('dashboard.down20') }} <TrendingDown class="size-4" />
            </div>
            <div class="text-muted-foreground">
              {{ t('dashboard.acquisitionAttention') }}
            </div>
          </CardFooter>
        </Card>
        <Card class="@container/card">
          <CardHeader>
            <CardDescription>{{ t('dashboard.activeAccounts') }}</CardDescription>
            <CardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              <NumberFlow
                :value="dataCard.activeAccount"
              />
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp />
                +12.5%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter class="flex-col items-start gap-1.5 text-sm">
            <div class="line-clamp-1 flex gap-2 font-medium">
              {{ t('dashboard.strongRetention') }} <TrendingUp class="size-4" />
            </div>
            <div class="text-muted-foreground">
              {{ t('dashboard.engagementExceed') }}
            </div>
          </CardFooter>
        </Card>
        <Card class="@container/card">
          <CardHeader>
            <CardDescription>{{ t('dashboard.growthRate') }}</CardDescription>
            <CardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              <NumberFlow
                :value="dataCard.growthRate"
                suffix="%"
              />
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp />
                +4.5%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter class="flex-col items-start gap-1.5 text-sm">
            <div class="line-clamp-1 flex gap-2 font-medium">
              {{ t('dashboard.steadyPerformance') }} <TrendingUp class="size-4" />
            </div>
            <div class="text-muted-foreground">
              {{ t('dashboard.meetsGrowth') }}
            </div>
          </CardFooter>
        </Card>
      </div>
      <Card class="@container/card">
        <CardHeader>
          <CardTitle>{{ t('dashboard.totalVisitors') }}</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">
              {{ t('dashboard.totalLast3Months') }}
            </span>
            <span className="@[540px]/card:hidden">{{ t('dashboard.last3Months') }}</span>
          </CardDescription>
          <CardAction>
            <ToggleGroup
              v-model="timeRange"
              type="single"
              variant="outline"
              class="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
            >
              <ToggleGroupItem value="90d">
                {{ t('dashboard.last3Months') }}
              </ToggleGroupItem>
              <ToggleGroupItem value="30d">
                {{ t('dashboard.last30Days') }}
              </ToggleGroupItem>
              <ToggleGroupItem value="7d">
                {{ t('dashboard.last7Days') }}
              </ToggleGroupItem>
            </ToggleGroup>
            <Select v-model="timeRange">
              <SelectTrigger
                class="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                size="sm"
                aria-label="Select a value"
              >
                <SelectValue :placeholder="t('dashboard.last3Months')" />
              </SelectTrigger>
              <SelectContent class="rounded-xl">
                <SelectItem value="90d" class="rounded-lg">
                  {{ t('dashboard.last3Months') }}
                </SelectItem>
                <SelectItem value="30d" class="rounded-lg">
                  {{ t('dashboard.last30Days') }}
                </SelectItem>
                <SelectItem value="7d" class="rounded-lg">
                  {{ t('dashboard.last7Days') }}
                </SelectItem>
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent>
          <DashboardTotalVisitors :time-range="timeRange" />
        </CardContent>
      </Card>
    </main>
  </div>
</template>
