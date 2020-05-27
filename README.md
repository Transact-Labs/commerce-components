# Vue.js Commerce.js helper library with `<chec-payment-form>` component for checkout flow (BETA v0.1.0)

## Installing package

You can use either `yarn` or `npm` to install the `commerce-components` package and it's dependencies from this Github repo.

Clone this repo then ...

### with yarn
```sh
yarn add path-to/commerce-components
```

### with npm
```sh
npm install path-to/commerce-components
```

### Easily build a checkout form 

1. Import then install `VueCommerceJs` using `Vue.use()` passing your public `Chec` API key.

    This will 
    - globally register the `<chec-payment-form>` component.
    - instantiate a Commerce.js client assigning it as a global variable `this.$commerce`. (e.g. `this.$commerce.cart.retrieve().then(cart => console.log(cart));` from anywhere)
    ```js
    import VueCommerceJs from '@chec/commerce-components';

    Vue.use(VueCommercejs, { 
      commercejsPublicKey: process.env.VUE_APP_COMMERCEJS_PUBLIC_KEY 
    });

    new Vue({
        render: h => h(App),
    }).$mount('#app');
    ```
2. Implement the `<chec-payment-form>` component synchronizing the `<App>`'s checkout & formData state
    ```html
        <!-- ex: App.vue templae -->
        <template>
            <chec-payment-form
                useTestGateway // forces use of test_gatway when slotProp.captureOrder is called

                :identifierId="cartId"
                indentifierType="cart" // cart by default

                // handles sync. checkout object, and expects checkout value to empty object {}, 
                // it will populate it automatically on mount
                :checkout.sync="checkout"
        
                // handles populating formData object with properties (customer, card, shipping) for form input(s) to bind to with v-model
                // and resets values like formData.selectedShippingMethod on checkout token object change
                :context.sync="formData"
                
                v-slot="{ captureOrder, countries, subregions, shippingOptions, shippingOptionsById }"
            >
                <!-- ^^ the slot props are important for powering dynamic parts of the form, it provides the countries, subregions, and shippingOptions list,
                a computed shippingOptionsById object, 
                and a captureOrder callback method to invoke on submit-->

                <input type="text" v-model="formData.customer.firstName" />
                
                <input type="number" v-model="formData.card.number" />

                <!-- invoke captureOrder slot-prop callback within method to handle promise, resolving with response from capture-order request -->
                <button @click="() => handleCallCaptureOrderCallBack(captureOrder)">
            </chec-payment-form> 
        </template>
    ```
    ```js
    // in App.vue (example)
    // to keep it simple let's quickly in `created()` hook in any abritrary component retrieve a cart, setting it on state
    export default {
    name: 'app',
    created() {
        // retrieve cart, then list of products, and then add first product to cart
        this.$commerce.cart.retrieve().then(cart => {
            this.cartId = cart.id;
            this.$commerce.products.list().then(({ products }) => {
                this.$commerce.cart.add(products[0].id);
            });
        })
    },
    data: () => ({
        // when <chec-payment-form> is mounted and created this formData will be transformed into the proper formData schema with properties 
        /* 
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
        selectedGateway: ''

        card: {
            number: '', // if dev. mode, set dev friendly defaults
            expMonth: '',
            expYear: '',
            cvc: '',
            billingPostalZipcode: '',
        },
        */
       // (Note, must be passed to form as <chec-payment-form :context.sync="formData"/>)
        formData: {}, // 'formData' is an arbitrary property name, it can be any name so long it gets passed as the context.sync prop to <chec-payment-form> for it to be set-up if using slot.captureOrder
        
        // checkout token object, populated when <chec-payment-form> mounts and generates token, will be updated, and continuesly sync. with chec-payment-form (Note, must be passed to form as <chec-payment-form :checkout.sync="checkoutTokenObject"/>)
        checkout: {},

        cartId: '',
    }),
    methods: {
        /**
        * custom captureOrder method
        */
        handleCallCaptureOrderCallBack(captureOrderCallBack) {
            captureOrderCallBack()
                .then(resp => {
                    // can also handle successful resp by listening to, order:success, event on <chec-payment-form>
                    // https://commercejs.com/docs/api/?javascript--cjs#capture-order
                    console.log('💸💸 YAY ORDER SUCCESSFUL!', resp);
                })
                .catch((error => {
                    // handle error from #capture-order request
                    // can also handle error by listening to, order:error, event on <chec-payment-form>
                });
        },
    },
    };
    ```
## Spin up the demo

### Git clone this repo then `cd` into the directory 
```
cd commerce-components
```

### Install all the dependencies
```
yarn install
```

### Compile and minify a build of package then serves demo on localhost:7777
```
yarn build-lib && yarn demo:serve
```

### Play with the demo on http://localhost:7777/,
besure to create an `.env` while with your Chec public `API` key for the demo app to fully work.
```
    VUE_APP_COMMERCEJS_PUBLIC_KEY=/* https://chec.io public API key */
```

