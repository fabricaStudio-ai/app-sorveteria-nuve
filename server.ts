import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { items, success_url, cancel_url } = req.body;
      
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: "Stripe secret key not configured" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"], // Stripe supports Pix automatically if enabled in dashboard
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
              unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
          };
        }),
        mode: "payment",
        success_url: success_url || `${process.env.APP_URL || "http://localhost:3000"}/orders?success=true`,
        cancel_url: cancel_url || `${process.env.APP_URL || "http://localhost:3000"}/menu`,
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe Error:", error);
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
  });
}

startServer();
