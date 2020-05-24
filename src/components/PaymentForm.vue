<!-- Payment-form, encapsulates shipping/billing and payment form details-->
<template>
  <form>
    <!-- customer information -->
    <input name="customerFirstName" v-model="customer.firstName"/>
    <input name="customerLastName" v-model="customer.lastName" />
    <input name="customerEmail" v-model="customer.email" />

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
     *  synced checkout (.sync)
     */
    checkout: {
      type: Object,
      default: () => ({}),
    },
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
    /**
     * identifier id (cart id, product id, permalink) to genereate checkout for
     *
     */
    identifierId: {
      type: String,
      default: '',
    },
    /**
     *  the type of identifier. Types: product_id, cart, permalink.
     */
    identifierType: {
      type: String,
      default: 'cart',
      validate(type) {
        return ['product_id', 'cart', 'permalink'].includes(type);
      },
    },
    /**
     * configuration options
     */
    options: {
      type: Object,
      default: () => ({}),
    },
  },
  created() {
    if (!this.$commerce) {
      throw Error('Could not detect Commerce.js within <PaymentForm>');
    }

    this.getAllCountries();

    // utilize emitted Commerce.js Cart Events
    // Cart.Item.Added, Cart.Item.Updated, Cart.Item.Removed, Cart.Deleted, Cart.Emptied
    // to omit need of cart data being passed via prop by consumer
    // https://github.com/chec/commerce.js/blob/4cb95203f996d6ece46f622c57bc1bc6d0de25e6/src/commerce.js#L7
    // TODO: consider later on not generating a new checkout, with generateCheckouttoken
    // on cart events that aren't cart.emptied, cart.deleted,
    // and instead utilize $commerce.checkout.getToken to get updated existing token
    window.addEventListener(
      'Commercejs.Cart.Item.Removed',
      () => this.generateCheckoutToken()
        .then(checkout => this.emitUpdateCheckout(checkout))
        .catch(error => {
          console.log('ERROR: Could not generate checkout token', error);
          this.emitUpdateCheckout({});
        }),
    );
    window.addEventListener(
      'Commercejs.Cart.Item.Updated',
      () => this.generateCheckoutToken()
        .then(checkout => this.emitUpdateCheckout(checkout))
        .catch(error => {
          console.log('ERROR: Could not generate checkout token', error);
          this.emitUpdateCheckout({});
        }),
    );
    window.addEventListener(
      'Commercejs.Cart.Item.Added',
      () => this.generateCheckoutToken()
        .then(checkout => this.emitUpdateCheckout(checkout))
        .catch(error => {
          console.log('ERROR: Could not generate checkout token', error);
          this.emitUpdateCheckout({});
        }),
    );
    window.addEventListener(
      'Commercejs.Cart.Item.Removed',
      () => this.generateCheckoutToken()
        .then(checkout => this.emitUpdateCheckout(checkout))
        .catch(error => {
          console.log('ERROR: Could not generate checkout token', error);
          this.emitUpdateCheckout({});
        }),
    );
  },
  watch: {
    identifierId: {
      handler(val, oldVal) {
        if (!oldVal && val) {
        // on initial creation prop.identifierId may be empty
        // so, only invoke generateCheckoutToken that relies on indentifierId
        // only on the subsequent update to identifierId, where the previous indentifierId
        // was empty/undefined
          this.generateCheckoutToken()
            .then(checkout => this.emitUpdateCheckout(checkout))
            .catch(error => {
              console.log('ERROR: Could not generate checkout token', error);
              this.emitUpdateCheckout({});
            });
        }
      },
      immediate: true,
    },
    deliveryCountry: {
      handler(val, oldVal) {
        if (oldVal !== val) {
          this.deliveryRegion = '';
        }
        // update the regions/provinces/states that are based on the selected delivery country (this.deliveryCountry)
        this.getRegions(val);
      },
      immediate: true,
    },
  },
  methods: {
    /**
     * generate checkout token
     */
    generateCheckoutToken() {
      return this.$commerce.checkout.generateToken(this.identifierId, { type: this.identifierType })
        .then(checkout => checkout)
        .catch(error => {
          // eslint-disable-next-line no-console
          console.log('ERROR: GENERATING CHECKOUT TOKEN', error);
          throw error;
        });
    },
    /**
     * emit update:checkout event, for .sync modifier to work
     */
    emitUpdateCheckout(checkout) {
      this.$emit('update:checkout', checkout);
    },
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
