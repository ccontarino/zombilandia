# Zombilandia

Platformer de zombies para el navegador, hecho con canvas y sin librerías. Personajes y arte propios.

- **Jugar:** https://ccontarino.github.io/zombilandia/
- **Controles:** ← → o A D para moverte, Espacio o ↑ para saltar (en el aire, de nuevo: doble salto), X, F o Shift para el rayo láser de ojos. En el celu, botones en pantalla.
- **Súper poder:** el rayo láser atraviesa a todos los zombis en línea y se frena en las paredes. Tiene recarga corta (barra ⚡).
- **Niveles:**
  1. **El cementerio:** tumbas, pozos y zombis lentos.
  2. **Ciudad en ruinas:** saltos entre techos, resortes y zombis corredores que te persiguen.
  3. **Pantano tóxico:** charcos de líquido tóxico, troncos flotantes y zombis saltarines.
  4. **El laboratorio:** pinches, piletas de ácido, paredes que frenan el rayo y zombis grandotes de 3 golpes.
  5. **La guarida del Rey Zombi:** lava, castillo y el jefe final, que salta, hace temblar el piso e invoca zombis.
- **Jeringa (modo bestia):** en cada nivel hay un bloque `?` que suelta una jeringa. Al agarrarla el héroe se hace grande y musculoso por 15 segundos: corre más rápido, su rayo es dorado, más largo, recarga más rápido y pega el triple. Si te golpean, perdés el poder en vez de una vida.
- **Progreso:** el juego recuerda hasta qué nivel llegaste; en la pantalla de inicio tocá ⚡ (o apretá el número del nivel) para seguir desde ahí.
- **Reglas:** saltale encima a los zombis para eliminarlos, juntá cerebros (25 = vida extra), abrí los bloques `?` pegándoles desde abajo y llegá a la bandera.

Para probarlo en local: abrí `index.html` o corré `python3 -m http.server`.
