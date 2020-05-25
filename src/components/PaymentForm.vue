<!-- Payment-form, encapsulates shipping/billing and payment form details-->
<template>
  <form>
      <!--
        Two UI template Modes
        custom(slot) mode, default mode
        - custom mode is enabled by providing a default slot,
        the slotProps consist of this component $data, and a callback
        updateData expecting a dot-delimited property name, and value
        to update property with. for example this.$data.shipping.name/slotProps.shipping.name can be updated by
        slotProps.updateDate('shipping.name', 'john doe');
        - default mode where inputs are rendered as such by this component,
        default classes are rendered, unless given custom class for respective indivial input element.
        useful for quick developing with tailwind classes
          - add labels in default mode post-mvp/mwe
      -->
    <template v-if="$scopedSlots.default"> <!-- really should be $slot.default-->
      <slot v-bind="$data" :updateData="updateData" />
    </template>
    <template v-else>
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
          placeholder="Shipping zip code"
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
        v-if="checkout && checkout.conditionals && checkout.conditionals.has_physical_delivery"
        name="shippingMethod"
        v-model="selectedShippingMethod">
        <option value="" disabled>Select a shipping method</option>
        <option v-for="option in shippingOptions" :value="option.id" :key="option.id">
          {{ `${option.description || ''} $${option.price.formatted_with_code}` }}
        </option>
      </select>

      <!-- payment info -->
      <!-- TODO: implement stripe.js and element
      if gateway stripe available, and configured as the payment -->
      <input
        type="number"
        name="cardNumber"
        v-model="card.number"
        placeholder="Card number"
      />
      <div>
        <input
          type="number"
          name="expMonth"
          v-model="card.expMonth"
          placeholder="expiry month"
        />
        <input
          type="number"
          name="expYear"
          v-model="card.expYear"
          placeholder="expiry year (yyyy)"
        />
      </div>
      <div>
        <input
          type="number"
          name="cardCvc"
          v-model="card.cvc"
          placeholder="Card cvc"
        />
        <input
          type="number"
          name="cardBillingPostalZipCode"
          v-model="card.billingPostalZipcode"
          placeholder="Card billing zip code"
        />
      </div>
      <button
        @click.prevent="defaultModeCaptureOrder"
        :disabled="$_isEmpty(checkout)"
      >
        Checkout
      </button>
    </template>
  </form>
