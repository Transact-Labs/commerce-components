<!-- Payment-form, encapsulates shipping/billing and payment form details-->
<template>
  <form @submit.prevent :class="{ 'chec-form--default-mode cjs-space-y-4': !$scopedSlots.default }">
      <!--
        Two UI template Modes
        custom(slot) mode, default mode
        - custom mode is enabled by providing a default slot,
        the slotProps consist of this component $data, and a callback
        updateData expecting a dot-delimited property name, and value
        to update property with. for example this.$data.shipping.name/slotProps.shipping.name can be updated by
        slotProps.updateDate('shipping.name', 'john doe');
        - TODO: default mode where inputs are rendered as such by this component,
        default classes are rendered, unless given custom class for respective indivial input element.
        useful for quick developing with tailwind classes
          - add labels in default mode post-mvp/mwe
      -->
        <slot
          v-bind="$data"
          :shippingOptionsById="shippingOptionsById"
          :captureOrder="handleInvokingCaptureOrderIfCheckoutGenerated()"
        >
          <template v-if="checkout && checkout.collects && checkout.collects.shipping_address">
            <input
              class=""
              placeholder="Shipping name"
              type="text"
            >
            <input placeholder="Shipping street" type="text">
            <input placeholder="Shipping street2" type="text">
            <input placeholder="Shipping City" type="text">
            <input placeholder="Shipping Zip Code" type="text">
          </template>
          <button
            :disabled="$_isEmpty(checkout) || checkout.line_items[0].length"
            :class="{ 'cjs-opacity-50 cjs-cursor-not-allowed': ($_isEmpty(checkout) || checkout.line_items[0].length)}"
            class="cjs-w-full cjs-bg-green-600 cjs-rounded cjs-shadow cjs-text-white cjs-p-2 cjs-font-lato">
            checkout
          </button>
        </slot>
  </form>
</template>
<script>
import _isEmpty from 'lodash.isempty';

