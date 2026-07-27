"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { apiBaseUrl, callWiseApi, getAuthProfile, type ApiResult, type AuthProfile } from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase";

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [funding, setFunding] = useState(false);
  const [fundAccountId, setFundAccountId] = useState("");
  const [fundAmountMinor, setFundAmountMinor] = useState("100000");
  const [fundCurrency, setFundCurrency] = useState("SSP");
  const [fundNote, setFundNote] = useState("Admin test funding");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");

  const adminPermissions = useMemo(
    () => profile?.permissions.filter((permission) => permission.startsWith("admin:")) ?? [],
    [profile],
  );
  const fundingDisabledReason = useMemo(() => {
    if (!profile?.permissions.includes("wallet:credit")) {
      return "This account is missing wallet:credit.";
    }
    if (!fundAccountId) {
      return "Enter the customer wallet account ID to fund.";
    }
    if (!fundAmountMinor) {
      return "Enter an amount in minor units.";
    }
    return "";
  }, [fundAccountId, fundAmountMinor, profile?.permissions]);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    async function loadProfile(nextUser: User) {
      setLoading(true);
      setError("");

      try {
        const nextProfile = await getAuthProfile(nextUser);
        if (cancelled) return;

        if (!nextProfile.roles.includes("ADMIN")) {
          setError("Admin access denied. Redirecting to the tester.");
          window.setTimeout(() => router.replace("/"), 900);
          return;
        }

        setProfile(nextProfile);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Unable to verify admin access";
        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    try {
      const { auth } = getFirebaseAuth();
      unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser);
        setProfile(null);

        if (!nextUser) {
          setLoading(false);
          return;
        }

        void loadProfile(nextUser);
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Firebase is not configured";
      queueMicrotask(() => {
        setError(message);
        setLoading(false);
      });
    }

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router]);

  async function signIn() {
    setError("");
    const { auth, provider } = getFirebaseAuth();
    await signInWithPopup(auth, provider);
  }

  async function signOutUser() {
    const { auth } = getFirebaseAuth();
    await signOut(auth);
    router.replace("/");
  }

  async function fundWallet() {
    if (!user || !profile?.permissions.includes("wallet:credit")) {
      setError("Admin wallet funding requires the wallet:credit permission.");
      return;
    }

    setFunding(true);
    setError("");

    try {
      const apiResult = await callWiseApi(user, "/wallet/admin/fund", {
        method: "POST",
        headers: {
          "Idempotency-Key": `admin-fund-${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          accountId: fundAccountId,
          amountMinor: fundAmountMinor,
          currency: fundCurrency,
          referenceId: crypto.randomUUID(),
          note: fundNote || undefined,
        }),
      });

      setResult(apiResult);

      if (apiResult.status < 200 || apiResult.status >= 300) {
        setError(`Wallet funding failed: ${apiResult.status}`);
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Wallet funding failed";
      setError(message);
    } finally {
      setFunding(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero compact-hero">
        <div>
          <p className="eyebrow">Wise admin</p>
          <h1>Admin dashboard.</h1>
          <p>Access is verified against the backend `ADMIN` role before this page is shown.</p>
        </div>

        <div className="auth-card">
          {user ? (
            <>
              <div>
                <span className="label">Signed in as</span>
                <strong>{user.email ?? user.uid}</strong>
              </div>
              <button type="button" onClick={signOutUser}>
                Sign out
              </button>
            </>
          ) : (
            <button type="button" onClick={signIn}>
              Sign in with Google
            </button>
          )}
          <Link className="text-link" href="/">
            Back to tester
          </Link>
        </div>
      </section>

      {loading ? <div className="panel">Checking admin access...</div> : null}
      {error ? <div className="error">{error}</div> : null}

      {profile?.roles.includes("ADMIN") ? (
        <>
          <section className="grid">
            <div className="panel">
              <h2>Admin identity</h2>
              <div className="detail-list">
                <span>User ID</span>
                <code>{profile.userId}</code>
                <span>Firebase UID</span>
                <code>{profile.firebaseUid}</code>
              </div>
            </div>

            <div className="panel">
              <h2>API target</h2>
              <code className="token">{apiBaseUrl}</code>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Access scope</h2>
                <p className="muted">Roles and permissions returned by the backend auth profile.</p>
              </div>
            </div>

            <div className="badge-grid">
              {profile.roles.map((role) => (
                <span className="badge" key={role}>
                  {role}
                </span>
              ))}
              {profile.permissions.map((permission) => (
                <span className="badge muted-badge" key={permission}>
                  {permission}
                </span>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Admin modules</h2>
            <div className="admin-grid">
              <div>
                <strong>Wallet operations</strong>
                <span>{profile.permissions.includes("wallet:credit") ? "Enabled" : "Not granted"}</span>
              </div>
              <div>
                <strong>Transfer approval</strong>
                <span>{profile.permissions.includes("transfer:approve") ? "Enabled" : "Not granted"}</span>
              </div>
              <div>
                <strong>User lookup</strong>
                <span>{profile.permissions.includes("user:read:any") ? "Enabled" : "Not granted"}</span>
              </div>
              <div>
                <strong>Admin console</strong>
                <span>{adminPermissions.length > 0 ? adminPermissions.join(", ") : "Limited"}</span>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Fund user wallet</h2>
                <p className="muted">Credits a wallet ledger balance through the admin funding endpoint.</p>
              </div>
            </div>

            <div className="form-grid">
              <label>
                Wallet account ID
                <input value={fundAccountId} onChange={(event) => setFundAccountId(event.target.value)} />
              </label>
              <label>
                Amount minor
                <input
                  value={fundAmountMinor}
                  onChange={(event) => setFundAmountMinor(event.target.value.replace(/[^\d]/g, ""))}
                />
              </label>
              <label>
                Currency
                <input value={fundCurrency} onChange={(event) => setFundCurrency(event.target.value.toUpperCase())} />
              </label>
              <label>
                Note
                <input value={fundNote} onChange={(event) => setFundNote(event.target.value)} />
              </label>
            </div>

            <button
              type="button"
              onClick={fundWallet}
              disabled={funding || Boolean(fundingDisabledReason)}
            >
              {funding ? "Funding wallet..." : "Fund wallet"}
            </button>
            {fundingDisabledReason ? <p className="muted">{fundingDisabledReason}</p> : null}
          </section>

          <section className="panel">
            <h2>Last admin response</h2>
            <pre>{result ? formatJson(result) : "No admin response yet."}</pre>
          </section>
        </>
      ) : null}
    </main>
  );
}
