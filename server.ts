import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { items, success_url, cancel_url } = req.body;
      
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        console.error("Stripe secret key missing in environment");
        return res.status(500).json({ error: "Stripe secret key not configured in server environment" });
      }

      const stripe = new Stripe(secretKey);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: items.map((item: any) => {
          const description = [
            item.flavors?.length ? `Sabores: ${item.flavors.join(", ")}` : "",
            item.toppings?.length ? `Coberturas: ${item.toppings.join(", ")}` : "",
            item.notes ? `Obs: ${item.notes}` : "",
          ].filter(Boolean).join(" | ");

          const product_data: any = {
            name: item.name,
          };

          if (description) {
            product_data.description = description;
          }

          return {
            price_data: {
              currency: "brl",
              product_data,
              unit_amount: Math.round((item.price || 0) * 100),
            },
            quantity: item.quantity,
          };
        }),
        mode: "payment",
        success_url: success_url || `${process.env.APP_URL || "http://localhost:3000"}/orders?success=true`,
        cancel_url: cancel_url || `${process.env.APP_URL || "http://localhost:3000"}/menu`,
      });

      // Log success for debugging
      console.log("Stripe Session Created:", session.id);
      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("CRITICAL STRIPE ERROR:", error);
      res.status(500).json({ 
        error: error.message,
        code: error.code,
        type: error.type
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
