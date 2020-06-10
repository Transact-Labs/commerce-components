// utils
import ccFormat from '@/utils/ccFormat';
// components
import PaymentForm from '@/components/PaymentForm.vue';
// plugin install method
import install from './install';


const VueCommercejs = {
  utils: {
    ccFormat,
  },
  PaymentForm,
  install,
};

if (typeof window !== 'undefined') {
  window.VueCommercejs = VueCommercejs;
}

export default VueCommercejs;
