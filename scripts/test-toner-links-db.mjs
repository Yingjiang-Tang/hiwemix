import { openTonerDatabase } from '../tests/fixtures/toner-postgres.mjs';

const database = await openTonerDatabase();
await database.close();
