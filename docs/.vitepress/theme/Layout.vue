<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import SiteNavigator from './components/SiteNavigator.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #home-features-before>
      <SiteNavigator />
    </template>
  </Layout>
</template>
