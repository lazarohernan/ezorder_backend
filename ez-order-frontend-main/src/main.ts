import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import type { PluginOptions } from 'vue-toastification';
import Toast, { POSITION } from 'vue-toastification';
import 'vue-toastification/dist/index.css';

import App from './App.vue';
import router from './router';
import permissionsPlugin from './plugins/permissions';

const app = createApp(App);

const options: PluginOptions = {
  position: POSITION.TOP_RIGHT,
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: true,
  closeButton: 'button',
  icon: true,
  rtl: false,
};

app.use(createPinia());
app.use(router);
app.use(Toast, options);
app.use(permissionsPlugin);

app.mount('#app');
