import Vue from 'vue'
import CompA from '../../components/A/A.vue'

new Vue({
  el: '#app',
  components: { CompA },
  template: '<p>info page<comp-a></comp-a></p>'
})