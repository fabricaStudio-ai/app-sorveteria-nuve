import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore';
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
          const profileData = querySnapshot.docs[0].data();
          accessToken = profileData.mpAccessToken;
          console.log("Using Mercado Pago credentials from manager profile:", querySnapshot.docs[0].id);
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
