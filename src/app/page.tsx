"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

type EmailItem = {
  subject: string;
  body: string;
};

type ApiResponse = {
  emails?: unknown;
  message?: string;
  [key: string]: unknown;
};

const WEBHOOK_URL =
  process.env.NEXT_PUBLIC_WEBHOOK_GENERATE_URL ?? "YOUR_WEBHOOK_URL";

const INDUSTRY_OPTIONS = [
  "CA Firms & Accounting",
  "Real Estate Agencies",
  "Healthcare Clinics & Labs",
  "Recruitment & Staffing Agencies",
  "Logistics & Courier Companies",
  "Law Firms & Legal Consultants",
  "D2C & E-commerce Brands",
  "Hotels & Hospitality SMBs",
  "Financial Advisors & Wealth Managers",
  "EdTech & Coaching Institutes",
  "IT Services & Software Agencies",
  "Manufacturing & Trading SMBs",
  "Insurance Brokers & Agents",
  "Marketing & PR Agencies",
];

function cleanField(value: string): string {
  let out = value
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .trim();

  out = out.replace(/^[\s,{\[]+|[\s,}\]]+$/g, "").trim();

  if (
    (out.startsWith('"') && out.endsWith('"')) ||
    (out.startsWith("'") && out.endsWith("'"))
  ) {
    out = out.slice(1, -1).trim();
  }

  return out;
}

