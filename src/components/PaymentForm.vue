<template>
  <form>

    <input name="firstName" v-model="f" className="rounded-0 w-100" />
    <!-- todo : create select base-list component -->
    <!-- todo : wrap with slot and use this mark-up as fall-back -->
    <select
      :class="[ countrySelectClass ? countrySelectClass : 'payment-form__delivery-country-select']"
      name="deliveryCountry"
      v-model="deliveryCountry"
      placeholder="Delivery Country">
      <option value="" disabled>Select your country</option>
      <option v-for="(countryValue, countryKey) in countries" :value="countryKey" :key="countryKey">
        {{ countryValue }}
      </option>
    </select>

    <select
      name="deliveryRegion"
      :class="[ countryRegionClass ? countryRegionClass : 'payment-form__delivery-country-select']"
      :disabled="!!!deliveryCountry"
      v-model="deliveryRegion">
      <option value="" disabled>Select your states, provinces, or region</option>
      <option v-for="(subdivisionValue, subdivisionKey) in subdivisions" :value="subdivisionKey" :key="subdivisionKey">
        {{ subdivisions[subdivisionKey] }}
      </option>
    </select>
  </form>
</template>
<script>
import ccFormat from '@/utils/ccFormat';
/**
 * TODO:
 *  - generate token if cart exist or not empty, or decrease opacity
 *  - if configured to allowed that, or else emit event to indicate
 *  - to container that no checkout was generated, due to no cart/empty cart
 */
const IS_DEV_MODE = process.env.NODE_ENV === 'development';
export default {
  name: 'PaymentForm',
  data() {
    return {
      deliveryCountry: this.defaultDeliveryCountry || '',
      deliveryRegion: this.defaultDeliveryRegion || '',

      customer: {
        firstName: '',
        lastName: '',
        email: '',
      },

      shipping: {
        name: '',
        street: '',
        street2: '',
        townCity: '',
        postalZipCode: '',
      },

      selectedShippingMethod: '',

      card: {
        number: IS_DEV_MODE ? ccFormat('4242424242424242') : '', // if dev. mode, set dev friendly defaults
        expMonth: '',
        expYear: '',
        cvc: '',
        billingPostalZipcode: '',
      },

      countries: {},
      subdivisions: {},

      selectedGateway: IS_DEV_MODE ? 'test_gateway' : '', // if dev. mode, set dev friendly defaults
    };
  },
  props: {
    /**
     * default delivery country
     */
    defaultDeliveryCountry: {
      type: String,
      default: '',
    },
    /**
     * default delivery region
     */
    defaultDeliveryRegion: {
      type: String,
      default: '',
    },
    /**
     * class to apply to default region select element
     */
    countryRegionClass: {
      type: String,
      default: '',
    },
    /**
     * class to apply to default country select element
     */
    countrySelectClass: {
      type: String,
      default: '',
    },
  },
  created() {
    if (!this.$commerce) {
      throw Error('Could not detect Commerce.js within <PaymentForm>');
    }
    this.getAllCountries();
    this.getRegions(this.deliveryCountry);
  },
  watch: {
    deliveryCountry(prevVal, newVal) {
      if (prevVal !== newVal) {
        this.deliveryRegion = '';
      }
      // update the regions/provinces/states that are based on the selected delivery country (this.deliveryCountry)
      this.getRegions(newVal);
    },
  },
  methods: {
    /**
     * Fetch all available countries for shipping
     */
    getAllCountries() {
      this.$commerce.services.localeListCountries().then(resp => {
        this.countries = resp.countries;
      }).catch(error => console.log('There was an error while fetching countries', error));
    },
    /**
     * Fetch available shipping regions for the chosen country
     *
     * @param {string} deliveryCountry
     */
    getRegions(deliveryCountryCode) {
      this.$commerce.services.localeListSubdivisions(deliveryCountryCode)
        .then(resp => {
          this.subdivisions = resp.subdivisions;
        }).catch(error => console.log('there was an error while fetching subdivisons', error));
    },
  },
};
</script>
