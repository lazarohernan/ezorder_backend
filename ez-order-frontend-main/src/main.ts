import './assets/main.css';

import { createApp, type App as VueApp } from 'vue';
import { createPinia } from 'pinia';
import { nextTick } from 'vue';
import type { PluginOptions } from 'vue-toastification';
import Toast, { POSITION } from 'vue-toastification';
import 'vue-toastification/dist/index.css';

import App from './App.vue';
import router from './router';
import permissionsPlugin from './plugins/permissions';
import { setToastInstance, setAppInstance } from './utils/toast';

const app = createApp(App);

const options: PluginOptions = {
  position: POSITION.BOTTOM_LEFT,
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

// Almacenar la instancia de la app antes del mount
setAppInstance(app);

// Almacenar la instancia del toast después de que se inicialice
app.mount('#app');

// Establecer la instancia del toast después del mount usando nextTick
nextTick(() => {
  const toast = app.config.globalProperties.$toast;
  if (toast) {
    setToastInstance(toast);
  }
});
