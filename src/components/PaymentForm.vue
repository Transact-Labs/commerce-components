<template>
  <form>
    <select
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
/**
 * TODO:
 *  - generate token if cart exist or not empty, or decrease opacity
 *  - if configured to allowed that, or else emit event to indicate
 *  - to container that no checkout was generated, due to no cart/empty cart
 */
export default {
  name: 'PaymentForm',
  data() {
    return {
      deliveryCountry: this.defaultDeliveryCountry || '',
      deliveryRegion: this.defaultDeliveryRegion || '',

      countries: {},
      subdivisions: {},
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
  },
  created() {
    if (!this.$commerce) {
      throw Error('Could not detect Commerce.js within <PaymentForm>');
    }
    this.getAllCountries();
    this.getRegions(this.deliveryCountry);
  },
  watch: {
    deliveryCountry(newVal) {
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
