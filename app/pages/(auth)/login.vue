<script setup lang="ts">
definePageMeta({
  layout: 'blank',
})
</script>

<template>
  <div class="pin-login-root">
    <!-- Animated background -->
    <div class="pin-bg-grid" />
    <div class="pin-bg-glow" />

    <div class="pin-card">
      <!-- Heading -->
      <div class="pin-heading">
        <h1 class="pin-title">Adeel's Workspace</h1>
        <p class="pin-subtitle">Enter your PIN to continue</p>
      </div>

      <!-- PIN Form -->
      <AuthPinLogin />
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

.pin-login-root {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  background: #09090b;
  font-family: 'Inter', sans-serif;
  overflow: hidden;
}

/* Subtle grid lines */
.pin-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
}

/* Centered ambient glow */
.pin-bg-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 700px;
  height: 700px;
  background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
  pointer-events: none;
}

.pin-card {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.5rem;
  width: 100%;
  max-width: 420px;
  padding: 3rem 2rem;
}

.pin-heading {
  text-align: center;
}

.pin-title {
  font-size: clamp(2.2rem, 6vw, 3.4rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
  background: linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #818cf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.6rem 0;
}

.pin-subtitle {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
  letter-spacing: 0.01em;
}
</style>
