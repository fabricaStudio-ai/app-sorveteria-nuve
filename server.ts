import express from "express";
import path from "path";
import fs from "fs";
import { MercadoPagoConfig, Preference } from 'mercadopago';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from "dotenv";

dotenv.config();

let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (e) {
  console.warn("Could not load firebase config directly from cwd", e);
}

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;

const initializeFirebase = async () => {
  try {
    const adminInstance = (admin as any).default || admin;
    let appInstance;

    if (adminInstance.apps.length === 0) {
      const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      const projectId = firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID;
      
      const options: any = {};
      if (projectId) options.projectId = projectId;

      if (serviceAccountVar) {
        try {
          let parsed = JSON.parse(serviceAccountVar);
          if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
          }
          options.credential = adminInstance.credential.cert(parsed);
          console.log("DEBUG: Using Service Account Credential for project:", options.projectId);
        } catch (e) {
          console.error("DEBUG: Failed to parse service account", e);
        }
      }

      // If no cert or parse failed, use applicationDefault
      if (!options.credential) {
        console.log("DEBUG: Using Application Default Credentials");
        options.credential = adminInstance.credential.applicationDefault();
      }

      appInstance = adminInstance.initializeApp(options);
    } else {
      appInstance = adminInstance.apps[0];
    }

    const dbId = firebaseConfig.firestoreDatabaseId;
    if (dbId && dbId !== '(default)') {
      db = getFirestore(appInstance, dbId);
      console.log("DEBUG: Connected to named database:", dbId);
    } else {
      db = getFirestore(appInstance);
      console.log("DEBUG: Connected to default database");
    }
  } catch (error) {
    console.error("Firebase admin init error:", error);
  }
};

// Start initialization immediately
const initPromise = initializeFirebase();

// Helper to ensure db is initialized (for routes)
const getDb = async () => {
  await initPromise;
  if (!db) await initializeFirebase();
  return db;
};

export const app = express();
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mercado Pago OAuth Routes
app.get('/api/auth/mp/url', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const clientId = process.env.MP_CLIENT_ID;
  const appUrl = process.env.APP_URL || (req.headers.origin ?? (req.headers.host ? `https://${req.headers.host}` : ''));
  const redirectUri = `${appUrl}/api/auth/mp/callback`;


  if (!clientId) {
    return res.status(500).json({ error: "MP_CLIENT_ID not configured on server" });
  }

  // Construct MP Authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    platform_id: 'mp',
    redirect_uri: redirectUri,
    state: userId as string
  });

  const authUrl = `https://auth.mercadopago.com.br/authorization?${params.toString()}`;
  res.json({ url: authUrl });
});

