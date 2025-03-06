<template>
  <view class="content">
    <image class="logo" src="/static/logo.png" />
    <view class="text-area">
      <text class="title !text-4xl">{{ title }}</text>
      <view>12133</view>
    </view>
  </view>
</template>

<script setup lang="ts">
  // import { getList } from '@/api/user'
  const title = ref('Hello')
  // const { loading, data, run } = useUpload({ user: '菲鸽' })
  // const { loading, error, data, run } = useRequest<any>(() => getList({}))
  const getData = () => {
    console.log('getData')
  }
</script>

<style></style>
