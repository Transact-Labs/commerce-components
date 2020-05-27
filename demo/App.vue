/* eslint-disable no-alert */
<template>
  <div class="cjs-flex cjs-flex-col">
    Commerce.js x Vue.js !
    Cart :
    <br />
    <code>{{ JSON.stringify(cart, null, 2)}}</code>
    <br />
    <button @click="() => addToCart(0)">Add first product to cart</button> --
    <button @click="() => removeFromCart(0)">Remove first  product from cart</button>
    <br />
    <button @click="() => addToCart(1)">Add second  product to cart</button> --
    <button @click="() => removeFromCart(1)">Remove second  product from cart</button>
    <br />
    <div class="cjs-flex cjs-bg-gray-200 cjs-w-full">
      <ChecPaymentForm
        :identifierId="cart.id"
        :checkout.sync="$data.checkoutTokenObject"
        :context.sync="$data.formData"
        useTestGateway
        @order:error="handleCaptureOrderErrors"
        v-slot="{ countries, subdivisions, shippingOptions, shippingOptionsById, captureOrder }"
      >
        <input type="text" v-model="formData.customer.firstName" />
        <!-- <select
          name="shippingMethod"
          :value="selectedShippingMethod"
          @change="e => updateData('selectedShippingMethod', e.target.value)">
          <option value="" disabled selected>Select a shipping method</option>
          <option v-for="option in shippingOptions" :value="option.id" :key="option.id">
            {{ `${option.description || ''} $${option.price.formatted_with_code}` }}
          </option>
        </select>-->

        <button @click="customCaptureOrder(captureOrder)">
          make a payment
        </button>
      </ChecPaymentForm>
      <br />
      <!-- <p>
        "the checkout is"
        {{
          JSON.stringify(checkoutTokenObject, null, 2)
        }}
      </p> -->
    </div>
  </div>
</template>
<script>
export default {
  name: 'app',
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

    debugger;
  },
  data: () => ({
    toggleTest: false,

    cart: {},
    products: [],

    formData: {},
    checkoutTokenObject: {},

    errors: {},
  }),
  methods: {
    /**
     * custom captureOrder method
     */
    customCaptureOrder(captureOrderCallBack) {
      // can handle successful response from order capture as resolved value from returned Promise
      // or on <PaymentForm>'s @order:success event
      // can also handle error response from capture order attempt here or on <PaymentForm>'s @order:error
      // event e.g. v-on:order:error="(error) => error"
      captureOrderCallBack()
        .then(resp => {
          console.log('💸💸 YAY ORDER SUCCESSFUL!', resp);
        })
        .catch(({ data: { error = {} } }) => {
          let errorToAlert = '';
          if (error.type === 'validation') {
            console.log('error while capturing order', error.message);

            error.message.forEach(({ param, _error }) => {
              this.errors = {
                ...this.errors,
                [param]: _error,
              };
            });

            errorToAlert = error.message.reduce((string, __error) => `${string} ${__error.error}`, '');
          }

          if (error.type === 'gateway_error' || error.type === 'not_valid' || error.type === 'bad_request') {
            this.errors = {
              ...this.errors,
              [(error.type === 'not_valid' ? 'fulfillment[shipping_method]' : error.type)]: error.message,
            };
            errorToAlert = error.message;
          }
          if (errorToAlert) {
            // eslint-disable-next-line no-alert
            alert(errorToAlert);
          }
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