app.get('/api/auth/mp/callback', async (req, res) => {
  const { code, state: userId } = req.query;

  if (!code || !userId) {
    return res.send(`
      <html><body><script>
        window.opener.postMessage({ type: 'MP_AUTH_ERROR', error: 'Missing code or state' }, '*');
        window.close();
      </script></body></html>
    `);
  }

  try {
    const appUrl = process.env.APP_URL || (req.headers.origin ?? (req.headers.host ? `https://${req.headers.host}` : ''));
    
    // Exchange code for tokens
    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.MP_CLIENT_ID!,
        client_secret: process.env.MP_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: `${appUrl}/api/auth/mp/callback`,
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to exchange tokens');
    }

    // data contains: access_token, public_key, refresh_token, etc.
    const { access_token, public_key } = data;

    const currentDb = await getDb();
    if (!currentDb) {
       throw new Error("Database not initialized on server");
    }

    // Update Firestore
    const profileRef = currentDb.collection('profiles').doc(userId as string);
    const secretsRef = profileRef.collection('private').doc('secrets');
    
    // Update basic status on profile
    await profileRef.set({
      mpConnected: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Also update the store document since the app logic relies on it
    const storeRef = currentDb.collection('stores').doc(userId as string);
    await storeRef.set({
      mpConnected: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Save sensitive tokens in the private subcollection
    // Using setDoc with merge: true to avoid errors if the doc doesn't exist yet
    await secretsRef.set({
      mpAccessToken: access_token,
      mpPublicKey: public_key,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    res.send(`
      <html>
        <body style="background: #050505; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
          <div style="text-align: center;">
            <h2 style="color: #00F2FF;">Conectado com Sucesso!</h2>
            <p>Suas credenciais do Mercado Pago foram vinculadas.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'MP_AUTH_SUCCESS' }, '*');
                setTimeout(() => window.close(), 1000);
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("MP OAuth Error:", error);
    res.send(`
      <html><body><script>
        window.opener.postMessage({ type: 'MP_AUTH_ERROR', error: '${error.message}' }, '*');
        window.close();
      </script></body></html>
    `);
  }
});

app.post("/api/orders/confirm-payment", async (req, res) => {
  const { storeId, orderId } = req.body;
  if (!storeId || !orderId) return res.status(400).send("Missing ids");
  try {
    const currentDb = await getDb();
    if (!currentDb) return res.status(500).send("DB Error");
    await currentDb.collection("stores").doc(storeId).collection("orders").doc(orderId).set({
       paymentStatus: 'approved',
       paymentApproved: true,
       status: 'received'
    }, { merge: true });
    res.status(200).send("OK");
  } catch(e: any) {
    res.status(500).send(e.message);
  }
});

app.post("/api/create-preference", async (req, res) => {
  try {
    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch (e) {}
    }
    const { items, success_url, failure_url, pending_url, payerEmail, orderId, storeId } = payload || {};

    if (!items || !Array.isArray(items)) {
      console.error("Invalid body format. req.body:", req.body);
      return res.status(400).json({ error: "Invalid or missing items array in request body." });
    }

    // Look for a manager with Mercado Pago credentials
    let accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    
    // Allow for runtime fallback correctly
    const currentDb = await getDb();
    if (!accessToken || accessToken === 'YOUR_ACCESS_TOKEN') {
      if (!currentDb) {
         console.error("Database not initialized");
         return res.status(500).json({ error: "Configuração do servidor incompleta (DB ausente)." });
      }
      
      // If we have storeId, use that to find the owner's credentials
      let profileId = null;
      if (storeId && storeId !== 'default') {
        profileId = storeId; // storeId is ownerId
      } else {
        const querySnapshot = await currentDb.collection("profiles").where("mpConnected", "==", true).limit(1).get();
        if (!querySnapshot.empty) {
          profileId = querySnapshot.docs[0].id;
        }
      }

      if (profileId) {
        const secretsSnap = await currentDb.collection("profiles").doc(profileId).collection("private").limit(1).get();
        if (!secretsSnap.empty) {
          accessToken = secretsSnap.docs[0].data().mpAccessToken;
        } else {
          const profileSnap = await currentDb.collection("profiles").doc(profileId).get();
          accessToken = profileSnap.data()?.mpAccessToken;
        }
        console.log("Using Mercado Pago credentials from profile:", profileId);
      }
    }

    if (!accessToken || accessToken === 'YOUR_ACCESS_TOKEN') {
      return res.status(400).json({ 
        error: "Pagamento indisponível: Credenciais do Mercado Pago não configuradas." 
      });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const appUrl = process.env.APP_URL || (req.headers.origin ?? `https://${req.headers.host}`);

    // Build the preference body
    const preferenceBody: any = {
      items: items.map((item: any) => ({
        id: item.id || Math.random().toString(36).substring(7),
        title: item.name || "Produto",
        unit_price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        currency_id: 'BRL',
        description: [
          item.flavors?.length ? `Sabores: ${item.flavors.join(", ")}` : "",
          item.toppings?.length ? `Coberturas: ${item.toppings.join(", ")}` : "",
          item.notes ? `Obs: ${item.notes}` : "",
        ].filter(Boolean).join(" | "),
      })),
      external_reference: storeId && orderId ? `${storeId}:${orderId}` : orderId,
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      back_urls: {
        success: success_url || `${appUrl}/orders?success=true`,
        failure: failure_url || `${appUrl}/menu`,
        pending: pending_url || `${appUrl}/orders?pending=true`,
      },
      auto_return: 'approved',
    };

    // Only add payer if we have a valid-looking email
    if (payerEmail && typeof payerEmail === 'string' && payerEmail.includes('@')) {
      preferenceBody.payer = { email: payerEmail.trim() };
    }

    const result = await preference.create({ body: preferenceBody });

    console.log("Mercado Pago Preference Created:", result.id);
    res.json({ id: result.id, url: result.init_point, sandbox_url: result.sandbox_init_point });
  } catch (error: any) {
    console.error("CRITICAL MERCADO PAGO ERROR:", error);
    res.status(500).json({ 
      error: error.message || "Erro interno ao processar o pagamento.",
      code: error.status,
    });
  }
});

app.post("/api/webhooks/mercadopago", async (req, res) => {
  const { data, type, action } = req.body;
  console.log("Webhook received:", { type, action, data });
  
  if (type === "payment" && data?.id) {
    try {
      const currentDb = await getDb();
      // 1. Fetch manager token (reused logic for simplicity)
      let accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!accessToken || accessToken === 'YOUR_ACCESS_TOKEN') {
        if (!currentDb) throw new Error("Database not initialized on server");

        const querySnapshot = await currentDb.collection("profiles").where("mpConnected", "==", true).limit(1).get();
        if (!querySnapshot.empty) {
          const profileId = querySnapshot.docs[0].id;
          const secretsSnap = await currentDb.collection("profiles").doc(profileId).collection("private").limit(1).get();
          accessToken = !secretsSnap.empty ? secretsSnap.docs[0].data().mpAccessToken : querySnapshot.docs[0].data().mpAccessToken;
        }
      }

      if (!accessToken || accessToken === 'YOUR_ACCESS_TOKEN') throw new Error("No token");

      // 2. Fetch payment details directly
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const payment = await paymentResponse.json();

      // 3. Update Order
      const ref = payment.external_reference;
      if (ref && currentDb) {
        let orderRef;
        if (ref.includes(':')) {
          const [sId, oId] = ref.split(':');
          orderRef = currentDb.collection("stores").doc(sId).collection("orders").doc(oId);
        } else {
          // Fallback to old path
          orderRef = currentDb.collection("orders").doc(ref);
        }
        
        await orderRef.set({
          paymentStatus: payment.status,
          status: payment.status === 'approved' ? 'received' : 'pending_payment',
          paymentApproved: payment.status === 'approved'
        }, { merge: true });
        console.log(`Order ${ref} updated to ${payment.status}`);
      }
      res.status(200).send("OK");
    } catch (e) {
      console.error("Webhook error:", e);
      res.status(500).send("Error");
    }
  } else {
    res.status(200).send("Ignored");
  }
});

// Lalamove Endpoints
app.post("/api/lalamove/quote", async (req, res) => {
  try {
    const currentDb = await getDb();
    if (!currentDb) {
       return res.status(500).json({ error: "Servidor sem conexão com o banco de dados." });
    }
    // Find a manager with Lalamove credentials
    const querySnapshot = await currentDb.collection("profiles").where("lalamoveConnected", "==", true).limit(1).get();
    
    let apiKey = "";
    let apiSecret = "";

    if (!querySnapshot.empty) {
      const profileId = querySnapshot.docs[0].id;
      const profileData = querySnapshot.docs[0].data();
      
      const secretsSnap = await currentDb.collection("profiles").doc(profileId).collection("private").limit(1).get();
      if (!secretsSnap.empty) {
        const secretsData = secretsSnap.docs[0].data();
        apiKey = secretsData.lalamoveApiKey;
        apiSecret = secretsData.lalamoveSecret;
      } else {
        apiKey = profileData.lalamoveApiKey;
        apiSecret = profileData.lalamoveSecret;
      }
    }

    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: "Credenciais da Lalamove não configuradas pelo Gestor." });
    }

    res.json({
      id: "mock_quote_" + Date.now(),
      priceBreakdown: { total: "15.00", currency: "BRL" },
      distance: { value: 5000, unit: "m" }
    });
  } catch (error: any) {
    console.error("Lalamove Quote Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/lalamove/order", async (req, res) => {
  try {
    const currentDb = await getDb();
    if (!currentDb) {
       return res.status(500).json({ error: "Servidor sem conexão com o banco de dados." });
    }
    const querySnapshot = await currentDb.collection("profiles").where("lalamoveConnected", "==", true).limit(1).get();
    
    let apiKey = "";
    let apiSecret = "";

    if (!querySnapshot.empty) {
      const profileId = querySnapshot.docs[0].id;
      const profileData = querySnapshot.docs[0].data();
      
      const secretsSnap = await currentDb.collection("profiles").doc(profileId).collection("private").limit(1).get();
      if (!secretsSnap.empty) {
        const secretsData = secretsSnap.docs[0].data();
        apiKey = secretsData.lalamoveApiKey;
        apiSecret = secretsData.lalamoveSecret;
      } else {
        apiKey = profileData.lalamoveApiKey;
        apiSecret = profileData.lalamoveSecret;
      }
    }

    const { orderId, quotationId } = req.body;

    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: "Credenciais da Lalamove não configuradas pelo Gestor." });
    }

    res.json({
      id: "lalamove_order_" + Date.now(),
      shareLink: "https://share.lalamove.com/mock_" + orderId,
      driverId: "mock_driver_123",
      status: "ASSIGNING_DRIVER"
    });
  } catch (error: any) {
    console.error("Lalamove Order Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Setup Vite & Start Server when not heavily imported
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL && !process.env.VERCEL_ENV) {
  const startServer = async () => {
    const PORT = 3000;
    
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Application URL: ${process.env.APP_URL || 'Not set (using localhost)'}`);
    });
  };

  startServer();
}