export default {
  name: 'PaymentForm',
  data() {
    return {
      countries: {},
      subdivisions: {},
      billingSubdivisions: {},
      shippingOptions: [],
    };
  },
  props: {
    useTestGateway: {
      type: Boolean,
      default: false,
    },
    /**
     * synced form data (.sync) looks like this.$formDataSchema
     * // TODO: validate, if not Object this currently breaks initialization of payment-form
     */
    context: {
      type: Object,
      default: () => ({}),
    },
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
  beforeCreate() {
    this.$_isEmpty = _isEmpty;
    this.$formDataSchema = {
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
        token: null,
        nonce: null,
        razorpay: {
          payment_id: null,
        },
      },
      pay_what_you_want: null,
      selectedGateway: '', // if dev. mode, set dev friendly defaults
    };
  },
  created() {
    if (!this.$commerce) {
      throw Error('Could not detect Commerce.js within <PaymentForm>');
    }
    this.emitUpdateFormData({
      ...this.$formDataSchema,
      ...this.context,
    }); // handles for remounting after already scaffolded and sync. form-data prop
    this.getAllCountries();
    // utilize emitted Commerce.js Cart Events
    // Cart.Item.Added, Cart.Item.Updated, Cart.Item.Removed, Cart.Deleted, Cart.Emptied
    // to omit need of cart data being passed via prop by consumer
    // https://github.com/chec/commerce.js/blob/4cb95203f996d6ece46f622c57bc1bc6d0de25e6/src/commerce.js#L7
    // TODO: consider later on not generating a new checkout, with generateCheckouttoken
    // on cart events that aren't cart.emptied, cart.deleted,
    // and instead utilize $commerce.checkout.getToken to get updated existing token
    window.addEventListener(
      'Commercejs.Cart.Item.Added',
      () => this.generateCheckoutToken()
        .then(checkout => this.emitUpdateCheckout(checkout)),
    );
    window.addEventListener(
      'Commercejs.Cart.Item.Updated',
      () => this.generateCheckoutToken()
        .then(checkout => this.emitUpdateCheckout(checkout)),
    );
    window.addEventListener(
      'Commercejs.Cart.Item.Removed',
      () => this.generateCheckoutToken()
        .then(checkout => this.emitUpdateCheckout(checkout)),
    );
    window.addEventListener(
      'Commercejs.Cart.Deleted',
      () => this.generateCheckoutToken()
        .then(checkout => this.emitUpdateCheckout(checkout)),
    );
    window.addEventListener(
      'Commercejs.Cart.Emptied',
      () => this.generateCheckoutToken()
        .then(checkout => this.emitUpdateCheckout(checkout)),
    );
  },
  computed: {
    shippingOptionsById() {
      return this.shippingOptions.reduce((obj, option) => {
        // eslint-disable-next-line no-param-reassign
        obj[option.id] = option;
        return obj;
      }, {});
    },
    contextShippingCountry() {
      return this.context.shipping ? this.context.shipping.country || '' : '';
    },
    contextShippingCountyState() {
      return this.context.shipping ? this.context.shipping.countyState || '' : '';
    },
    contextBillingCountry() {
      return this.context.billing ? this.context.billing.country || '' : '';
    },
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
            .catch(e => e);
        }
      },
      immediate: true,
    },
    contextShippingCountry: {
      handler(val, oldVal) {
        if (oldVal !== val) {
          // eslint-disable-next-line no-unused-vars
          const testing = this.$formDataSchema;
          this.emitUpdateFormData({
            ...this.context, // TODO: find fix, if null at any point will break
            shipping: {
              ...(this.context.shipping || this.$formDataSchema.shipping), // prevent undefined spread
              countyState: '',
            },
          });
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
    contextShippingCountyState(val, oldVal) {
      if (oldVal !== val) {
        if (!_isEmpty(this.checkout)) {
          this.generateCheckoutToken()
            .then(checkout => this.emitUpdateCheckout(checkout));
        }
      }
    },
    contextBillingCountry: {
      handler(val, oldVal) {
        if (oldVal !== val) {
          this.emitUpdateFormData({
            ...this.context,
            billing: {
              ...(this.context.billing || this.$formDataSchema.billing), // prevent undefined spread
              countyState: '',
            },
          });
        }
        // update the regions/provinces/states that are based on the selected delivery country (this.deliveryCountry)
        this.getBillingRegions(val);
      },
      immediate: true,
    },
    selectedShippingMethod: function handler(val, oldVal) {
      if (oldVal !== val) {
        this.validateAndSetShippingOptionInCheckout(
          this.checkout.id,
          this.context.selectedShippingMethod,
          this.context.shipping ? this.context.shipping.country : '',
          this.context.shipping ? this.context.shipping.countyState : '',
        ).catch(this.generateCheckoutToken);
      }
    },
  },
  methods: {
    handleInvokingCaptureOrderIfCheckoutGenerated() {
      return this.$_isEmpty(this.checkout)
        ? () => Promise.reject(new Error('Attempted to capture order before the checkout could be generated'))
        : this.captureOrder;
    },
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
    captureOrder() {
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
      const {
        customer = this.$formDataSchema.customer,
        shipping = this.$formDataSchema.shipping,
        card = this.$formDataSchema.card,
        selectedShippingMethod = '',
        selectedGateway = this.$formDataSchema.selectedGateway,
      } = this.context;
      const order = {
        line_items: lineItems,
        customer: {
          firstname: customer.firstName,
          lastname: customer.lastName,
          email: customer.email,
        },
        shipping: {
          name: shipping.name,
          country: shipping.country,
          street: shipping.street + shipping.street2,
          town_city: shipping.townCity,
          county_state: shipping.countyState,
          postal_zip_code: shipping.postalZipCode,
        },
        fulfillment: {
          shipping_method: selectedShippingMethod,
        },
        payment: {
          gateway: (() => {
            if (card && card.token) {
              return 'stripe';
            }
            return this.useTestGateway ? 'test_gateway' : selectedGateway;
          })(),
          card: (() => {
            if (!card) {
              return {};
            }
            if (card.token) {
              return { token: card.token };
            }
            if (card.nonce) {
              return { nonce: card.nonce };
            }
            return {};
          })(),
          razorpay: (() => {
            if (card && card.razorpay && card.razorpay.payment_id) {
              return card.razorpay;
            }
            return undefined;
          })(),
        },
        pay_what_you_want: (this.checkout.conditionals || null) && this.checkout.conditionals.pay_what_you_want,
      };

      // TODO: for mvp only support test_gateay, ideally stripe(token), razor(payment_id), square (nonce), paypal
      // if test gateway selected add necessary card data
      // for the order to be completed.
      if (order.payment.gateway === 'test_gateway') {
        order.payment.card = {
          number: card.number,
          expiry_month: card.expMonth,
          expiry_year: card.expYear,
          cvc: card.cvc,
          postal_zip_code: card.billingPostalZipcode,
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
      this.emitUpdateFormData({
        ...this.context,
        selectedShippingMethod: '',
      });
      return this.$commerce.checkout.generateToken(this.identifierId, { type: this.identifierType })
        .then(checkout => {
          // reset currently selected shipping method as it may not be accurate now that shipping options
          // will be fetched below based of new generated checkout.id
          this.getShippingOptionsForCheckout(
            checkout.id,
            this.context.shipping ? this.context.shipping.country : '',
            this.context.shipping ? this.context.shipping.countyState : '',
          );
          return checkout;
        })
        .catch(error => {
          // eslint-disable-next-line no-console
          this.emitUpdateFormData({
            ...this.context,
            selectedShippingMethod: '',
          });
          this.shippingOptions = [];
          this.emitUpdateCheckout({});
          console.log('ERROR: GENERATING CHECKOUT TOKEN', error);
          throw error;
        });
    },
    /**
     * emit update:data event, for .sync modifier to work
     */
    emitUpdateFormData(data) {
      this.$emit('update:context', data);
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
<style lang="scss">
  .chec-form {
    &--default-mode {
      input {
        @apply cjs-w-full cjs-shadow cjs-appearance-none cjs-border cjs-rounded cjs-py-2 cjs-px-3;
      }
    }
  }
</style>
