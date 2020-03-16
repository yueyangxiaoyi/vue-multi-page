

<template>
  <div>
    <img src="./static/logo.png" alt="" class="logo">
    <h1>{{msg}}</h1>
    <comp-a></comp-a>
  </div>
</template>

<script>
import CompA from '../../components/A/A.vue'
export default {
  data () {
    return {
      msg: 'Hello from another module!'
    }
  },
  components: {
    CompA
  }
}
</script>

<style>
body {
  font: Helvetica, sans-serif;
  color: #666;
}
.logo {
  width: 50px;
  height: 50px;
}
</style>