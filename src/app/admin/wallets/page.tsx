"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PageHeader } from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { appendAuditEntry } from "@/lib/audit-log";
import { callWiseApi, type ApiResult } from "@/lib/api";
import { formatMoney, formatMoneyParts, isValidMinorAmount, parseMajorToMinor } from "@/lib/money";

export default function AdminWalletsPage() {
  const { user, profile } = useAdminAuth();
  const [fundAccountId, setFundAccountId] = useState("");
  const [fundAmountMajor, setFundAmountMajor] = useState("1000.00");
  const [fundCurrency, setFundCurrency] = useState("SSP");
  const [fundNote, setFundNote] = useState("Admin wallet credit");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);

  const fundAmountMinor = useMemo(() => parseMajorToMinor(fundAmountMajor), [fundAmountMajor]);
  const formattedAmount = useMemo(
    () => (isValidMinorAmount(fundAmountMinor) ? formatMoney(fundAmountMinor, fundCurrency) : null),
    [fundAmountMinor, fundCurrency],
  );
  const canFund = profile?.permissions.includes("wallet:credit") && fundAccountId && isValidMinorAmount(fundAmountMinor);

  async function fundWallet() {
    if (!user || !canFund) return;

    setFunding(true);
    setError("");
    setSuccess("");

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
      const succeeded = apiResult.status >= 200 && apiResult.status < 300;

      appendAuditEntry({
        actorEmail: user.email ?? user.uid,
        actorUserId: profile?.userId ?? user.uid,
        action: "wallet.fund",
        resourceType: "wallet_account",
        resourceId: fundAccountId,
        summary: `${formatMoney(fundAmountMinor, fundCurrency)} credited to ${fundAccountId}`,
        details: {
          amountMinor: fundAmountMinor,
          currency: fundCurrency,
          note: fundNote,
        },
        status: succeeded ? "success" : "failure",
        apiStatus: apiResult.status,
      });

      if (succeeded) {
        setSuccess(`Wallet funded successfully. ${formatMoney(fundAmountMinor, fundCurrency)} credited.`);
        setConfirmOpen(false);
      } else {
        setError(`Wallet funding failed with status ${apiResult.status}.`);
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Wallet funding failed";
      setError(message);

      if (user) {
        appendAuditEntry({
          actorEmail: user.email ?? user.uid,
          actorUserId: profile?.userId ?? user.uid,
          action: "wallet.fund",
          resourceType: "wallet_account",
          resourceId: fundAccountId,
          summary: `Failed to credit ${formatMoney(fundAmountMinor, fundCurrency)} to ${fundAccountId}`,
          details: { error: message },
          status: "failure",
        });
      }
    } finally {
      setFunding(false);
    }
  }

  return (
    <div className="admin-page">
      <PageHeader
        title="Wallets"
        description="Credit customer wallet balances through the admin funding endpoint."
      />

      {!profile?.permissions.includes("wallet:credit") ? (
        <div className="admin-alert admin-alert-warning" role="alert">
          Your account is missing the <code>wallet:credit</code> permission required for wallet funding.
        </div>
      ) : null}

      {success ? (
        <div className="admin-alert admin-alert-success" role="status" aria-live="polite">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="admin-alert admin-alert-error" role="alert">
          {error}
        </div>
      ) : null}

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>Fund user wallet</h2>
            <p className="muted">Enter the destination account and amount. You will confirm before submitting.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Wallet account ID
            <input value={fundAccountId} onChange={(event) => setFundAccountId(event.target.value.trim())} />
          </label>
          <label>
            Amount
            <input
              inputMode="decimal"
              value={fundAmountMajor}
              onChange={(event) => setFundAmountMajor(event.target.value.replace(/[^\d.]/g, ""))}
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

        <div className="admin-review-card">
          <span className="label">Review amount</span>
          {formattedAmount ? (
            <>
              <strong className="admin-review-amount">{formatMoneyParts(fundAmountMinor, fundCurrency).amount}</strong>
              <p className="muted">
                {formattedAmount} · {fundAmountMinor} minor units
              </p>
            </>
          ) : (
            <p className="muted">Enter a valid amount to preview the credit.</p>
          )}
        </div>

        <button type="button" onClick={() => setConfirmOpen(true)} disabled={!canFund || funding}>
          Review and fund wallet
        </button>
      </section>

      <section className="admin-panel">
        <h2>Last response</h2>
        <pre>{result ? JSON.stringify(result, null, 2) : "No wallet funding response yet."}</pre>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm wallet funding"
        description="This action credits the customer wallet immediately. Review the details before confirming."
        confirmLabel="Fund wallet"
        tone="danger"
        busy={funding}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={fundWallet}
      >
        <dl className="admin-confirm-details">
          <div>
            <dt>Account</dt>
            <dd>
              <code>{fundAccountId}</code>
            </dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{formattedAmount}</dd>
          </div>
          <div>
            <dt>Currency</dt>
            <dd>{fundCurrency}</dd>
          </div>
          <div>
            <dt>Note</dt>
            <dd>{fundNote || "—"}</dd>
          </div>
        </dl>
      </ConfirmDialog>
    </div>
  );
}
