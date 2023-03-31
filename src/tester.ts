import * as kernel from "libkernel";
import * as skynet from "libskynet";

// @ts-ignore
window.kernel = kernel;
// @ts-ignore
window.skynet = skynet;

window.addEventListener("message", (event) => {
  const data = event.data?.data;
  if (event.data.method === "log") {
    if (data?.isErr === false) {
      console.log(data.message);
      return;
    }
    console.error(data.message);
  }
});
