import { redirect } from "next/navigation";

/**
 * La raíz no es una pantalla de la spec (§9): redirige al primer destino real
 * de la aplicación, `/cuadrillas` (P2, unidad W4).
 */
export default function Inicio() {
  redirect("/cuadrillas");
}
