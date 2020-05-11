import Vue from 'vue';
import VueCommercejs from '../src/index';
import App from './App.vue';

Vue.config.productionTip = false;

Vue.use(VueCommercejs, { commercejsPublicKey: process.env.VUE_APP_COMMERCEJS_PUBLIC_KEY });

new Vue({
  render: h => h(App),
}).$mount('#app');
