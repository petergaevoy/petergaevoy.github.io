---
title: "How to e2e test webhooks 📬"
date: "2025-07-22 00:11:11"
categories: [playwright]
tags: [api, webhooks, automation, ngrok, express, playwright, testing]
image:
  path: assets/img/webhooks/youvegotmail.png
---

## **Let’s paint the picture 🎨.**
**Webhooks** are a **strong** mechanism and are used by many to **send real-time updates** about any kind of **event**.

> When `something happens` on service **X**, it **sends** an `HTTP-request` to service **Y’s** `endpoint`, **notifying** it of a `change`.

Examples:

- 🛠️ **GitHub / GitLab** → sends a webhook to your CI pipeline whenever you push code  
- 🚚 **Amazon / Uber** → sends a webhook to update delivery or ride status in real time  
- 🔗 **Moralis / CryptoAPIs** → sends a webhook for onchain transactions involving your wallet  
- etc 🌍

## **Our playground case scenario 📜.**
### **System overview 👀**
Let’s say we have a `delivery service`:

- 🚚 We deliver orders to **addresses** — the final destination of each package.
- 🗂️ Every delivery has its own **metadata** — details that can change while the order is in progress.
- 🔄 If **anything changes** about an ongoing delivery, we need to **notify** *everyone involved*: `client`, `delivery man`, `integrated services`, `apps`, and more.
- 📡 We handle all these updates via **webhooks**.

> Here’s an **example** `metadata` for our delivery service:
```json
{
  "orderId": "4b2192f5-6cd4-4a3d-9b72-1674eb98bca4",
  "status": "delivering",
  "paid": true,
  "leaveAtTheDoor": true,
  "deliveryAddress": {
    "city": "Sydney",
    "street": "Wallaby Way",
    "house": "42",
    "flat": "3",
    "entrance": "2",
    "intercom": "2",
    "comment": "Please ring and leave at the door if no answer"
  },
  "clientInfo": {
    "name": "Peter Gaevoy",
    "phone": "+61 999 322 633"
  }
}
```
{: .prompt-tip }

## **Webhook delivery client setup 🚚**
> Now we create simple client that will send webhooks for our delivery. 
{: .prompt-info }

#### **🧾 Declare webhook data types**  
→ Define the structure of a webhook payload to keep things type-safe and tidy.

 ```typescript
 export interface DeliveryAddress {
    city: string;
    street: string;
    house: string;
    flat: string;
    entrance: string;
    intercom: string;
    comment: string;
}

export interface ClientInfo {
    name: string;
    phone: string;
}

export interface DeliveryWebhook {
  orderId: string;
  status: string;
  paid: boolean;
  leaveAtTheDoor: boolean;
  deliveryAddress: DeliveryAddress;
  clientInfo: ClientInfo;
}
```
{: file='/types/delivery/webhook-types.ts'}

#### **🏗️ Create a builder to generate and modify delivery data**  
→  This makes it easy to construct valid payloads dynamically.

 ```typescript
import { DeliveryWebhook } from "../../types/delivery/webhook-types";
import { v4 as uuidv4 } from 'uuid';

export const buildDeliveryWebhook = (overrides: Partial<DeliveryWebhook> = {}): DeliveryWebhook => {
  return {
  orderId: uuidv4(),
  status: "delivering",
  paid: true,
  leaveAtTheDoor: true,
  deliveryAddress: 
    {
      city: "Sydney",
      street: "Wallaby Way",
      house: "42",
      flat: "3",
      entrance: "2",
      intercom: "2",
      comment: "Please ring and leave at the door if no answer"
    }
  ,
  clientInfo: {
    name: "Peter Gaevoy",
    phone: "+61 999 322 633"
  },
  ...overrides,
}
};
```
{: file='/utils/webhook/webhook-builder.ts'}

> 🔄 It returns a complete `DeliveryWebhook` object with default values filled in.  
> If you want to change any of the fields, simply pass an object with your custom values using the `overrides` parameter — those values will replace the defaults.

#### **📤 Write a function that sends a webhook**
→ A simple function to POST crafted payloads.

 ```typescript
 async function sendWebhookWithCustomStatus(webhookUrl: string, statuses: string[]) {
  for (const status of statuses) {
    const requestBody = buildDeliveryWebhook({ status });
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(200);
  }
}
```
{: file='/tests/webhook/webhook.spec.ts'}

> 🚀 Sends webhook requests sequentially with specified statuses to the given webhook URL.  
> ✅ Asserts that each request returns HTTP 200 status.

DONE 
: Now we can simulate webhooks being sent by our delivery service.

## **Webhook receiver and validator 😎**
> 🎉 **Now begins the FUN part! 🤩**  
> To validate that our system *actually sends* webhooks, we need to create an endpoint to receive and verify them.
{: .prompt-info }

#### 🛠️ **Create an endpoint** to receive incoming `webhooks` 
→ This endpoint will act as the receiver for incoming webhooks, enabling us to handle, verify, and validate the webhook data during tests.

 ```typescript
 import express from "express";

const webhooks: any[] = [];

export async function startServer() {
  const app = express();
  const port = 3001;

  app.use(express.json());

  app.post("/webhook", (req, res) => {
    const data = req.body;
    webhooks.push(data);
    res.status(200).send("OK");
  });

  const server = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });

  return {
    server,
    getWebhooks: () => [...webhooks],
    clearWebhooks: () => webhooks.splice(0)
  };
}
```
{: file='/utils/webhook/webhook-client'}

