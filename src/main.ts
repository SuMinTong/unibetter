import { createSSRApp } from "vue";
import App from "./App.vue";
import 'uno.css'
import store from './stores'
export function createApp() {
  const app = createSSRApp(App);
  app.use(store)
  return {
    app,
  };
}
