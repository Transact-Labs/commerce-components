<template>
  <div class="cjs-flex cjs-flex-col">
    Commerce.js x Vue.js !
    <br />
    <br />
    Cart :
    <br />
    <code>{{ JSON.stringify(cart, null, 2)}}</code>
    <br />
    <br />
    <br />
    Cart actions:
    <button @click="() => addToCart(0)">Add first product to cart</button> --
    <button @click="() => removeFromCart(0)">Remove first  product from cart</button>
    <br />

    Checkout:
    <div class="cjs-flex cjs-bg-gray-200 cjs-w-full">
      <ChecPaymentForm
        class="cjs-w-full cjs-max-w-md cjs-mx-auto"
        :identifierId="cart.id"
        :checkout.sync="checkout"
        :context.sync="formData"
        @order:error="handleCaptureOrderErrors"
        v-slot="{ countries, subdivisions, shippingOptions, shippingOptionsById, captureOrder }"
      >
        <!-- <select
          name="shippingMethod"
          v-model="formData.selectedShippingMethod">
          <option value="" disabled selected>Select a shipping method</option>
          <option v-for="option in shippingOptions" :value="option.id" :key="option.id">
            {{ `${option.description || ''} $${option.price.formatted_with_code}` }}
          </option>
        </select> -->
        <input type="email" placeholder="Enter your email" v-model="formData.customer.email" />
        <div class="cjs-w-full" id="card-element">
          <!-- a Stripe Element will be inserted here. -->
        </div>
        <button @click="customCaptureOrder(captureOrder)">
          make a payment
        </button>
      </ChecPaymentForm>
    </div>
  </div>
</template>
<script>
// eslint-disable-next-line import/no-extraneous-dependencies
import { loadStripe } from '@stripe/stripe-js';

export default {
  name: 'app',
  mounted() {
    // Create a Stripe client
    loadStripe(process.env.VUE_APP_STRIPE_KEY).then((stripe) => {
      this.$stripe = stripe;
      // Create an instance of Elements
      const elements = stripe.elements();

      // Custom styling can be passed to options when creating an Element.
      // (Note that this demo uses a wider set of styles than the guide below.)
      const style = {
        base: {
          color: '#32325d',
          lineHeight: '18px',
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
          fontSmoothing: 'antialiased',
          fontSize: '16px',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
        invalid: {
          color: '#fa755a',
          iconColor: '#fa755a',
        },
      };

      // Create an instance of the card Element
      this.$stripeCard = elements.create('card', { style });

      // Add an instance of the card Element into the `card-element` <div>
      this.$stripeCard.mount('#card-element');
    });
  },
  created() {
    // retrieve cart
    this.$commerce.cart.retrieve().then(cart => {
      this.cart = cart;
    }).catch(error => {
      // eslint-disable-next-line no-console
      console.log('There was an error retrieving the cart', error);
    });

    // get products from store
    this.$commerce.products.list().then(({ data = [] }) => {
      this.products = data;
    });
  },
  data: () => ({
    toggleTest: false,

    cart: {},
    products: [],

    formData: {},
    checkout: {},

    errors: {},
  }),
  methods: {
    /**
     * custom captureOrder method
     */
    customCaptureOrder(captureOrderCallBack) {
      this.$stripe.createToken(this.$stripeCard)
        .then((result) => {
          if (result.error) {
            throw result.error;
          } else {
            this.formData.card.token = result.token.id;
            // Send the token to your server
            return captureOrderCallBack();
          }
        })
        .then(resp => {
          console.log('💸💸 YAY ORDER SUCCESSFUL!', resp);
        })
        .catch(error => {
          // eslint-disable-next-line no-alert
          console.log('😢 could not capture order', error);
        });
    },
    /* everything here is just a min. working example,
not best implementation */
    removeFromCart(index) {
      this.$commerce.cart.remove(this.cart.line_items[index].id).then(({ cart }) => {
        this.cart = cart;
      });
    },
    // eslint-disable-next-line no-unused-vars
    handleCaptureOrderErrors(error) {
      // eslint-disable-next-line no-alert
      alert(`alerting checkout errors from event order:error ${JSON.stringify(error)}`);
    },
    addToCart(index) {
      this.$commerce.cart.add(this.products[index].id).then(({ cart }) => {
        this.cart = cart;
      });
    },
  },
};
</script>