> 🚀 Starts a local Express server on port 3001 that listens for incoming POST requests to the `/webhook` endpoint.  
> 🗄️ Stores received webhook payloads in memory and provides handy utility functions to access or clear them.

#### 🌐 **Expose your local server** using `ngrok`
→ Public URL lets external services reach local endpoint.

> 💡 **Note:**  
Example in step 1 will work just `fine`  *as long as **webhooks** are coming from the **local** machine*.  
If you want to work with **external systems** — you need to open your endpoint to the internet.  
That’s where `ngrok` gets you covered 💻 → 🤝 → 🌐 

 ```typescript
 import ngrok from "ngrok";

. . .
const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  let url = await ngrok.connect(port);
    console.log(`ngrok tunnel opened at: ${url}`);

  return {
    server,
    url,
    getWebhooks: () => [...webhooks],
. . .
```
{: file='/utils/webhook/webhook-client'}

#### 🧾 **Write a smart parser**
   → Extract the `status` or any required data from incoming webhook  
   → Store it in a `variable` for your test to check later.

  ```typescript
  interface WebhookData {
  data?: {
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const webhooks: WebhookData[] = [];

export async function waitForWebhookStatuses(
  expectedStatuses: string[],
  timeout = 5,
): Promise<WebhookData[]> {
  const start = Date.now();
  const loggedStatuses = new Set<string>();

  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const statuses = webhooks.map((w) => w.status).filter((s): s is string => Boolean(s));

      for (const status of statuses) {
        if (!loggedStatuses.has(status)) {
          console.log(`Webhook received with status: "${status}"`);
          loggedStatuses.add(status);
        }
      }

      const allReceived = expectedStatuses.every((s) => statuses.includes(s));

      if (allReceived) {
        clearInterval(interval);
        resolve([...webhooks]);
      }

      const timeoutMs = timeout * 1000 * 60;
      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error(`Timeout: not all statuses received. Got: ${statuses}`));
      }
    }, 500);
  });
}
```
{: file='/utils/webhook/webhook-client'}

> ⏳ Waits for webhook events with the specified statuses to arrive within the given time limit.

NOTE 
: Don’t forget to add it to return in startServer()

 ```typescript
 . . . 
return {
    server,
    url,
    getWebhooks: () => [...webhooks],
    clearWebhooks: () => webhooks.splice(0),
    waitForWebhookStatuses,
  };
. . .
```
{: file='/utils/webhook/webhook-client'}

#### 🧹 **Clean up after test**  
   → Add a function to **stop** both the local `server` and the `ngrok` tunnel  
   → Prevent leftover processes messing up next runs.

  ```typescript
  export async function stopServer(server: Server) {
  server.close();
  await ngrok.disconnect();
  await ngrok.kill();
}
```
{: file='/utils/webhook/webhook-client'}

## **Now put it to the test 🧪**
### **Example spec that receives and validates webhooks 🥳**

 ```typescript
import test, { expect } from '@playwright/test';
import { startServer, stopServer } from '../../utils/webhook/ngrok-client';
import { buildDeliveryWebhook } from '../../utils/webhook/webhook-builder';

let serverInstance: Awaited<ReturnType<typeof startServer>>;
let webhookUrl: string;

// Start the webhook server before all tests
test.beforeAll(async () => {
  serverInstance = await startServer();
  webhookUrl = serverInstance.url + "/webhook";
});

// Stop the webhook server after all tests
test.afterAll(async () => {
  await stopServer(serverInstance.server);
});

test.describe("Webhook status flow", () => {
  test("should receive all expected webhook statuses", async () => {
    test.setTimeout(300_000);
    const expectedStatuses = ["created", "cooking", "delivering", "delivered"];

    // Start waiting for all expected webhook statuses in background
    const hooksPromise = serverInstance.waitForWebhookStatuses(expectedStatuses, 5);

    // Send webhooks with expected statuses sequentially
    await sendWebhookWithCustomStatus(webhookUrl, expectedStatuses);

    // Await until all expected statuses are received or timeout occurs
    const hooks = await hooksPromise;

    // Extract received statuses from webhooks
    const receivedStatuses = hooks.map(hook => hook.status);

    // Assert that all expected statuses were received
    expect(receivedStatuses).toEqual(expect.arrayContaining(expectedStatuses));
  });
});
```
{: file='/tests/webhook/webhook.spec.ts'}

## **Wrapping it all up 🤗**

Now you know how to handle `webhooks` in `e2e` specs! 🧪🚀  
You can go further from here and *Pimp My Ride* 😎 for **your** project needs:

- ✅ Add validators for more fields  
- ⏰ Set time deadlines for target statuses  
- 🔢 Check correct order of statuses  
- 🚫 Look out for doubles  
- 🗃️ Compare data in DB with webhook  
- ✨ Etc  
￼
All of code above is available in my:
: [**Playwright example project**](https://github.com/petergaevoy/playwright/tree/main)