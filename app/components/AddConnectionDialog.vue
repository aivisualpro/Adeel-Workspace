<script setup lang="ts">
/**
 * AddConnectionDialog
 *
 * Modal dialog for adding a new MongoDB connection from the frontend.
 * Tests the connection before saving, and emits 'added' on success.
 */

const props = defineProps<{
    open: boolean
}>()

const emit = defineEmits<{
    (e: 'update:open', val: boolean): void
    (e: 'added', key: string): void
}>()

const label = ref('')
const uri = ref('')
const testing = ref(false)
const saving = ref(false)
const testResult = ref<{ success: boolean, message: string } | null>(null)

const isValid = computed(() => label.value.trim().length > 0 && uri.value.trim().length > 0)

const generatedKey = computed(() =>
    label.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(0, 30),
)

function close() {
    emit('update:open', false)
    // Reset after transition
    setTimeout(() => {
        label.value = ''
        uri.value = ''
        testResult.value = null
        testing.value = false
        saving.value = false
    }, 200)
}

async function testConnection() {
    if (!isValid.value || testing.value) return
    testing.value = true
    testResult.value = null
    try {
        await $fetch('/api/db/sources', {
            method: 'POST',
            body: { label: label.value.trim(), uri: uri.value.trim() },
        })
        testResult.value = { success: true, message: 'Connection successful! Source has been added.' }
        emit('added', generatedKey.value)
        // Auto-close after short delay
        setTimeout(close, 1200)
    }
    catch (err: any) {
        testResult.value = { success: false, message: err.data?.message || 'Connection failed' }
    }
    testing.value = false
}
</script>

<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="props.open"
                class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                @click.self="close"
            >
                <Transition
                    enter-active-class="transition-all duration-300 ease-out"
                    enter-from-class="opacity-0 scale-95 translate-y-4"
                    enter-to-class="opacity-100 scale-100 translate-y-0"
                    leave-active-class="transition-all duration-200 ease-in"
                    leave-from-class="opacity-100 scale-100"
                    leave-to-class="opacity-0 scale-95 translate-y-4"
                >
                    <div
                        v-if="props.open"
                        class="w-full max-w-lg mx-4 rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden"
                    >
                        <!-- Header -->
                        <div class="relative px-6 pt-5 pb-4 border-b border-border/40">
                            <div class="absolute top-0 left-0 w-full h-1 rounded-t-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />
                            <div class="flex items-center gap-3">
                                <div class="flex items-center justify-center size-9 rounded-xl bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30">
                                    <Icon name="i-lucide-plug-zap" class="size-4" />
                                </div>
                                <div>
                                    <h3 class="text-sm font-semibold text-foreground">Add Connection</h3>
                                    <p class="text-[11px] text-muted-foreground mt-0.5">Connect to a new MongoDB cluster</p>
                                </div>
                                <button
                                    type="button"
                                    class="ml-auto flex items-center justify-center size-8 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                                    @click="close"
                                >
                                    <Icon name="i-lucide-x" class="size-4" />
                                </button>
                            </div>
                        </div>

                        <!-- Body -->
                        <div class="px-6 py-5 space-y-4">
                            <!-- Label -->
                            <div class="space-y-1.5">
                                <label class="text-xs font-medium text-foreground" for="conn-label">Display Name</label>
                                <input
                                    id="conn-label"
                                    v-model="label"
                                    type="text"
                                    placeholder="e.g. My Project DB"
                                    class="w-full h-9 px-3 text-sm rounded-lg border border-border/60 bg-background/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                                />
                                <p v-if="generatedKey" class="text-[10px] text-muted-foreground">
                                    Source key: <code class="font-mono text-foreground/70">{{ generatedKey }}</code>
                                </p>
                            </div>

                            <!-- URI -->
                            <div class="space-y-1.5">
                                <label class="text-xs font-medium text-foreground" for="conn-uri">Connection URI</label>
                                <input
                                    id="conn-uri"
                                    v-model="uri"
                                    type="password"
                                    placeholder="mongodb+srv://user:pass@cluster.mongodb.net/"
                                    class="w-full h-9 px-3 text-sm font-mono rounded-lg border border-border/60 bg-background/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                                />
                                <p class="text-[10px] text-muted-foreground">The connection will be tested before saving</p>
                            </div>

                            <!-- Test result -->
                            <Transition
                                enter-active-class="transition-all duration-300 ease-out"
                                enter-from-class="opacity-0 -translate-y-1"
                                enter-to-class="opacity-100 translate-y-0"
                                leave-active-class="transition-all duration-200 ease-in"
                                leave-from-class="opacity-100"
                                leave-to-class="opacity-0 -translate-y-1"
                            >
                                <div
                                    v-if="testResult"
                                    class="flex items-start gap-2.5 p-3 rounded-lg text-xs"
                                    :class="testResult.success
                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'"
                                >
                                    <Icon
                                        :name="testResult.success ? 'i-lucide-check-circle-2' : 'i-lucide-alert-circle'"
                                        class="size-4 shrink-0 mt-0.5"
                                    />
                                    <span class="leading-relaxed">{{ testResult.message }}</span>
                                </div>
                            </Transition>
                        </div>

                        <!-- Footer -->
                        <div class="px-6 py-4 border-t border-border/40 flex items-center gap-3 justify-end bg-muted/20">
                            <Button
                                variant="ghost"
                                size="sm"
                                class="text-xs"
                                @click="close"
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                class="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                :disabled="!isValid || testing"
                                @click="testConnection"
                            >
                                <Icon
                                    v-if="testing"
                                    name="i-lucide-loader-2"
                                    class="size-3.5 animate-spin"
                                />
                                <Icon v-else name="i-lucide-plug-zap" class="size-3.5" />
                                {{ testing ? 'Testing...' : 'Test & Save' }}
                            </Button>
                        </div>
                    </div>
                </Transition>
            </div>
        </Transition>
    </Teleport>
</template>
