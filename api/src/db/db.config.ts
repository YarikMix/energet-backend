import { registerAs } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

console.log('process.env.NODE_ENV', process.env.NODE_ENV);
console.log(
  'process.cwd() + `/.env.${process.env.NODE_ENV}`',
  process.cwd() + `/.env.${process.env.NODE_ENV}`,
);
dotenv.config({ path: process.cwd() + `/.env.${process.env.NODE_ENV}` });

export default registerAs('dbconfig.dev', (): PostgresConnectionOptions => {
  console.log('registerAs db config');
  console.log(process.env);
  console.log(process.env.POSTGRES_USERNAME);
  return {
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT),
    username: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    synchronize: true,
    entities: [
      path.resolve(__dirname, '..') + '/**/**/models/*.entity{.ts,.js}',
    ],
  };
});
