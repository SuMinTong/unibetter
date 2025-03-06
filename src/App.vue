<script setup lang="ts">
  import { useUserStore } from '@/stores/user'
  const { token, autoLogin } = useUserStore()
  onLaunch(() => {
    console.log('----App Launch', token)
    if (!token) {
      console.log('----App Launch autoLogin')
      autoLogin()
    }
  })
  onShow(() => {
    console.log('App Show')
  })
  onHide(() => {
    console.log('App Hide')
  })
</script>
<style></style>
