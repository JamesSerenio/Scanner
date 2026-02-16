// src/App.tsx
import { Redirect, Route } from "react-router-dom";
import { IonApp, IonRouterOutlet, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";

import Home from "./pages/Home";
import AdminLogin from "./pages/AdminLogin";
import Admin_menu from "./pages/Admin_menu";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

import "./global.css";

/* Ionic Dark Mode */
import "@ionic/react/css/palettes/dark.system.css";

/* Theme variables */
import "./theme/variables.css";

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        {/* Scanner (anon) */}
        <Route exact path="/home">
          <Home />
        </Route>

        {/* Admin login */}
        <Route exact path="/admin">
          <AdminLogin />
        </Route>

        {/* Admin shell/menu (contains AdminDashboard inside) */}
        <Route path="/admin/dashboard">
          <Admin_menu />
        </Route>

        {/* default */}
        <Route exact path="/">
          <Redirect to="/home" />
        </Route>

        {/* fallback */}
        <Route>
          <Redirect to="/home" />
        </Route>
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
);

export default App;
