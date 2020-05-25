<!-- Payment-form, encapsulates shipping/billing and payment form details-->
<template>
  <form>
    <!--
      TODO: allow two UI modes
      - either full custom mode where content is given for default slot,
      and slot props are passed as necessary,
      - or default mode where inputs are rendered as such by this component,
      default classes are rendered, unless given custom class for respective indivial input element.
    -->
    <!-- customer information -->
    <input name="customerFirstName" placeholder="First name" v-model="customer.firstName"/>
    <input name="customerLastName" placeholder="Last name" v-model="customer.lastName" />
    <input name="customerEmail" placeholder="Email" v-model="customer.email" />

    <!-- shippping information -->
    <template v-if="checkout && checkout.conditionals && checkout.conditionals.collects_shipping_address">
      <input
        name="shippingName"
        placeholder="Shipping name"
        v-model="shipping.name"
      />
      <input
        name="shippingStreet"
        placeholder="Street address"
        v-model="shipping.street"
      />
      <input
        name="shippingStreet2"
        placeholder="Street Address 2 (optional)"
        v-model="shipping.street2"
      />
      <input
        name="shippingTownCity"
        placeholder="City"
        v-model="shipping.townCity"
      />
      <input
        name="shippingPostalZipCode"
        placeholder="Zip code"
        v-model="shipping.postalZipCode"
      />
      <!-- todo : create select base-list component -->
      <select
        :class="[ countrySelectClass ? countrySelectClass : 'payment-form__delivery-country-select']"
        name="shippingCountry"
        v-model="shipping.country">
        <option value="" disabled>Select your shipping country</option>
        <option v-for="(countryValue, countryKey) in countries" :value="countryKey" :key="countryKey">
          {{ countryValue }}
        </option>
      </select>

      <select
        name="shippingCountyState"
        :class="[ countryRegionClass ? countryRegionClass : 'payment-form__delivery-country-select']"
        v-model="shipping.countyState">
        <option value="" disabled>Select your states, provinces, or region</option>
        <option
          v-for="(subdivisionValue, subdivisionKey) in subdivisions"
          :value="subdivisionKey"
          :key="subdivisionKey">
          {{ subdivisions[subdivisionKey] }}
        </option>
      </select>
    </template>

    <!-- billing information -->
    <!-- for default mode, also consider adding checkbox
    to toggle reusing shipping address for billing
    (since shipping is first in layout in default mode) -->
    <template v-if="checkout && checkout.conditionals && checkout.conditionals.collects_billing_address">
      <input
        name="billingName"
        placeholder="Billing name"
        v-model="billing.name"
      />
      <input
        name="billingStreet"
        placeholder="Billing street address"
        v-model="billing.street"
      />
      <input
        name="billingStreet2"
        placeholder="Billing street address 2 (optional)"
        v-model="billing.street2"
      />
      <input
        name="billingTownCity"
        placeholder="Billing city"
        v-model="billing.townCity"
      />
      <input
        name="billingPostalZipCode"
        placeholder="Billing zip code"
        v-model="billing.postalZipCode"
      />
      <!-- todo : create select base-list component -->
      <select
        name="billingCountry"
        v-model="billing.country">
        <option value="" disabled>Select your billing country</option>
        <option v-for="(countryValue, countryKey) in countries" :value="countryKey" :key="countryKey">
          {{ countryValue }}
        </option>
      </select>
      <select
        name="billingCountyState"
        v-model="billing.countyState">
        <option value="" disabled>Select your states, provinces, or region</option>
        <option
          v-for="(subdivisionValue, subdivisionKey) in billingSubdivisions"
          :value="subdivisionKey"
          :key="subdivisionKey">
          {{ billingSubdivisions[subdivisionKey] }}
        </option>
      </select>
    </template>

    <!-- shipping method/option -->
    <select
      name="shippingMethod"
      v-model="selectedShippingMethod">
      <option value="" disabled>Select a shipping method</option>
      <option v-for="option in shippingOptions" :value="option.id" :key="option.id">
        {{ `${option.description} - $${option.price.formatted_with_code}` }}
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
        countyState: '',
        country: 'US',
        postalZipCode: '',
      },

      billing: {
        name: '',
        street: '',
        street2: '',
        townCity: '',
        countyState: '',
        country: 'US',
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
      billingSubdivisions: {},
      shippingOptions: [],

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
        // on initial creation of component prop.identifierId may be empty
        // thefore only invoke generateCheckoutToken (which relies on indentifierId)
        // on the subsequent update to identifierId, where the previous indentifierId
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
    'shipping.country': {
      handler(val, oldVal) {
        if (oldVal !== val) {
          this.shipping.countyState = '';
        }
        // update the regions/provinces/states that are based on the selected delivery country (this.deliveryCountry)
        this.getShippingRegions(val);
      },
      immediate: true,
    },
    'billing.country': {
      handler(val, oldVal) {
        if (oldVal !== val) {
          this.billing.countyState = '';
        }
        // update the regions/provinces/states that are based on the selected delivery country (this.deliveryCountry)
        this.getBillingRegions(val);
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
        .then(checkout => {
          this.getShippingOptionsForCheckout(checkout.id, this.shipping.country, this.shipping.countyState);
          return checkout;
        })
        .catch(error => {
          // eslint-disable-next-line no-console
          console.log('ERROR: GENERATING CHECKOUT TOKEN', error);
          throw error;
        });
    },
    /**
     * emit update:checkout event, for .sync modifier to work
     * TODO: set up custom v-model for component to optionally allow v-model to be used
     * as an available alternative to checkout.sync
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
     * Get list of shipping regions for the chosen country
     *
     * @param {string}
     */
    getShippingRegions(deliveryCountryCode) {
      this.$commerce.services.localeListSubdivisions(deliveryCountryCode)
        .then(resp => {
          this.subdivisions = resp.subdivisions;
        }).catch(error => console.log('there was an error while fetching shipping subdivisons', error));
    },
    /**
     * Fetch list of billing regions for the chosen country
     * @param {string}
     */
    getBillingRegions(billingCountryCode) {
      this.$commerce.services.localeListSubdivisions(billingCountryCode)
        .then(resp => {
          this.billingSubdivisions = resp.subdivisions;
        }).catch(error => console.log('there was an error while fetching billing subdivisons', error));
    },
    // Use commerce.js checkout helper, commerce.checkout.getShippingOptions
    // to return list of available shipping methods for the provided checkout token
    getShippingOptionsForCheckout(checkoutId, country = 'US', region) {
      return this.$commerce.checkout.getShippingOptions(checkoutId, { country, region })
        .then(shippingOptions => { this.shippingOptions = shippingOptions; })
        .catch(error => console.log('ERROR: error while fetching shipping options for checkout', error));
    },
  },
};
</script>
