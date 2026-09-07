import type { Request, Response, NextFunction } from "express";
import { getAuth } from "../firebase/firebase.ts";

// Расширяем тип Request чтобы хранить userId
export interface AuthRequest extends Request {
  userId?: string;
}

export async function verifyToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  // Берём токен из заголовка запроса
  const token = req.headers.authorization?.split("Bearer ")[1];
  console.log("Received token:", token);
  if (!token) {
    return res.status(401).json({ error: "Нет токена" });
  }

  try {
    // Firebase проверяет токен и возвращает данные юзера
    const decoded = await getAuth().verifyIdToken(token);
    req.userId = decoded.uid; // uid — это уникальный ID юзера из Firebase
    next(); // всё ок, идём дальше
  } catch {
    return res.status(401).json({ error: "Неверный токен" });
  }
}
