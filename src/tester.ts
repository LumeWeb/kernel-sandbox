import * as kernel from "@lumeweb/libkernel";

// @ts-ignore
window.kernel = kernel;

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
