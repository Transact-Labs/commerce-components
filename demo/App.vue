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
        defaultDeliveryCountry="US"
        defaultDeliveryRegion="FL"
        :identifierId="cart.id"
        :checkout.sync="checkoutTokenObject"

        @order:error="handleCaptureOrderErrors"
      >
        <!-- <select
          name="shippingMethod"
          :value="selectedShippingMethod"
          @change="e => updateData('selectedShippingMethod', e.target.value)">
          <option value="" disabled selected>Select a shipping method</option>
          <option v-for="option in shippingOptions" :value="option.id" :key="option.id">
            {{ `${option.description || ''} $${option.price.formatted_with_code}` }}
          </option>
        </select> -->
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
  },
  data: () => ({
    cart: {},
    products: [],
    checkoutTokenObject: {},
  }),
  methods: {
    /* everything here is just a min. working example,
not best implementation */
    removeFromCart(index) {
      this.$commerce.cart.remove(this.cart.line_items[index].id).then(({ cart }) => {
        this.cart = cart;
      });
    },
    // eslint-disable-next-line no-unused-vars
    handleCaptureOrderErrors(error) {
      debugger;
    },
    addToCart(index) {
      this.$commerce.cart.add(this.products[index].id).then(({ cart }) => {
        this.cart = cart;
      });
    },
  },
};
</script>
