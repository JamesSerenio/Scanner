import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
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

  const [running, setRunning] = useState(false);
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
    if (!inst) {
      setRunning(false);
      return;
    }

    try {
      await inst.stop();
    } catch (err) {
      console.log("stop error:", err);
    }

    try {
      await inst.clear();
    } catch (err) {
      console.log("clear error:", err);
    }

    scannerRef.current = null;
    setRunning(false);
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
        setMsg("Failed to save attendance. Try again.");
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

    if (running) return;

    try {
      const qr = new Html5Qrcode(readerId);
      scannerRef.current = qr;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const onScanFailure = (_errorMessage: string): void => {
        // ignore per-frame decode errors
      };

      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText: string) => {
          const value = decodedText.trim();
          if (!value) return;

          await handleScan(value);
          await stop(); // auto-stop after 1 successful scan
        },
        onScanFailure
      );

      setRunning(true);
    } catch (err) {
      scannerRef.current = null;
      setRunning(false);
      setMsg(
        err instanceof Error
          ? err.message
          : "Camera blocked / not found. Please allow camera permission."
      );
    }
  };

  useEffect(() => {
    return () => {
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <IonPage className="scanner-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Attendance Scanner</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding scanner-content">
        <IonButton
          expand="block"
          fill="outline"
          className="admin-login-btn"
          onClick={() => history.push("/admin")}
        >
          Admin Login
        </IonButton>

        <div style={{ height: 12 }} />

        <IonButton
          expand="block"
          className="scan-btn"
          onClick={running ? stop : start}
        >
          {running ? "Stop Scanning" : "Scan to Attendance"}
        </IonButton>

        <div style={{ height: 12 }} />

        <div id={readerId} className="qr-container" />

        {msg ? (
          <IonText className="scanner-message">
            <p>{msg}</p>
          </IonText>
        ) : null}

        {lastPerson ? (
          <IonText className="last-person-card">
            <p>
              <b>Last:</b> {lastPerson.full_name} ({lastPerson.sex ?? "N/A"},{" "}
              {lastPerson.age ?? "N/A"})
            </p>
          </IonText>
        ) : null}
      </IonContent>
    </IonPage>
  );
};

export default Home;
