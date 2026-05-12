<script setup lang="ts">
const CORRECT_PIN = '499777'
const PIN_LENGTH = 6
const { login } = useAuth()

const digits = reactive<string[]>(Array.from({ length: PIN_LENGTH }, () => ''))
const inputRefs = ref<(HTMLInputElement | null)[]>(Array(PIN_LENGTH).fill(null))
const errorState = ref(false)
const shaking = ref(false)
const isLoading = ref(false)

const pinDisplay = computed(() => digits.join(''))

function setRef(el: HTMLInputElement | null, i: number) {
  inputRefs.value[i] = el
}

function handleInput(i: number, event: Event) {
  const input = event.target as HTMLInputElement
  const val = input.value.replace(/\D/g, '').slice(-1)
  digits[i] = val
  input.value = val
  errorState.value = false

  if (val && i < PIN_LENGTH - 1) {
    inputRefs.value[i + 1]?.focus()
  }

  if (digits.every(d => d !== '')) {
    submit()
  }
}

function handleKey(i: number, event: KeyboardEvent) {
  if (event.key === 'Backspace') {
    event.preventDefault()
    if (digits[i]) {
      digits[i] = ''
      if (inputRefs.value[i])
        (inputRefs.value[i] as HTMLInputElement).value = ''
    }
    else if (i > 0) {
      digits[i - 1] = ''
      if (inputRefs.value[i - 1])
        (inputRefs.value[i - 1] as HTMLInputElement).value = ''
      inputRefs.value[i - 1]?.focus()
    }
    errorState.value = false
    return
  }
  if (event.key === 'ArrowLeft' && i > 0) { inputRefs.value[i - 1]?.focus(); return }
  if (event.key === 'ArrowRight' && i < PIN_LENGTH - 1) { inputRefs.value[i + 1]?.focus() }
}

function handlePaste(event: ClipboardEvent) {
  event.preventDefault()
  const text = event.clipboardData?.getData('text') ?? ''
  const chars = text.replace(/\D/g, '').slice(0, PIN_LENGTH)
  for (let i = 0; i < PIN_LENGTH; i++) {
    digits[i] = chars[i] ?? ''
    if (inputRefs.value[i]) (inputRefs.value[i] as HTMLInputElement).value = digits[i] ?? ''
  }
  const focus = Math.min(chars.length, PIN_LENGTH - 1)
  inputRefs.value[focus]?.focus()
  if (chars.length === PIN_LENGTH) submit()
}

function triggerShake() {
  shaking.value = true
  setTimeout(() => { shaking.value = false }, 620)
}

function submit() {
  if (isLoading.value) return
  if (pinDisplay.value === CORRECT_PIN) {
    isLoading.value = true
    login()
    setTimeout(() => navigateTo('/'), 500)
  }
  else {
    errorState.value = true
    triggerShake()
    setTimeout(() => {
      for (let i = 0; i < PIN_LENGTH; i++) {
        digits[i] = ''
        if (inputRefs.value[i]) (inputRefs.value[i] as HTMLInputElement).value = ''
      }
      errorState.value = false
      inputRefs.value[0]?.focus()
    }, 700)
  }
}

function clearPin() {
  for (let i = 0; i < PIN_LENGTH; i++) {
    digits[i] = ''
    if (inputRefs.value[i]) (inputRefs.value[i] as HTMLInputElement).value = ''
  }
  errorState.value = false
  inputRefs.value[0]?.focus()
}

onMounted(() => {
  nextTick(() => inputRefs.value[0]?.focus())
})
</script>

<template>
  <div class="pf-wrap">
    <!-- PIN Boxes -->
    <div class="pf-row" :class="{ shake: shaking, 'pf-row--err': errorState }">
      <input
        v-for="i in PIN_LENGTH"
        :key="i - 1"
        :ref="(el) => setRef(el as HTMLInputElement, i - 1)"
        class="pf-box"
        :class="{ 'pf-box--filled': digits[i - 1], 'pf-box--err': errorState }"
        type="password"
        inputmode="numeric"
        maxlength="1"
        autocomplete="off"
        @input="handleInput(i - 1, $event)"
        @keydown="handleKey(i - 1, $event)"
        @paste="handlePaste"
        @focus="($event.target as HTMLInputElement).select()"
      />
    </div>

    <!-- Error -->
    <Transition name="fade">
      <p v-if="errorState" class="pf-errmsg">
        Incorrect PIN — please try again.
      </p>
    </Transition>

    <!-- Submit -->
    <button
      class="pf-btn"
      :disabled="pinDisplay.length < PIN_LENGTH || isLoading"
      @click="submit"
    >
      <span v-if="!isLoading" class="pf-btn-inner">
        Unlock
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </span>
      <span v-else class="pf-spinner" />
    </button>

    <button class="pf-clear" @click="clearPin">
      Clear
    </button>
  </div>
</template>

<style scoped>
.pf-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.4rem;
  width: 100%;
}

/* Row of boxes */
.pf-row {
  display: flex;
  gap: 0.65rem;
}

.pf-box {
  width: 52px;
  height: 62px;
  border-radius: 14px;
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  outline: none;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  caret-color: transparent;
}

.pf-box:focus {
  border-color: rgba(139, 92, 246, 0.85);
  background: rgba(139, 92, 246, 0.1);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.18);
}

.pf-box--filled {
  border-color: rgba(139, 92, 246, 0.55);
  background: rgba(139, 92, 246, 0.07);
}

.pf-box--err {
  border-color: rgba(239, 68, 68, 0.75) !important;
  background: rgba(239, 68, 68, 0.07) !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12) !important;
}

/* Shake */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  15%       { transform: translateX(-8px); }
  30%       { transform: translateX(8px); }
  45%       { transform: translateX(-6px); }
  60%       { transform: translateX(6px); }
  75%       { transform: translateX(-3px); }
  90%       { transform: translateX(3px); }
}
.shake { animation: shake 0.62s cubic-bezier(.36,.07,.19,.97) both; }

/* Error text */
.pf-errmsg {
  font-size: 0.82rem;
  color: #f87171;
  margin: -0.4rem 0 0;
  text-align: center;
}

/* Submit */
.pf-btn {
  width: 100%;
  height: 52px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 24px rgba(124, 58, 237, 0.35);
}
.pf-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 6px 32px rgba(124, 58, 237, 0.5);
}
.pf-btn:active:not(:disabled) { transform: translateY(0); }
.pf-btn:disabled { opacity: 0.3; cursor: not-allowed; box-shadow: none; }

.pf-btn-inner {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

@keyframes spin { to { transform: rotate(360deg); } }
.pf-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2.5px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* Clear */
.pf-clear {
  background: none;
  border: none;
  color: rgba(255,255,255,0.3);
  font-size: 0.82rem;
  cursor: pointer;
  letter-spacing: 0.04em;
  padding: 0.2rem 0.5rem;
  transition: color 0.2s;
}
.pf-clear:hover { color: rgba(255,255,255,0.6); }

/* Fade */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
