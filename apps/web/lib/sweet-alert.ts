"use client";

import Swal from "sweetalert2";

export async function confirmAction({
  title,
  text,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
}: {
  title: string;
  text: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}) {
  const result = await Swal.fire({
    title,
    text,
    icon: danger ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    focusCancel: true,
    background: "var(--elevated)",
    color: "var(--foreground)",
    confirmButtonColor: danger ? "var(--danger)" : "var(--accent)",
    cancelButtonColor: "var(--muted)",
    customClass: {
      popup: "karsadesk-swal",
      confirmButton: "karsadesk-swal-confirm",
      cancelButton: "karsadesk-swal-cancel",
    },
  });
  return result.isConfirmed;
}

export async function showActionError({
  title,
  text,
  actionText,
  actionUrl,
}: {
  title: string;
  text: string;
  actionText?: string;
  actionUrl?: string;
}) {
  const result = await Swal.fire({
    title,
    text,
    icon: "error",
    showCancelButton: Boolean(actionUrl),
    confirmButtonText: actionUrl ? actionText || "Open setup" : "Close",
    cancelButtonText: "Close",
    reverseButtons: true,
    background: "var(--elevated)",
    color: "var(--foreground)",
    confirmButtonColor: "var(--accent)",
    cancelButtonColor: "var(--muted)",
  });
  if (result.isConfirmed && actionUrl)
    window.open(actionUrl, "_blank", "noopener,noreferrer");
}
