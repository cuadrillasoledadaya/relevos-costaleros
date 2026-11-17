# Glosario

## Nomenclatura cerrada

| Término             | Definición verbatim                                                                                                                           | Uso operativo en el sistema                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **costalero**       | "personas que cargan el paso"                                                                                                                 | Persona. Entidad persona del dominio.                                                      |
| **paso**            | "estructura la cual cargan los costaleros para llevar una imagen de semana santa, los pasos constan debajo de el de trabajaderas"             | Entidad que agrupa trabajaderas.                                                           |
| **trabajadera**     | "la parte principal de un paso ahi es donde los costaleros cargan los pasos"                                                                  | Unidad de organización de los relevos. 6 a 10 por paso según longitud.                     |
| **patero**          | "los dos exteriores son los pateros tanto el derecho como el izquierdo"                                                                       | Puesto exterior de la **primera** y de la **última** trabajadera.                          |
| **costero**         | "los pateros que pasan a llamarse costeros que tambien habra dos derecho e izquierdo"                                                         | Puesto exterior de las **trabajaderas restantes**.                                         |
| **fijador**         | "a lado de los psteros van los fijadores que tambien hay 2 fijador derecho e izquierdo"                                                       | Puesto intermedio, junto a los exteriores. Hay 2 por trabajadera.                          |
| **corriente**       | "en el centro el corriente"                                                                                                                   | Puesto central. 1 por trabajadera.                                                         |
| **boquilla**        | "el boquilla costalero que manda debajo del paso es el encargado de trasmitir las ordenes del capataz a sus compañeros desde debajo del paso" | Costalero con rol de mando bajo el paso. "por lo general debe haber 2 boquillas por paso". |
| **capataz**         | "el encargado de trasmitir las ordenes del capataz" (quien manda)                                                                             | Usuario principal de la app.                                                               |
| **cuadrilla**       | (usado en el flujo: "la creacion de la cuadrilla y del paso")                                                                                 | Agrupación de costaleros.                                                                  |
| **tramo**           | "el recorrido desde la salida de la iglesia hasta la entrada de la iglesia sera particionada en tramos"                                       | Segmento del recorrido, con nombre. En cada tramo hay un relevo.                           |
| **relevo**          | "en cada uno de los tramos saldran y entraran costaleros en las diferentes trabajaderas para ir relevando a sus compañeros"                   | Cambio de costaleros en un tramo.                                                          |
| **salida**          | "el primer tramo"                                                                                                                             | Tipo de tramo: el primero del recorrido.                                                   |
| **entrada**         | "el ultimo"                                                                                                                                   | Tipo de tramo: el último del recorrido.                                                    |
| **plan de relevos** | "la parte principal que sera el plan de relevos"                                                                                              | Pantalla y resultado del cálculo.                                                          |
| **hoja de relevos** | "una hoja para que el capataz vea visualmente como queda cada trabajedra con todos los relevos ya realizados"                                 | Vista por trabajadera, imprimible.                                                         |

**Nota de grafía**: en el verbatim aparece "trabadera" (falta la "j"). El **término canónico del
sistema es `trabajadera`** (con "e" en el plural, como en "trabajaderas"). Las citas textuales
dentro del código y de los tests conservan la grafía original solo cuando están marcadas como
`verbatim:`.

## Estructura de una trabajadera

| Trabajadera                          | Posición izquierda |             |               |             | Posición derecha |
| ------------------------------------ | ------------------ | ----------- | ------------- | ----------- | ---------------- |
| **Primera** (`position = 1`)         | **patero**         | **fijador** | **corriente** | **fijador** | **patero**       |
| **Última** (`position = N`)          | **patero**         | **fijador** | **corriente** | **fijador** | **patero**       |
| **Intermedias** (`1 < position < N`) | **costero**        | **fijador** | **corriente** | **fijador** | **costero**      |
