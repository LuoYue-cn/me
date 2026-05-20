<script setup>
import { useAppStore } from '../stores/app.js'

const props = defineProps({
  confirm: { type: Object, required: true },
})

const store = useAppStore()

function cancel() {
  store.showConfirm = null
}
</script>

<template>
  <div class="overlay" @click.self="cancel">
    <div class="dialog" style="max-width:360px">
      <div class="dialog-title">{{ confirm.title }}</div>
      <p style="font-size:15px;margin-bottom:20px">{{ confirm.message }}</p>
      <div class="form-actions">
        <button class="btn" @click="cancel">取消</button>
        <button class="btn btn-danger" @click="confirm.onConfirm">确定删除</button>
      </div>
    </div>
  </div>
</template>
