import '../assets/tailwind.css';
import Vue from 'vue';
import VueCommercejs from '../index';

Vue.use(VueCommercejs, { commercejsPublicKey: process.env.VUE_APP_COMMERCEJS_PUBLIC_KEY });
