import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, limit, doc, updateDoc, setDoc } from 'firebase/firestore';
import dotenv from "dotenv";
import firebaseConfig from './firebase-applet-config.json';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase for server-side lookup
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, (firebaseConfig as any).firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

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
    const redirectUri = `${process.env.APP_URL}/api/auth/mp/callback`;

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
          redirect_uri: `${process.env.APP_URL}/api/auth/mp/callback`,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to exchange tokens');
      }

      // data contains: access_token, public_key, refresh_token, etc.
      const { access_token, public_key } = data;

      // Update Firestore
      const profileRef = doc(db, 'profiles', userId as string);
      const secretsRef = doc(db, 'profiles', userId as string, 'private', 'secrets');
      
      // Update basic status on profile
      await updateDoc(profileRef, {
        mpConnected: true,
        updatedAt: new Date().toISOString()
      });

      // Save sensitive tokens in the private subcollection
      // Using setDoc with merge: true to avoid errors if the doc doesn't exist yet
      await setDoc(secretsRef, {
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

  app.post("/api/create-preference", async (req, res) => {
    try {
      const { items, success_url, failure_url, pending_url } = req.body;
      
      // Look for a manager with Mercado Pago credentials
      let accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      
      if (!accessToken || accessToken === 'YOUR_ACCESS_TOKEN') {
        const profilesRef = collection(db, "profiles");
        const q = query(profilesRef, where("mpConnected", "==", true), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const profileId = querySnapshot.docs[0].id;
          const profileData = querySnapshot.docs[0].data();
          
          // Try to get from subcollection first (new way)
          const secretsRef = doc(db, 'profiles', profileId, 'private', 'secrets');
          const secretsSnap = await getDocs(query(collection(db, 'profiles', profileId, 'private'), limit(1)));
          
          if (!secretsSnap.empty) {
            accessToken = secretsSnap.docs[0].data().mpAccessToken;
          } else {
            // Fallback to main doc (old way)
            accessToken = profileData.mpAccessToken;
          }
          
          console.log("Using Mercado Pago credentials from manager profile:", profileId);
        }
      }

      if (!accessToken) {
        return res.status(400).json({ 
          error: "Pagamento indisponível: O gestor ainda não configurou as credenciais do Mercado Pago." 
        });
      }

      const client = new MercadoPagoConfig({ accessToken });
      const preference = new Preference(client);

      const result = await preference.create({
        body: {
          items: items.map((item: any) => ({
            id: item.id,
            title: item.name,
            unit_price: Number(item.price),
            quantity: Number(item.quantity),
            currency_id: 'BRL',
            description: [
              item.flavors?.length ? `Sabores: ${item.flavors.join(", ")}` : "",
              item.toppings?.length ? `Coberturas: ${item.toppings.join(", ")}` : "",
              item.notes ? `Obs: ${item.notes}` : "",
            ].filter(Boolean).join(" | "),
          })),
          back_urls: {
            success: success_url || `${process.env.APP_URL}/orders?success=true`,
            failure: failure_url || `${process.env.APP_URL}/menu`,
            pending: pending_url || `${process.env.APP_URL}/orders?pending=true`,
          },
          auto_return: 'approved',
        }
      });

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

  // Lalamove Endpoints
  app.post("/api/lalamove/quote", async (req, res) => {
    try {
      // Find a manager with Lalamove credentials
      const profilesRef = collection(db, "profiles");
      const q = query(profilesRef, where("lalamoveConnected", "==", true), limit(1));
      const querySnapshot = await getDocs(q);
      
      let apiKey = "";
      let apiSecret = "";

      if (!querySnapshot.empty) {
        const profileId = querySnapshot.docs[0].id;
        const profileData = querySnapshot.docs[0].data();
        
        // Try to get from subcollection first
        const secretsSnap = await getDocs(query(collection(db, 'profiles', profileId, 'private'), limit(1)));
        
        if (!secretsSnap.empty) {
          const secretsData = secretsSnap.docs[0].data();
          apiKey = secretsData.lalamoveApiKey;
          apiSecret = secretsData.lalamoveSecret;
        } else {
          // Fallback
          apiKey = profileData.lalamoveApiKey;
          apiSecret = profileData.lalamoveSecret;
        }
      }

      if (!apiKey || !apiSecret) {
        return res.status(400).json({ error: "Credenciais da Lalamove não configuradas pelo Gestor." });
      }

      // Mock integration response for the quotation due to missing actual coordinate data
      // For real integration, we'd use @lalamove/lalamove-js and provide lat/lng stops
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
      // Find a manager with Lalamove credentials
      const profilesRef = collection(db, "profiles");
      const q = query(profilesRef, where("lalamoveConnected", "==", true), limit(1));
      const querySnapshot = await getDocs(q);
      
      let apiKey = "";
      let apiSecret = "";

      if (!querySnapshot.empty) {
        const profileId = querySnapshot.docs[0].id;
        const profileData = querySnapshot.docs[0].data();
        
        // Try to get from subcollection first
        const secretsSnap = await getDocs(query(collection(db, 'profiles', profileId, 'private'), limit(1)));
        
        if (!secretsSnap.empty) {
          const secretsData = secretsSnap.docs[0].data();
          apiKey = secretsData.lalamoveApiKey;
          apiSecret = secretsData.lalamoveSecret;
        } else {
          // Fallback
          apiKey = profileData.lalamoveApiKey;
          apiSecret = profileData.lalamoveSecret;
        }
      }

      const { orderId, quotationId } = req.body;

      if (!apiKey || !apiSecret) {
        return res.status(400).json({ error: "Credenciais da Lalamove não configuradas pelo Gestor." });
      }

      // Mock output as creating a real Lalamove order requires accurate lat/lng data.
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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
}

startServer();
