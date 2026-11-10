<script setup lang="ts">
import LocaleSwitch from '@/components/LocaleSwitch/index.vue'
import { useI18n } from 'vue-i18n'

import { appConfig } from '@/config/app'
import { useRoute, useRouter } from 'vue-router'
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'

import { getLoginRedirect } from '@/router/utils/path'
import { handleRequestError } from '@/api/errors/handling'
import { useSession } from '@/composables/useSession'

import type { FormInstance, FormRules } from 'element-plus'

const { t } = useI18n({ useScope: 'global' })

interface LoginForm {
  username: string
  password: string
}

const route = useRoute()
const router = useRouter()

const { signIn } = useSession(router)

const formRef = ref<FormInstance>()

const loading = ref(false)

const appTitle = appConfig.title

const mockEnabled = appConfig.mockEnabled

const appInitial = computed(() => appTitle.trim().charAt(0).toUpperCase())

const form = reactive<LoginForm>({
  username: '',
  password: ''
})

const rules = computed<FormRules<LoginForm>>(() => ({
  username: [
    {
      required: true,
      message: t('ui.enterYourUsername'),
      trigger: 'blur'
    }
  ],

  password: [
    {
      required: true,
      message: t('ui.enterYourPassword'),
      trigger: 'blur'
    }
  ]
}))

const redirect = computed(() => getLoginRedirect(route.query.redirect))

async function handleSubmit(): Promise<void> {
  if (!formRef.value || loading.value) {
    return
  }

  const valid = await formRef.value.validate().catch(() => false)

  if (!valid || loading.value) {
    return
  }

  loading.value = true

  try {
    await signIn({
      username: form.username,
      password: form.password
    })

    ElMessage.success(t('ui.signedInSuccessfully'))

    await router.replace(redirect.value)
  } catch (error) {
    handleRequestError(error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-page__language"><LocaleSwitch /></div>
    <div class="login-page__decor login-page__decor--one" />

    <div class="login-page__decor login-page__decor--two" />

    <div class="login-page__shell">
      <section class="login-page__brand">
        <div class="login-page__brand-inner">
          <div class="login-page__brand-logo">
            {{ appInitial }}
          </div>

          <div class="login-page__brand-copy">
            <h1 class="login-page__brand-title">
              {{ appTitle }}
            </h1>

            <p class="login-page__brand-description">
              {{ t('ui.aLightweightModernAndExtensibleVue3AdminStarter') }}
            </p>
          </div>
        </div>

        <p class="login-page__brand-footer">Powered by Npora</p>
      </section>

      <section class="login-page__content">
        <div class="login-page__card">
          <div class="login-page__mobile-brand">
            <div class="login-page__mobile-logo">
              {{ appInitial }}
            </div>

            <span class="login-page__mobile-title">
              {{ appTitle }}
            </span>
          </div>

          <header class="login-page__header">
            <h2 class="login-page__title">{{ t('ui.welcomeBack') }}</h2>

            <p class="login-page__subtitle">
              {{ t('ui.enterYourCredentialsToAccessTheWorkspace') }}
            </p>
          </header>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            class="login-page__form"
            size="large"
            @submit.prevent="handleSubmit"
          >
            <el-form-item prop="username">
              <el-input
                v-model="form.username"
                :prefix-icon="User"
                autocomplete="username"
                clearable
                :placeholder="t('ui.username')"
              />
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="form.password"
                :prefix-icon="Lock"
                autocomplete="current-password"
                :placeholder="t('ui.password')"
                show-password
                type="password"
              />
            </el-form-item>

            <el-button
              class="login-page__submit"
              :loading="loading"
              native-type="submit"
              type="primary"
              >{{ t('ui.signIn') }}</el-button
            >
          </el-form>

          <div v-if="mockEnabled" class="login-page__mock">
            <span class="login-page__mock-label"> Mock </span>

            <span>{{ t('ui.demoCredentialsHint') }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
