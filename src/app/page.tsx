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

type DemoBank = {
  code: string;
  name: string;
  country: string;
  currencies: string[];
};

type DemoBankAccount = {
  id: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  accountNumberLast4: string;
  currency: string;
  balanceMinor: string;
  status: string;
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
  const [demoBanks, setDemoBanks] = useState<DemoBank[]>([]);
  const [demoBankAccounts, setDemoBankAccounts] = useState<DemoBankAccount[]>([]);
  const [currency, setCurrency] = useState("SSP");
  const [toAccountId, setToAccountId] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [amountMinor, setAmountMinor] = useState("1000");
  const [selectedBankCode, setSelectedBankCode] = useState("KCB_SS");
  const [bankAccountName, setBankAccountName] = useState("Jane Deng");
  const [bankAccountNumber, setBankAccountNumber] = useState("123456789");
  const [bankOpeningBalanceMinor, setBankOpeningBalanceMinor] = useState("750000");
  const [selectedDemoBankAccountId, setSelectedDemoBankAccountId] = useState("");
  const [depositWalletAccountId, setDepositWalletAccountId] = useState("");
  const [depositAmountMinor, setDepositAmountMinor] = useState("125000");
  const [depositCurrency, setDepositCurrency] = useState("SSP");
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
            setDepositWalletAccountId(customerAccount.id);
            setDepositCurrency(customerAccount.currency);
          }
        }

        const banksResult = await callWiseApi(nextUser, "/demo/banks");
        if (cancelled) return;

        const banks = (banksResult.body as { data?: DemoBank[] } | undefined)?.data;
        if (Array.isArray(banks)) {
          setDemoBanks(banks);
          if (banks[0]) {
            setSelectedBankCode(banks[0].code);
          }
        }

        const bankAccountsResult = await callWiseApi(nextUser, "/demo/bank-accounts");
        if (cancelled) return;

        const bankAccounts = (bankAccountsResult.body as { data?: DemoBankAccount[] } | undefined)?.data;
        if (Array.isArray(bankAccounts)) {
          setDemoBankAccounts(bankAccounts);
          if (bankAccounts[0]) {
            setSelectedDemoBankAccountId(bankAccounts[0].id);
            setDepositCurrency(bankAccounts[0].currency);
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
          setDemoBanks([]);
          setDemoBankAccounts([]);
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

  async function listDemoBanks() {
    const apiResult = await callApi("/demo/banks");
    const data = (apiResult?.body as { data?: DemoBank[] } | undefined)?.data;
    if (Array.isArray(data)) {
      setDemoBanks(data);
      if (!selectedBankCode && data[0]) {
        setSelectedBankCode(data[0].code);
      }
    }
  }

  async function listDemoBankAccounts() {
    const apiResult = await callApi("/demo/bank-accounts");
    const data = (apiResult?.body as { data?: DemoBankAccount[] } | undefined)?.data;
    if (Array.isArray(data)) {
      setDemoBankAccounts(data);
      if (!selectedDemoBankAccountId && data[0]) {
        setSelectedDemoBankAccountId(data[0].id);
        setDepositCurrency(data[0].currency);
      }
    }
  }

  async function linkDemoBankAccount() {
    const apiResult = await callApi("/demo/bank-accounts", {
      method: "POST",
      body: JSON.stringify({
        bankCode: selectedBankCode,
        accountName: bankAccountName,
        accountNumber: bankAccountNumber,
        currency: depositCurrency,
        openingBalanceMinor: bankOpeningBalanceMinor,
      }),
    });

    const account = (apiResult?.body as { data?: DemoBankAccount } | undefined)?.data;
    if (account?.id) {
      setSelectedDemoBankAccountId(account.id);
      setDepositCurrency(account.currency);
      await listDemoBankAccounts();
    }
  }

  async function submitBankDeposit() {
    await callApi("/wallet/deposits/bank", {
      method: "POST",
      headers: {
        "Idempotency-Key": `bank-deposit-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({
        demoBankAccountId: selectedDemoBankAccountId,
        walletAccountId: depositWalletAccountId,
        amountMinor: depositAmountMinor,
        currency: depositCurrency,
        referenceId: crypto.randomUUID(),
      }),
    });
    await listDemoBankAccounts();
    await listAccounts();
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
            link demo bank accounts, move money into Wise, and send test transfer requests.
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
                {adminChecking ? "Checking access..." : "Admin console"}
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
        <div className="panel-head">
          <div>
            <h2>Demo bank funding</h2>
            <p className="muted">Link a simulated bank account and deposit money into the selected Wise wallet.</p>
          </div>
          <div className="button-row">
            <button type="button" onClick={listDemoBanks} disabled={!user || loading}>
              Refresh banks
            </button>
            <button className="secondary-button" type="button" onClick={listDemoBankAccounts} disabled={!user || loading}>
              Refresh linked accounts
            </button>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Bank
            <select value={selectedBankCode} onChange={(event) => setSelectedBankCode(event.target.value)}>
              {demoBanks.length === 0 ? (
                <option value={selectedBankCode}>{selectedBankCode}</option>
              ) : (
                demoBanks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            Account name
            <input value={bankAccountName} onChange={(event) => setBankAccountName(event.target.value)} />
          </label>
          <label>
            Account number
            <input
              value={bankAccountNumber}
              onChange={(event) => setBankAccountNumber(event.target.value.replace(/[^\d]/g, ""))}
            />
          </label>
          <label>
            Opening balance minor
            <input
              value={bankOpeningBalanceMinor}
              onChange={(event) => setBankOpeningBalanceMinor(event.target.value.replace(/[^\d]/g, ""))}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={linkDemoBankAccount}
          disabled={!user || loading || !selectedBankCode || !bankAccountName || !bankAccountNumber}
        >
          Link demo bank account
        </button>

        <div className="account-list">
          {demoBankAccounts.length === 0 ? (
            <p className="muted">No linked demo bank accounts loaded yet.</p>
          ) : (
            demoBankAccounts.map((account) => (
              <button
                className="account-row"
                key={account.id}
                type="button"
                onClick={() => {
                  setSelectedDemoBankAccountId(account.id);
                  setDepositCurrency(account.currency);
                }}
              >
                <span>
                  <strong>{account.bankName}</strong>
                  <small>{account.accountName} ending {account.accountNumberLast4}</small>
                  <small>{account.id}</small>
                </span>
                <span>
                  {account.balanceMinor} {account.currency}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="form-grid">
          <label>
            Demo bank account ID
            <input
              value={selectedDemoBankAccountId}
              onChange={(event) => setSelectedDemoBankAccountId(event.target.value)}
            />
          </label>
          <label>
            Wise wallet account ID
            <input value={depositWalletAccountId} onChange={(event) => setDepositWalletAccountId(event.target.value)} />
          </label>
          <label>
            Deposit amount minor
            <input
              value={depositAmountMinor}
              onChange={(event) => setDepositAmountMinor(event.target.value.replace(/[^\d]/g, ""))}
            />
          </label>
          <label>
            Currency
            <input value={depositCurrency} onChange={(event) => setDepositCurrency(event.target.value.toUpperCase())} />
          </label>
        </div>

        <button
          type="button"
          onClick={submitBankDeposit}
          disabled={!user || loading || !selectedDemoBankAccountId || !depositWalletAccountId || !depositAmountMinor}
        >
          Deposit into Wise wallet
        </button>
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
