<template>
  <div class="login-container flex flex-center">
    <!-- Glowing background elements -->
    <div class="bg-blob blob-1"></div>
    <div class="bg-blob blob-2"></div>
    <div class="bg-blob blob-3"></div>

    <q-card class="login-card glass-panel q-pa-xl">
      <div class="column items-center q-mb-lg">
        <q-img
          src="/logo_bmh.png"
          alt="BMH Logo"
          width="120px"
          class="q-mb-md filter-shadow"
          fit="contain"
        />
        <div class="text-h5 text-bold text-gradient text-center">Manajemen Penyaluran</div>
        <div class="text-caption text-grey-4 text-center q-mt-xs">Lembaga Baitul Maal Hidayatullah</div>
      </div>

      <q-form @submit.prevent="handleLogin" class="q-gutter-md">
        <q-input
          v-model="form.username"
          label="Username atau Email"
          label-color="grey-4"
          input-class="text-white"
          outlined
          dense
          color="primary"
          :rules="[val => !!val || 'Field ini harus diisi']"
          bg-color="rgba(255, 255, 255, 0.05)"
          class="custom-input"
        >
          <template v-slot:prepend>
            <q-icon name="person" color="grey-4" />
          </template>
        </q-input>

        <q-input
          v-model="form.password"
          label="Password"
          label-color="grey-4"
          input-class="text-white"
          outlined
          dense
          type="password"
          color="primary"
          :rules="[val => !!val || 'Field ini harus diisi']"
          bg-color="rgba(255, 255, 255, 0.05)"
          class="custom-input"
        >
          <template v-slot:prepend>
            <q-icon name="lock" color="grey-4" />
          </template>
        </q-input>

        <q-btn
          type="submit"
          label="MASUK"
          color="primary"
          class="full-width btn-gradient q-py-sm text-bold q-mt-md"
          :loading="loading"
        />
      </q-form>

      <div class="divider-container q-my-lg">
        <span class="divider-text">ATAU</span>
      </div>

      <!-- Google Sign In Button -->
      <q-btn
        outline
        class="full-width google-btn q-py-sm"
        @click="showGoogleMock = true"
        no-caps
      >
        <div class="row items-center justify-center no-wrap">
          <q-img
            src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
            width="18px"
            class="q-mr-sm"
          />
          <span class="text-white text-bold">Masuk dengan Google</span>
        </div>
      </q-btn>

      <!-- Development Helper Tool -->
      <div class="dev-helper q-mt-xl q-pa-sm rounded-borders text-caption text-grey-4">
        <div class="row items-center justify-between cursor-pointer" @click="showDevHelper = !showDevHelper">
          <span class="text-bold text-amber"><q-icon name="smart_toy" class="q-mr-xs" />Asisten Pengujian</span>
          <q-icon :name="showDevHelper ? 'expand_less' : 'expand_more'" />
        </div>
        <q-slide-transition>
          <div v-show="showDevHelper" class="q-mt-sm">
            <div class="text-grey-5 q-mb-xs">Klik akun di bawah untuk mengisi form login otomatis:</div>
            <div class="row q-col-gutter-xs">
              <div class="col-6">
                <q-btn size="xs" color="dark" class="full-width" label="Admin (admin)" @click="fillForm('admin', '1234')" />
              </div>
              <div class="col-6">
                <q-btn size="xs" color="dark" class="full-width" label="PJ Akhyar (031)" @click="fillForm('A M AKHYAR', '1234')" />
              </div>
              <div class="col-6">
                <q-btn size="xs" color="dark" class="full-width" label="PJ Adhe (0)" @click="fillForm('AD', '!Admin123')" />
              </div>
              <div class="col-6">
                <q-btn size="xs" color="dark" class="full-width" label="PJ Fahmi (101)" @click="fillForm('FAHMI01', '1234')" />
              </div>
            </div>
          </div>
        </q-slide-transition>
      </div>
    </q-card>

    <!-- Dialog Mock Google Login -->
    <q-dialog v-model="showGoogleMock">
      <q-card class="google-dialog-card q-pa-md">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-white text-bold">Simulasi Google Sign-In</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup color="grey-4" />
        </q-card-section>

        <q-card-section class="text-grey-4 q-py-sm">
          Pilih salah satu email di database untuk masuk sebagai user Google:
        </q-card-section>

        <q-list separator class="q-my-md bg-grey-9 rounded-borders">
          <q-item
            v-for="email in registeredEmails"
            :key="email.email"
            clickable
            v-close-popup
            @click="handleGoogleMockLogin(email.email)"
            class="q-py-md text-white"
          >
            <q-item-section avatar>
              <q-avatar color="primary" text-color="white">{{ email.name[0] }}</q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-bold">{{ email.name }}</q-item-label>
              <q-item-label caption class="text-grey-4">{{ email.email }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-badge color="amber" text-color="black">{{ email.role }}</q-badge>
            </q-item-section>
          </q-item>
        </q-list>

        <q-card-actions align="right">
          <q-btn flat label="Batal" color="grey-4" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const showDevHelper = ref(true)
const showGoogleMock = ref(false)

const form = reactive({
  username: '',
  password: ''
})

// Sample list of pre-configured Google account emails matching the DB dump
const registeredEmails = [
  { name: 'Adhe Purwanto', email: 'adhepur@gmail.com', role: 'HQ Admin' },
  { name: 'Musthafainal Akhyar', email: 'akhar.umk@gmail.com', role: 'PJ Area 031' },
  { name: 'Fahmi Rahman', email: 'fah@bmh.or.id', role: 'PJ Area 101' },
  { name: 'Admin Utama', email: 'admin@admin.com', role: 'System Admin' }
]

const fillForm = (user, pass) => {
  form.username = user
  form.password = pass
}

const handleLogin = async () => {
  loading.value = true
  const success = await authStore.login(form.username, form.password)
  loading.value = false
  if (success) {
    router.push('/')
  }
}

const handleGoogleMockLogin = async (email) => {
  loading.value = true
  // Simulate sending a verified token to the backend, sending email directly
  const success = await authStore.loginWithGoogle('mock-id-token', email)
  loading.value = false
  if (success) {
    router.push('/')
  }
}
</script>

<style lang="scss">
.login-container {
  min-height: 100vh;
  width: 100vw;
  background-color: #0b0f19;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

/* Glowing background blobs */
.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.25;
  animation: float-blob 12s infinite alternate ease-in-out;
}
.blob-1 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, #2196f3, #0d47a1);
  top: -10%;
  left: -10%;
}
.blob-2 {
  width: 450px;
  height: 450px;
  background: radial-gradient(circle, #00e676, #00c853);
  bottom: -15%;
  right: -10%;
  animation-delay: 2s;
}
.blob-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, #ab47bc, #7b1fa2);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-duration: 18s;
}

