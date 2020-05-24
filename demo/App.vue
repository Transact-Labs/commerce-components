<template>
  <div class="flex flex-col">
    Commerce.js x Vue.js !
    Cart :
    <br />
    <code>{{ JSON.stringify(cart, null, 2)}}</code>
    <br />
    <button @click="() => addToCart(0)">Add first product to cart</button>
    <br />
    <button @click="() => addToCart(1)">Add second  product to cart</button>
    <br />
    <div>
    <ChecPaymentForm
      defaultDeliveryCountry="US"
      defaultDeliveryRegion="FL"
      :identifierId="cart.id"
      :checkout.sync="checkoutTokenObject"
    />
    <br />
    <p>
      "the checkout is"
      {{
        JSON.stringify(checkoutTokenObject, null, 2)
      }}
    </p>
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

    // get single product from store
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
    addToCart(index) {
      this.$commerce.cart.add(this.products[index].id).then(({ cart }) => {
        this.cart = cart;
      });
    },
  },
};
</script>
