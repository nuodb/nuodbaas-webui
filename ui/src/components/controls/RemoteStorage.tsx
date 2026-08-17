// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import React, { useEffect, useMemo, useState } from "react";
import { getDomain } from "tldts";

// check if it is same domain (ignoring subdomains)
function isSameDomain(domain: string) {
  const currentDomain = getDomain(window.location.host) || window.location.host;
  const remoteDomain = getDomain(domain) || domain;
  if (
    !remoteDomain ||
    currentDomain.toLowerCase() !== remoteDomain.toLowerCase()
  ) {
    return false;
  } else {
    return true;
  }
}

export function RemoteStorageBoundary({
  children,
}: {
  children: React.JSX.Element[] | React.JSX.Element;
}): React.JSX.Element {
  const [showChildren, setShowChildren] = useState<boolean>(false);

  function handleEvents(event: MessageEvent) {
    if (!event.source?.postMessage || !event.data?.action) {
      return;
    }

    // enforce same domain (including subdomains)
    if (!isSameDomain(new URL(event.origin).host)) {
      console.log(
        "Domains don't match",
        new URL(event.origin).host,
        window.location.host,
      );
      return;
    }

    if (
      event.data.action === "remoteStorageGetResponse" ||
      event.data.action === "remoteStorageSetResponse"
    ) {
      const { transactionId, data } = event.data;
      const resolve = transactions.get(transactionId);
      if (resolve) {
        transactions.delete(transactionId);
        resolve(data);
      }
    }

    // safety check: delete old transactions to prevent memory leak on old/aborted transactions
    if (transactions.size > maxTransactions) {
      for (const key of transactions.keys()) {
        if (key < currentTransactionId - maxTransactions) {
          const callback = transactions.get(key);
          if (callback) {
            callback(null);
          }
          transactions.delete(key);
        }
      }
    }
  }

  useEffect(() => {
    window.addEventListener("message", handleEvents);
    return () => {
      window.removeEventListener("message", handleEvents);
    };
  }, []);

  const iframeMemo = useMemo(() => {
    let remoteStorageUrl = "/ui/remoteStorage.html";
    const multiInstanceRegistryUrl =
      Date.now() > 0
        ? "___NUODB_MULTI_INSTANCE_REGISTRY_URL___"
        : "never occurs";
    if (
      !multiInstanceRegistryUrl.endsWith(".json") &&
      multiInstanceRegistryUrl
    ) {
      remoteStorageUrl = multiInstanceRegistryUrl + "/remoteStorage.html";
    }

    return (
      <iframe
        id="remoteStorage"
        src={remoteStorageUrl}
        onLoad={async () => {
          await remoteStorage.fillCache("nuodbaasCurrentRegion");
          await remoteStorage.fillCache("nuodbaasRegions");
          setShowChildren(true);
        }}
        style={{ display: "none" }}
      ></iframe>
    );
  }, []);

  return (
    <>
      {iframeMemo}
      {showChildren ? children : "Loading..."}
    </>
  );
}

type TransactionResponse = string | null;

let currentTransactionId = 0;
const transactions = new Map<
  number,
  (value: TransactionResponse | PromiseLike<TransactionResponse>) => void
>();
const maxTransactions = 1000;

const remoteStorageCache = new Map<string, string>();

export class remoteStorage {
  public static get = (key: string): TransactionResponse => {
    return remoteStorageCache.get(key) || null;
  };

  public static async fillCache(key: string): Promise<TransactionResponse> {
    const iframe = document.getElementById(
      "remoteStorage",
    ) as HTMLIFrameElement | null;
    if (!iframe) {
      return Promise.resolve(null);
    }

    const transactionId = currentTransactionId++;

    const response = await new Promise<TransactionResponse>((resolve) => {
      transactions.set(transactionId, resolve);
      iframe.contentWindow?.postMessage(
        { transactionId, action: "remoteStorageGet", key },
        window.location.origin,
      );
    });
    if (response === null) {
      remoteStorageCache.delete(key);
    } else {
      remoteStorageCache.set(key, response);
    }
    return Promise.resolve(response);
  }

  public static set = async (
    key: string,
    value: string | null,
  ): Promise<TransactionResponse> => {
    const iframe = document.getElementById(
      "remoteStorage",
    ) as HTMLIFrameElement | null;
    if (!iframe) {
      return Promise.resolve(null);
    }

    if (value === null) {
      remoteStorageCache.delete(key);
    } else {
      remoteStorageCache.set(key, value);
    }

    const transactionId = currentTransactionId++;

    return new Promise<TransactionResponse>((resolve) => {
      transactions.set(transactionId, resolve);
      iframe.contentWindow?.postMessage(
        { transactionId, action: "remoteStorageSet", key, value },
        window.location.origin,
      );
    });
  };
}