@keyframes float-blob {
  0% {
    transform: translate(0, 0) scale(1);
  }
  100% {
    transform: translate(40px, 40px) scale(1.1);
  }
}

/* Glassmorphism Panel */
.glass-panel {
  background: rgba(17, 24, 39, 0.7) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}

.login-card {
  width: 100%;
  max-width: 460px;
  z-index: 10;
  border-radius: 20px;
}

.filter-shadow {
  filter: drop-shadow(0px 4px 10px rgba(33, 150, 243, 0.3));
}

.text-gradient {
  background: linear-gradient(135deg, #64b5f6, #2196f3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Form Styles */
.custom-input {
  .q-field__control {
    border-radius: 12px !important;
    &:before {
      border-color: rgba(255, 255, 255, 0.15) !important;
    }
  }
}

.btn-gradient {
  background: linear-gradient(135deg, #2196f3, #1e88e5) !important;
  border-radius: 12px;
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
  }
}

.divider-container {
  display: flex;
  align-items: center;
  text-align: center;
  color: #9e9e9e;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 1.5px;
  &:before, &:after {
    content: '';
    flex: 1;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  &:before {
    margin-right: .5em;
  }
  &:after {
    margin-left: .5em;
  }
}

.google-btn {
  border-radius: 12px !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  background-color: rgba(255, 255, 255, 0.03);
  transition: all 0.3s ease;
  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
  }
}

.dev-helper {
  background-color: rgba(255, 193, 7, 0.05);
  border: 1px solid rgba(255, 193, 7, 0.15);
}

.google-dialog-card {
  width: 400px;
  max-width: 90vw;
  background-color: #111827;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}
</style>
