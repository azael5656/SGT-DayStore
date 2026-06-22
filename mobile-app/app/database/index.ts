// IMPORTANTE: debe ir antes de cualquier uso de uuid (provee crypto.getRandomValues).
import 'react-native-get-random-values';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
import { v4 as uuidv4 } from 'uuid';

import schema from './schema';
import Category from './models/Category';
import Product from './models/Product';
import Customer from './models/Customer';
import ExchangeRate from './models/ExchangeRate';
import Sale from './models/Sale';
import SaleItem from './models/SaleItem';
import SalePayment from './models/SalePayment';

// WatermelonDB genera ids con un formato propio; lo cambiamos a UUID v4 para
// que el `id` de las ventas creadas offline sea un UUID válido que el backend
// acepta tal cual como PK (clave de la idempotencia del push).
setGenerator(() => uuidv4());

const adapter = new SQLiteAdapter({
  schema,
  // JSI: acceso nativo síncrono a SQLite (requerido bajo New Architecture).
  jsi: true,
  onSetUpError: (error) => {
    // eslint-disable-next-line no-console
    console.error('[WatermelonDB] error al inicializar el adaptador:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    Category,
    Product,
    Customer,
    ExchangeRate,
    Sale,
    SaleItem,
    SalePayment,
  ],
});
