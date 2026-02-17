// src/pages/Home.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonModal,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  IonIcon,
} from "@ionic/react";
import { closeOutline } from "ionicons/icons";
import { useHistory } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../utils/supabaseClient";

type Person = {
  id: string;
  full_name: string;
  age: number | null;
  sex: string | null;
  image_url: string | null;
  qr_value: string;
};

const Home: React.FC = () => {
  const history = useHistory();

  const scannerRef = useRef<Html5Qrcode | null>(null);

  // ✅ prevents multiple records
  const scanLockRef = useRef(false);

  // ✅ optional extra safety (ignore same QR within 2 seconds)
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);

  const [running, setRunning] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [msg, setMsg] = useState<string>("");
  const [lastPerson, setLastPerson] = useState<Person | null>(null);

  const readerId = useMemo(() => "qr-reader", []);

  // Ensure anonymous session exists (scanner mode)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          const { error } = await supabase.auth.signInAnonymously();
          if (error) setMsg(error.message);
        }
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Failed to init session");
      }
    })();
  }, []);

  const stop = async (): Promise<void> => {
    const inst = scannerRef.current;

    try {
      if (inst) {
        await inst.stop();
        await inst.clear();
      }
    } catch {
      // ignore
    }

    scannerRef.current = null;
    scanLockRef.current = false;
    lastScanRef.current = null;
    setRunning(false);
    setScannerOpen(false);
  };

  const handleScan = async (qrValue: string): Promise<void> => {
    setMsg("Checking...");
    setLastPerson(null);

    try {
      const { data: person, error: pErr } = await supabase
        .from("attendance_people")
        .select("id, full_name, age, sex, image_url, qr_value")
        .eq("qr_value", qrValue)
        .maybeSingle<Person>();

      if (pErr || !person) {
        setMsg("QR not found in database.");
        return;
      }

      const { data: sess } = await supabase.auth.getSession();
      const scannedBy = sess.session?.user?.id ?? null;

      const { error: lErr } = await supabase.from("attendance_logs").insert({
        person_id: person.id,
        scanned_by: scannedBy,
        device_note: "laptop/webcam",
      });

      if (lErr) {
        setMsg(lErr.message || "Failed to save attendance. Try again.");
        return;
      }

      setLastPerson(person);
      setMsg(`Attendance saved for: ${person.full_name}`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Scan failed.");
    }
  };

  const start = async (): Promise<void> => {
    setMsg("");
    setLastPerson(null);

    scanLockRef.current = false;
    lastScanRef.current = null;

    setScannerOpen(true);

    setTimeout(async () => {
      if (running || scannerRef.current) return;

      try {
        const qr = new Html5Qrcode(readerId);
        scannerRef.current = qr;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const onScanFailure = (_errorMessage: string): void => {
          // ignore
        };

        await qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          async (decodedText: string) => {
            const value = decodedText.trim();
            if (!value) return;

            if (scanLockRef.current) return;

            const now = Date.now();
            if (
              lastScanRef.current?.value === value &&
              now - lastScanRef.current.at < 2000
            ) {
              return;
            }

            scanLockRef.current = true;
            lastScanRef.current = { value, at: now };

            try {
              await qr.stop();
              await qr.clear();
            } catch {
              // ignore
            }

            scannerRef.current = null;
            setRunning(false);
            setScannerOpen(false);

            await handleScan(value);
          },
          onScanFailure
        );

        setRunning(true);
      } catch (err) {
        scannerRef.current = null;
        setRunning(false);
        setScannerOpen(false);
        setMsg(
          err instanceof Error
            ? err.message
            : "Camera blocked / not found. Please allow camera permission."
        );
      }
    }, 120);
  };

  // ✅ IMPORTANT FIX:
  // When going to admin login, remove anon session first so it won't auto redirect.
  const goAdminLogin = async (): Promise<void> => {
    setMsg("");
    await stop(); // stop camera if open
    await supabase.auth.signOut(); // ✅ remove anon session
    history.push("/admin"); // go login form
  };

  useEffect(() => {
    return () => {
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <IonPage className="scanner-page-white">
      <IonHeader>
        <IonToolbar className="scanner-toolbar-white">
          <IonTitle>Attendance Scanner</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="scanner-wrap">
          <div className="scanner-card">
            <IonButton
              expand="block"
              className="btn-green"
              onClick={() => void goAdminLogin()}  // ✅ FIXED
              disabled={running || scannerOpen}    // optional safety
            >
              Admin Login
            </IonButton>

            <IonButton
              expand="block"
              className="btn-green"
              onClick={start}
              disabled={running || scannerOpen}
            >
              Scan to Attendance
            </IonButton>

            {msg ? (
              <IonText className="scanner-message-white">
                <p>{msg}</p>
              </IonText>
            ) : null}

            {lastPerson ? (
              <IonText className="last-person-white">
                <p>
                  <b>Last:</b> {lastPerson.full_name} ({lastPerson.sex ?? "N/A"}
                  , {lastPerson.age ?? "N/A"})
                </p>
              </IonText>
            ) : null}
          </div>
        </div>

        <IonModal
          isOpen={scannerOpen}
          onDidDismiss={() => void stop()}
          className="scanner-modal"
        >
          <IonHeader>
            <IonToolbar className="scanner-toolbar-white">
              <IonTitle>Scan QR</IonTitle>
              <IonButton slot="end" fill="clear" onClick={() => void stop()}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonToolbar>
          </IonHeader>

          <IonContent className="ion-padding">
            <div className="modal-scan-wrap">
              <div className="qr-box-white">
                <div id={readerId} className="qr-container-white" />
              </div>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Home;
