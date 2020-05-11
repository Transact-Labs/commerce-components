import Commerce from '@chec/commerce.js';

export default function install(Vue, options) {
  if (!options || !options.commercejsPublicKey) {
    throw Error('You must provide a public Commerce.js API key for the Commerce.js client.');
  }
  Vue.mixin({
    beforeCreate() {
      this.$commerce = new Commerce(
        options.commercejsPublicKey,
        options.isDevMode,
      );
    },
  });
}
