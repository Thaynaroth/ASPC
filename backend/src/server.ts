import 'dotenv/config';
import app from './app';
import authRoutes from './routes/auth.routes';
import categoryRoutes from './routes/category.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import customerRoutes from './routes/customer.routes';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    await app.register(authRoutes);
    await app.register(categoryRoutes);
    await app.register(productRoutes);
    await app.register(orderRoutes);
    await app.register(customerRoutes);
    await app.listen({ port: PORT, host: HOST });
    console.log(`Server running on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