</template>
<script>
import _isEmpty from 'lodash.isempty';
// import { loadStripe } from '@stripe/stripe-js';

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
        number: '', // if dev. mode, set dev friendly defaults
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
    this.$_isEmpty = _isEmpty;
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
        .then(checkout => this.emitUpdateCheckout(checkout)),
    );
    window.addEventListener(
      'Commercejs.Cart.Item.Updated',
      () => this.generateCheckoutToken()
        .then(checkout => this.emitUpdateCheckout(checkout)),
    );
    window.addEventListener(
      'Commercejs.Cart.Item.Added',
      () => this.generateCheckoutToken()
        .then(checkout => this.emitUpdateCheckout(checkout)),
    );
    window.addEventListener(
      'Commercejs.Cart.Item.Removed',
      () => this.generateCheckoutToken()
        .then(checkout => this.emitUpdateCheckout(checkout)),
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
            .then(checkout => this.emitUpdateCheckout(checkout));
        }
      },
      immediate: true,
    },
    'shipping.country': {
      handler(val, oldVal) {
        if (oldVal !== val) {
          this.shipping.countyState = '';
          if (!_isEmpty(this.checkout)) {
            this.generateCheckoutToken()
              .then(checkout => this.emitUpdateCheckout(checkout));
          }
        }
        // update the regions/provinces/states that are based on the selected delivery country (this.deliveryCountry)
        this.getShippingRegions(val);
      },
      immediate: true,
    },
    'shipping.countyState': function handler(val, oldVal) {
      if (oldVal !== val) {
        if (!_isEmpty(this.checkout)) {
          this.generateCheckoutToken()
            .then(checkout => this.emitUpdateCheckout(checkout));
        }
      }
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
    selectedShippingMethod(val, oldVal) {
      if (oldVal !== val) {
        this.validateAndSetShippingOptionInCheckout(
          this.checkout.id,
          this.selectedShippingMethod,
          this.shipping.country,
          this.shipping.region,
        ).catch(this.generateCheckoutToken);
      }
    },
  },
  methods: {
    /**
     * to prevent catching this.captureError promise's rejected error
     *  in template inline with v-on,
     * (captureOrder is also used as slotProps.callback in custom/slot mode, hence reason why it returns promise)
     */
    defaultModeCaptureOrder() {
      this.captureOrder()
        .catch(error => {
          console.log('error while attempting to capture order', error);
        });
    },
    /**
     * capture order
     */
    captureOrder(e) {
      if (e) {
        e.preventDefault();
      }
      // set up line_items object and inner variant object for order object below
      const lineItems = this.checkout.live.line_items.reduce((obj, lineItem) => {
        const variants = lineItem.variants.reduce((_obj, variant) => {
          // eslint-disable-next-line no-param-reassign
          _obj[variant.variant_id] = variant.option_id;
          return _obj;
        }, {});
        // eslint-disable-next-line no-param-reassign
        obj[lineItem.id] = { ...lineItem, variants };
        return obj;
      }, {});
      // TODO: add support for extrafields
      // construct order object
      const order = {
        line_items: lineItems,
        customer: {
          firstname: this.customer.firstName,
          lastname: this.customer.lastName,
          email: this.customer.email,
        },
        shipping: {
          name: this.shipping.name,
          country: this.shipping.country,
          street: this.shipping.street + this.shipping.street2,
          town_city: this.shipping.townCity,
          county_state: this.shipping.countyState,
          postal_zip_code: this.shipping.postalZipCode,
        },
        fulfillment: {
          shipping_method: this.selectedShippingMethod,
        },
        payment: {
          gateway: this.selectedGateway,
        },
      };

      // TODO: for mvp only support test_gateay, ideally stripe(token), razor(payment_id), square (nonce), paypal
      // if test gateway selected add necessary card data
      // for the order to be completed.
      if (this.selectedGateway === 'test_gateway') {
        order.payment.card = {
          number: this.card.number,
          expiry_month: this.card.expMonth,
          expiry_year: this.card.expYear,
          cvc: this.card.cvc,
          postal_zip_code: this.card.billingPostalZipcode,
        };
      }
      return this.$commerce.checkout.capture(this.checkout.id, order)
        .then(resp => {
          // reset checkout, and set global order-receipt state
          // alias event
          this.$emit('order:success', resp);
          return resp;
        }).catch(error => {
          this.$emit('order:error', error);
          console.log('error while attempting to capture order, emitted error with order:error');
          throw error;
        });
    },
    /**
     * callback passed to slot to allow
     * mutating of this component's data
     * without mutating slot props
     */
    updateData(propertyName, value) {
      if (!propertyName) return;
      const splitPropertyName = propertyName.split('.');
      // as of now $data structure is only one level deep and
      // and not configurable, so only check if there's
      // nested property by checking if splitPropertyName is
      // greater than 1
      if (splitPropertyName.length > 1) {
        this.$data[splitPropertyName[0]][splitPropertyName[1]] = value;
        return;
      }
      this.$data[propertyName] = value;
    },
    /**
     * generate checkout token
     */
    generateCheckoutToken() {
      this.selectedShippingMethod = '';
      return this.$commerce.checkout.generateToken(this.identifierId, { type: this.identifierType })
        .then(checkout => {
          // reset currently selected shipping method as it may not be accurate now that shipping options
          // will be fetched below based of new generated checkout.id
          this.getShippingOptionsForCheckout(checkout.id, this.shipping.country, this.shipping.countyState);
          return checkout;
        })
        .catch(error => {
          // eslint-disable-next-line no-console
          this.selectedShippingMethod = '';
          this.shippingOptions = [];
          this.emitUpdateCheckout({});
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
        .catch(error => {
          this.shippingOptions = [];
          console.log('ERROR: error while fetching shipping options for checkout', error);
        });
    },
    // Validates a shipping method for the
    // provided checkout token, returning checkout.live object if valid, and applies it to the checkout.
    validateAndSetShippingOptionInCheckout(checkoutId, shippingOptionId, country, region) {
      return this.$commerce.checkout.checkShippingOption(checkoutId, {
        shipping_option_id: shippingOptionId,
        country,
        region,
      }).then(resp => {
        if (resp.valid) {
          this.emitUpdateCheckout({ ...this.checkout, live: resp.live });
        }
      }).catch(error => {
        console.log('error while attempting to update live object with selected shipping option');
        throw error;
      });
    },
  },
};
</script>
