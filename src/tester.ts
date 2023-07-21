import * as kernel from "@lumeweb/libkernel/kernel";
import { x25519 } from "@noble/curves/ed25519";
import { bytesToHex, hexToBytes } from "@noble/curves/abstract/utils";
import defer from "p-defer";
import { randomBytes } from "@noble/hashes/utils";
import { secretbox } from "@noble/ciphers/salsa";
import {
  addQuery,
  deleteQuery,
  getAuthStatus,
  getAuthStatusDefer,
  getAuthStatusKnown,
  getLoggedInDefer,
  getQueries,
  getQueriesNonce,
  getQuery,
  increaseQueriesNonce,
  resetLoggedInDefer,
  setAuthStatus,
  setAuthStatusKnown,
} from "./vars.js";
import { ed25519 } from "@lumeweb/libkernel";

declare global {
  interface Window {
    kernel: typeof kernel;
    login: typeof login;
  }
}

window.kernel = kernel;
window.login = login;

window.addEventListener("message", (event) => {
  const data = event.data?.data;
  if (event.data.method === "log") {
    if (data?.isErr === false) {
      console.log(data.message);
      return;
    }
    console.error(data.message);
  }

  if (event.data.method === "kernelAuthStatus") {
    setAuthStatus(data);
    if (!getAuthStatusKnown()) {
      getAuthStatusDefer().resolve();
      setAuthStatusKnown(true);
      console.log("bootloader is now initialized");
      if (!getAuthStatus().loginComplete) {
        console.log("user is not logged in: waiting until login is confirmed");
      } else {
        getLoggedInDefer().resolve();
      }
      if (getAuthStatus().logoutComplete) {
        resetLoggedInDefer();
        setAuthStatusKnown(false);
      }
    }
  }

  if (!(event.data.nonce in getQueries())) {
    return;
  }

  let receiveResult = getQuery(event.data.nonce);
  if (event.data.method === "response") {
    deleteQuery(event.data.nonce);
  }

  receiveResult(event.data);
});

function getKernelIframe() {
  const iframes = Array.from(document.getElementsByTagName("iframe"));

  if (!iframes.length) {
    console.error("could not find kernel iframe");
    return;
  }

  return iframes[0];
}

export async function loginRandom() {
  return login(ed25519.utils.randomPrivateKey());
}

export async function login(key: Uint8Array) {
  let privKey = x25519.utils.randomPrivateKey();

  const iframe = getKernelIframe();

  if (!iframe) {
    return;
  }

  let pubKey: string | Uint8Array = await queryKernel({
    method: "exchangeCommunicationKeys",
    data: bytesToHex(x25519.getPublicKey(privKey)),
  });

  if (!pubKey) {
    alert(`Failed to login: could not get communication key`);
    return;
  }

  pubKey = hexToBytes(pubKey as string);

  const secret = x25519.getSharedSecret(privKey, pubKey);
  const nonce = randomBytes(24);
  const box = secretbox(secret, nonce);
  const ciphertext = box.seal(key);

  await queryKernel({
    method: "setLoginKey",
    data: {
      data: bytesToHex(ciphertext),
      nonce: bytesToHex(nonce),
    },
  });
}

function queryKernel(query: any): Promise<any> {
  return new Promise((resolve) => {
    let receiveResponse = function (data: any) {
      resolve(data.data);
    };

    getAuthStatusDefer().promise.then(() => {
      let nonce = getQueriesNonce();
      increaseQueriesNonce();
      query.nonce = nonce;
      addQuery(nonce, receiveResponse);
      if (getKernelIframe()?.contentWindow !== null) {
        getKernelIframe()?.contentWindow?.postMessage(
          query,
          "https://kernel.lumeweb.com",
        );
      } else {
        console.error(
          "kernelFrame.contentWindow was null, cannot send message!",
        );
      }
    });
  });
}
