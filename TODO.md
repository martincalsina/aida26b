## Carrito
- El carrito es un pequeño sistema en el frontend para que el cliente agrege items.
- Cuando el cliente considera comprar, el carrito envia los items a un endpoint y el servidor 
maneja automaticamente que almacenes, transporte, e items asignar.

## Funcionalidades para el cliente
- Poder cancelar el pedido.
- Ver los items y su cantidad.
- Poder agregar o quitar items en el carrito.
- Ver la lista de pedidos del cliente.

## Funcionalidades para los Choferes de transporte
- Los choferes ven los pedidos que se les asignaron y las direcciones correspondientes.
- Reciben la proxima direccion al que tienen que ir. Esto podria ser un endpoint especifico.
- Tiene la opcion de marcar los pedidos como enviados o no se pudo entregar.

## Stock y compras
- Cuando se compra, internamente el sistema elige automaticamente los almacenes y el transporte
mas optimo para llevar el producto al cliente. Haria falta un endpoint para realizar al compra y procesar el pedido.
- Calcular cuanto de un stock hay disponible para el cliente. Esto podria involucrar un JOIN generico o especifico
por tabla.
- Cuando se logra elegir el item para el pedido, se marca como "preparando" en los pedidos.
- Una vez se marca el transporte como "Viajando", se marcan todos los pedidos asociados a ese transporte como
"Viajando" tambien.

## Roles y autentication
- Extender los roles para visibilidad de filas y columnas segun cliente y chofer.
- Restringuir acceso a endpoints basado en roles.

## Visual
- Revisar consistencia de la UI y el codigo para representar el sistema de logistica como
cambiar de nombres academicos a nombres de logistica (ej: el titulo de la pagina).

## Misc
- Agregar patron regex en los 'validator' de la ssot.
- Considerar poner columna "delivered_at_time" en los pedidos.

## Consideraciones y supuestos
- Al inicio, el sistema elegira las direcciones, los almacenes y los transportes de forma aleatoria.
El enfoque es armar la idea base y permitir modificar la forma en que se calcula las elecciones de una forma
sencilla sin necesidad de modificar el sistema en sí.
- Por ahora no consideramos meter un "balance" para el cliente, por eso no consideramos meter precios tampoco.
