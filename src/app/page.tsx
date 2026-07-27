"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { apiBaseUrl, callWiseApi, getAuthProfile, type ApiResult, type AuthProfile } from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase";

type WalletAccount = {
  id: string;
  accountType: string;
  currency: string;
  status: string;
  balanceMinor: string;
  createdAt: string;
};

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState("");
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [currency, setCurrency] = useState("SSP");
  const [toAccountId, setToAccountId] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [amountMinor, setAmountMinor] = useState("1000");
  const [referenceId, setReferenceId] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  const [syncingUser, setSyncingUser] = useState(false);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [adminChecking, setAdminChecking] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");

  const tokenPreview = useMemo(() => {
    if (!idToken) return "No token yet";
    return `${idToken.slice(0, 28)}...${idToken.slice(-16)}`;
  }, [idToken]);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    async function syncSignedInUser(nextUser: User) {
      setSyncingUser(true);

      try {
        const nextProfile = await getAuthProfile(nextUser);
        if (cancelled) return;

        setProfile(nextProfile);
        setResult({ status: 200, body: { data: nextProfile } });

        const accountsResult = await callWiseApi(nextUser, "/wallet/accounts");
        if (cancelled) return;

        const data = (accountsResult.body as { data?: WalletAccount[] } | undefined)?.data;
        if (Array.isArray(data)) {
          setAccounts(data);
          const customerAccount = data.find((account) => account.accountType === "CUSTOMER");
          if (customerAccount) {
            setFromAccountId(customerAccount.id);
          }
        }
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "User profile sync failed";
        if (!cancelled) {
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setSyncingUser(false);
        }
      }
    }

    try {
      const { auth } = getFirebaseAuth();
      unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
        setUser(nextUser);
        setError("");

        if (!nextUser) {
          setIdToken("");
          setAccounts([]);
          setProfile(null);
          return;
        }

        const token = await nextUser.getIdToken();
        setIdToken(token);
        void syncSignedInUser(nextUser);
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Firebase is not configured";
      queueMicrotask(() => setError(message));
    }

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  async function signIn() {
    try {
      setError("");
      const { auth, provider } = getFirebaseAuth();
      await signInWithPopup(auth, provider);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Google sign-in failed";
      setError(message);
    }
  }

  async function signOutUser() {
    setResult(null);
    const { auth } = getFirebaseAuth();
    await signOut(auth);
  }

  async function callApi(path: string, options: RequestInit = {}) {
    if (!user) {
      setError("Sign in first.");
      return null;
    }

    setLoading(true);
    setError("");

    try {
      setIdToken(await user.getIdToken());
      const apiResult = await callWiseApi(user, path, options);
      setResult(apiResult);
      return apiResult;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "API request failed";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function createCustomerWallet() {
    const apiResult = await callApi("/wallet/accounts/customer", {
      method: "POST",
      body: JSON.stringify({ currency }),
    });

    const account = (apiResult?.body as { data?: WalletAccount } | undefined)?.data;
    if (account?.id) {
      setFromAccountId(account.id);
      await listAccounts();
    }
  }

  async function listAccounts() {
    const apiResult = await callApi("/wallet/accounts");
    const data = (apiResult?.body as { data?: WalletAccount[] } | undefined)?.data;
    if (Array.isArray(data)) {
      setAccounts(data);
    }
  }

  async function submitTransfer() {
    await callApi("/wallet/transfers", {
      method: "POST",
      headers: {
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        fromAccountId,
        toAccountId,
        amountMinor,
        currency,
        referenceType: "TEST_TRANSFER",
        referenceId,
      }),
    });
    await listAccounts();
    setReferenceId(crypto.randomUUID());
  }

  async function openAdminDashboard() {
    if (!user) {
      setError("Sign in first.");
      return;
    }

    setAdminChecking(true);
    setError("");

    try {
      const profile = await getAuthProfile(user);
      setResult({ status: 200, body: { data: profile } });

      if (!profile.roles.includes("ADMIN")) {
        setError("Admin access denied. This account does not have the ADMIN role.");
        return;
      }

      router.push("/admin");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Admin role check failed";
      setError(message);
    } finally {
      setAdminChecking(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Wise API tester</p>
          <h1>Google sign-in and wallet endpoint smoke tests.</h1>
          <p>
            Use this tiny app to get a Firebase ID token, create your customer wallet,
            list wallet accounts, and send test transfer requests to the Cloud Run API.
          </p>
        </div>

        <div className="auth-card">
          {user ? (
            <>
              <div>
                <span className="label">Signed in as</span>
                <strong>{user.email ?? user.uid}</strong>
              </div>
              <div>
                <span className="label">Backend sync</span>
                <strong>{syncingUser ? "Syncing..." : profile ? "Ready" : "Pending"}</strong>
              </div>
              <button type="button" onClick={signOutUser}>
                Sign out
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={openAdminDashboard}
                disabled={adminChecking}
              >
                {adminChecking ? "Checking access..." : "Admin dashboard"}
              </button>
            </>
          ) : (
            <button type="button" onClick={signIn}>
              Sign in with Google
            </button>
          )}
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <h2>Auth token</h2>
          <p className="muted">Sent as the Bearer token to the API.</p>
          <code className="token">{tokenPreview}</code>
        </div>

        <div className="panel">
          <h2>API target</h2>
          <p className="muted">Configured by `NEXT_PUBLIC_WISE_API_BASE_URL`.</p>
          <code className="token">{apiBaseUrl}</code>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Wallet accounts</h2>
            <p className="muted">Create or fetch the signed-in user&apos;s customer wallet.</p>
          </div>
          <button type="button" onClick={listAccounts} disabled={!user || loading}>
            Refresh accounts
          </button>
        </div>

        <div className="form-row">
          <label>
            Currency
            <input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
          </label>
          <button type="button" onClick={createCustomerWallet} disabled={!user || loading}>
            Create/fetch customer wallet
          </button>
        </div>

        <div className="account-list">
          {accounts.length === 0 ? (
            <p className="muted">No wallet accounts loaded yet.</p>
          ) : (
            accounts.map((account) => (
              <button
                className="account-row"
                key={account.id}
                type="button"
                onClick={() => setFromAccountId(account.id)}
              >
                <span>
                  <strong>{account.accountType}</strong>
                  <small>{account.id}</small>
                </span>
                <span>
                  {account.balanceMinor} {account.currency}
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Transfer test</h2>
        <p className="muted">
          This will fail with insufficient funds until the source account has seeded or funded ledger credit.
        </p>

        <div className="form-grid">
          <label>
            From account
            <input value={fromAccountId} onChange={(event) => setFromAccountId(event.target.value)} />
          </label>
          <label>
            To account
            <input value={toAccountId} onChange={(event) => setToAccountId(event.target.value)} />
          </label>
          <label>
            Amount minor
            <input value={amountMinor} onChange={(event) => setAmountMinor(event.target.value.replace(/[^\d]/g, ""))} />
          </label>
          <label>
            Reference ID
            <input value={referenceId} onChange={(event) => setReferenceId(event.target.value)} />
          </label>
        </div>

        <button type="button" onClick={submitTransfer} disabled={!user || loading || !fromAccountId || !toAccountId}>
          Submit transfer
        </button>
      </section>

      {error ? <div className="error">{error}</div> : null}

      <section className="panel">
        <h2>Last response</h2>
        <pre>{result ? formatJson(result) : "No API response yet."}</pre>
      </section>
    </main>
  );
}
