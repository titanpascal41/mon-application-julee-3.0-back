import mysql from "mysql2";
import { config } from "dotenv";
import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from "express";

config({ override: true });

const databaseUrl = process.env.DATABASE_URL || "mysql://root:@localhost:3306/julee";
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

export const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "julee",
  port: 3306,
});

export let dbReady = false;

db.connect((err) => {
  if (err) {
    console.error("Connexion MySQL échouée :", err.message);
    dbReady = false;
    return;
  }
  dbReady = true;
  console.log("Connecté à la base de données MySQL!");
});

export const requireDbReady = (_req: Request, res: Response, next: NextFunction) => {
  if (!dbReady) {
    return res
      .status(503)
      .json({ message: "Base MySQL non connectée. Vérifiez l'instance ou la configuration." });
  }
  next();
};
