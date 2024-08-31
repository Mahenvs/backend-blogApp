import {Client} from 'pg';
import 'dotenv/config' // populate process.env for imported files

export const client = new Client({
    connectionString : process.env.DATABASE_URL
})

client.connect()
  .then(() => console.log('Connected to the database'))
  .catch(err => console.error('Connection error', err.stack));

