import type { Response, NextFunction } from "express";
import { getAuth } from "../firebase/firebase.ts";
import type { AuthRequest } from "./auth.ts";

export async function verifyAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.split("Bearer ")[1];

  if (!token) {
    return res.status(401).json({ error: "Нет токена" });
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    console.log("Decoded token:", decoded);

    /*if (!decoded.admin) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }*/

    req.userId = decoded.uid;
    next();
  } catch {
    return res.status(401).json({ error: "Неверный токен" });
  }
}
