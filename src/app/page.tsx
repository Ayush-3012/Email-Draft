"use client";

import { FormEvent, useState } from "react";
import styles from "./page.module.css";

type EmailItem = {
  subject: string;
  body: string;
};

type ApiResponse = {
  emails?: EmailItem[];
  message?: string;
};

const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL ?? "YOUR_WEBHOOK_URL";

export default function Home() {
  const [url, setUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!url.trim()) {
      setError("Please enter website URL.");
      return;
    }

    if (WEBHOOK_URL === "YOUR_WEBHOOK_URL") {
      setError("Set NEXT_PUBLIC_WEBHOOK_URL in .env.local first.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url.trim(),
          company_name: companyName.trim(),
          notes: notes.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = (await res.json()) as ApiResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Email Generator</h1>

        <form className={styles.form} onSubmit={handleGenerate}>
          <div className={styles.topRow}>
            <input
              className={styles.input}
              placeholder="Enter website URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />

            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate Emails"}
            </button>
          </div>

          <input
            className={styles.input}
            placeholder="Company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />

          <textarea
            className={`${styles.input} ${styles.textarea}`}
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </form>

        {error ? <p className={styles.error}>{error}</p> : null}

        <section className={styles.result}>
          {result?.emails?.map((email, index) => (
            <article key={`${email.subject}-${index}`} className={styles.card}>
              <h3>{email.subject}</h3>
              <p>{email.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