function parseEmailsFromLooseText(input: string): EmailItem[] {
  const text = input.replace(/\r/g, "");
  const chunks = text.split(/["']?subject["']?\s*:\s*/gi).slice(1);
  const parsed: EmailItem[] = [];

  for (const chunk of chunks) {
    if (parsed.length >= 3) {
      break;
    }

    const bodyIdx = chunk.search(/["']?body["']?\s*:\s*/i);
    if (bodyIdx < 0) {
      continue;
    }

    const rawSubject = chunk.slice(0, bodyIdx);
    const bodyPart = chunk.slice(bodyIdx).replace(/["']?body["']?\s*:\s*/i, "");
    const rawBody = bodyPart.split(/\n\s*}\s*,?|}\s*,?|\n\s*]\s*$/)[0];

    const subject = cleanField(rawSubject);
    const body = cleanField(rawBody);

    if (subject && body) {
      parsed.push({ subject, body });
    }
  }

  return parsed;
}

function extractFromArray(items: unknown[]): EmailItem[] {
  return items
    .map((entry) => {
      const item = entry as Partial<EmailItem>;
      return {
        subject: String(item.subject ?? "").trim(),
        body: String(item.body ?? "").trim(),
      };
    })
    .filter((item) => item.subject && item.body)
    .slice(0, 3);
}

function extractEmails(result: ApiResponse | null): EmailItem[] {
  if (!result) {
    return [];
  }

  if (Array.isArray(result.emails)) {
    const direct = extractFromArray(result.emails);

    if (direct.length >= 2) {
      return direct;
    }

    if (direct.length === 1) {
      const nested = parseEmailsFromLooseText(direct[0].body);
      if (nested.length > 0) {
        return nested;
      }
      return direct;
    }
  }

  if (typeof result.emails === "string") {
    const fromEmails = parseEmailsFromLooseText(result.emails);
    if (fromEmails.length > 0) {
      return fromEmails;
    }
  }

  if (typeof result.message === "string") {
    const fromMessage = parseEmailsFromLooseText(result.message);
    if (fromMessage.length > 0) {
      return fromMessage;
    }
  }

  return parseEmailsFromLooseText(JSON.stringify(result)).slice(0, 3);
}

function formatOneEmail(email: EmailItem, index: number): string {
  return `Email ${index + 1}\nSubject: ${email.subject}\n\n${email.body}`;
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export default function Home() {
  const [industry, setIndustry] = useState(INDUSTRY_OPTIONS[0]);
  const [companyName, setCompanyName] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editableEmails, setEditableEmails] = useState<EmailItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const emails = useMemo(() => extractEmails(result), [result]);

  useEffect(() => {
    setEditableEmails(emails);
    setEditingIndex(null);
  }, [emails]);

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
          industry,
          company_name: companyName.trim(),
          url: url.trim(),
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

  const updateEmailField = (
    index: number,
    field: keyof EmailItem,
    value: string,
  ) => {
    setEditableEmails((prev) =>
      prev.map((email, i) =>
        i === index ? { ...email, [field]: value } : email,
      ),
    );
  };

  const copyEmail = async (email: EmailItem, index: number) => {
    await navigator.clipboard.writeText(formatOneEmail(email, index));
  };

  // Send feature is temporarily disabled.
  // const sendEmail = async () => {};

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_82%_85%,#33588a_0%,rgba(51,88,138,0)_40%),linear-gradient(115deg,#221c4e_0%,#030c1a_25%,#020812_100%)] text-slate-200">
      <main className="relative z-10 mx-auto w-full max-w-300 px-4 py-4">
        <header className="mb-4 text-center">
          <h1 className="text-2xl font-extrabold text-slate-100 md:text-3xl">
            Email Drafter <Image src="/logo-2.png" width={100} height={100} alt="Logo" className="inline-block h-10 ml-1 w-16" />
          </h1>
          <p className="text-base text-slate-400 md:text-lg">
            Craft the perfect email for any industry in seconds.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-5 rounded-[20px] border border-[rgba(87,105,131,0.35)] bg-[linear-gradient(120deg,rgba(16,24,39,0.95),rgba(12,26,43,0.88))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)] md:grid-cols-2 md:gap-7 md:p-8">
          <form
            className="pr-0 md:border-r md:border-[rgba(86,100,122,0.35)] md:pr-7"
            onSubmit={handleGenerate}
          >
            <label className="mb-2 block">
              <span className="mb-1 block text-base font-semibold text-slate-400">
                Industry
              </span>
              <select
                className="w-full rounded-[14px] border border-[rgba(35,60,93,0.95)] bg-[#020a15] p-2 text-base text-slate-100 outline-none focus:border-[#4c85ff] focus:shadow-[0_0_0_2px_rgba(76,133,255,0.28)]"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                {INDUSTRY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-2 block">
              <span className="mb-1 block text-base font-semibold text-slate-400">
                Company Name
              </span>
              <input
                className="w-full rounded-[14px] border border-[rgba(35,60,93,0.95)] bg-[#020a15] p-2 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#4c85ff] focus:shadow-[0_0_0_2px_rgba(76,133,255,0.28)]"
                placeholder="e.g. Cult Fit"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </label>

            <label className="mb-2 block">
              <span className="mb-1 block text-base font-semibold text-slate-400">
                Website URL
              </span>
              <input
                className="w-full rounded-[14px] border border-[rgba(35,60,93,0.95)] bg-[#020a15] p-2 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#4c85ff] focus:shadow-[0_0_0_2px_rgba(76,133,255,0.28)]"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </label>

            <label className="mb-2 block">
              <span className="mb-1 block text-base font-semibold text-slate-400">
                Notes
              </span>
              <textarea
                className="min-h-30 w-full resize-y rounded-[14px] border border-[rgba(35,60,93,0.95)] bg-[#020a15] p-2 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#4c85ff] focus:shadow-[0_0_0_2px_rgba(76,133,255,0.28)]"
                placeholder="What do you want to say?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>

            <button
              className="mt-2 w-full cursor-pointer rounded-[14px] border-0 bg-linear-to-r from-[#58a6ff] to-[#8f5dff] p-3 text-lg font-bold text-slate-100 transition-all duration-200 hover:bg-linear-to-l disabled:cursor-not-allowed disabled:opacity-75"
              type="submit"
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Draft"}
            </button>

            {error ? (
              <p className="mt-2 text-base text-red-400">{error}</p>
            ) : null}
          </form>

          <div className="flex min-w-0 flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-mono text-slate-200">
                Generated Draft
              </h2>
            </div>

            {editableEmails.length > 0 ? (
              <div className="max-h-130 space-y-3 overflow-y-auto rounded-[14px] border border-[rgba(35,60,93,0.9)] bg-[#020a15] p-3">
                {editableEmails.map((email, index) => {
                  const isEditing = editingIndex === index;

                  return (
                    <article
                      key={`${email.subject}-${index}`}
                      className="rounded-xl border border-[rgba(76,133,255,0.25)] bg-[rgba(7,18,35,0.7)] p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs text-blue-300">
                          Email {index + 1}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyEmail(email, index)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[rgba(109,124,150,0.4)] bg-[rgba(42,50,63,0.7)] px-2 py-1 text-xs text-slate-200 hover:bg-gray-700"
                          >
                            <CopyIcon />
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingIndex(isEditing ? null : index)
                            }
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[rgba(109,124,150,0.4)] bg-[rgba(42,50,63,0.7)] px-2 py-1 text-xs text-slate-200 hover:bg-gray-700"
                          >
                            <EditIcon />
                            {isEditing ? "Done" : "Edit"}
                          </button>
                          {/* Send button is temporarily disabled. */}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            value={email.subject}
                            onChange={(e) =>
                              updateEmailField(index, "subject", e.target.value)
                            }
                            className="w-full rounded-md border border-[rgba(109,124,150,0.4)] bg-[rgba(2,10,21,0.95)] px-2 py-1 text-sm text-slate-100 outline-none focus:border-[#4c85ff]"
                          />
                          <textarea
                            value={email.body}
                            onChange={(e) =>
                              updateEmailField(index, "body", e.target.value)
                            }
                            className="min-h-32.5 w-full resize-y rounded-md border border-[rgba(109,124,150,0.4)] bg-[rgba(2,10,21,0.95)] px-2 py-2 text-sm text-slate-200 outline-none focus:border-[#4c85ff]"
                          />
                        </div>
                      ) : (
                        <>
                          <h3 className="mb-2 text-base font-semibold text-slate-100">
                            {email.subject}
                          </h3>
                          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                            {email.body}
                          </p>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <textarea
                className="min-h-105 w-full resize-y rounded-[14px] border border-[rgba(35,60,93,0.9)] bg-[#020a15] p-2 text-base leading-[1.55] text-slate-300"
                readOnly
                value={
                  result
                    ? JSON.stringify(result, null, 2)
                    : "Your generated email will appear here..."
                }
                aria-label="Generated Draft"
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
