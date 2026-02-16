// src/pages/Admin_menu.tsx
import React, { useEffect, useState } from "react";
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonMenu,
  IonMenuButton,
  IonMenuToggle,
  IonPage,
  IonSplitPane,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useHistory } from "react-router-dom";

/* ✅ keep supabase client (NOT removed) */
import { supabase } from "../utils/supabaseClient";

/* ✅ only page import */
import AdminDashboard from "./AdminDashboard";

type MenuItem = {
  name: string;
  key: "dashboard";
};

const Admin_menu: React.FC = () => {
  const history = useHistory();
  const [activePage, setActivePage] = useState<MenuItem["key"]>("dashboard");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) history.replace("/admin");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const menuItems: MenuItem[] = [{ name: "Dashboard", key: "dashboard" }];

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
      default:
        return <AdminDashboard />;
    }
  };

  const handleLogout = async (): Promise<void> => {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    history.replace("/admin");
  };

  return (
    <IonPage className="admin-shell-page">
      <IonSplitPane contentId="admin-main" when="(min-width: 768px)">
        {/* SIDEBAR */}
        <IonMenu contentId="admin-main" className="admin-menu">
          <IonHeader>
            <IonToolbar>
              <IonTitle>Admin Menu</IonTitle>
            </IonToolbar>
          </IonHeader>

          <IonContent>
            {menuItems.map((item) => (
              <IonMenuToggle key={item.key} autoHide={false}>
                <IonItem
                  button
                  lines="none"
                  className={activePage === item.key ? "admin-menu-item active" : "admin-menu-item"}
                  onClick={() => setActivePage(item.key)}
                >
                  {item.name}
                </IonItem>
              </IonMenuToggle>
            ))}

            <IonMenuToggle autoHide={false}>
              <IonItem button lines="none" className="admin-menu-item logout" onClick={() => void handleLogout()}>
                Logout
              </IonItem>
            </IonMenuToggle>
          </IonContent>
        </IonMenu>

        {/* MAIN */}
        <div id="admin-main" className="admin-main-shell">
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonMenuButton />
              </IonButtons>
              <IonTitle>Admin</IonTitle>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">{renderContent()}</IonContent>
        </div>
      </IonSplitPane>
    </IonPage>
  );
};

export default Admin_menu;
