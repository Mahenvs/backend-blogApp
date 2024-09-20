import 'dotenv/config' // populate process.env for imported files
const { Client } = require('pg')
// export const client = new Client({
//   user: 'postgres',
//   host: 'localhost',
//   database: process.env.DATABASE,
//   password: process.env.DATABASE_PASSWORD,
//   port: 5432,
// })
export const client = new Client({
  user: process.env.user,
  host: process.env.host,
  database: process.env.DATABASE,
  password: process.env.DATABASE_PASSWORD,
  port: 5432,
})
client.connect(function(err:any) {
  if (err) throw err;
  console.log("Connected!");
});